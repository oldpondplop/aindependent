from datetime import timedelta
from typing import Annotated, Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm

from app import crud
from app.api.deps import CurrentUser, SessionDep, get_current_active_superuser
from app.core import security
from app.core.config import settings
from app.core.security import get_password_hash
from app.models import Message, NewPassword, Token, User, UserPublic
from app.utils import (
    generate_password_reset_token,
    generate_reset_password_email,
    send_email,
    verify_password_reset_token,
)

router = APIRouter(tags=["login"])


@router.get("/login/google")
async def login_google(request: Request):
    """
    Redirect users to Google for authentication
    """
    # Check if request is from mobile app
    is_mobile = request.headers.get("User-Agent", "").lower().find("expo") != -1
    
    # Get code_challenge and code_challenge_method from query params for PKCE flow
    code_challenge = request.query_params.get("code_challenge")
    code_challenge_method = request.query_params.get("code_challenge_method", "S256")
    
    # Base parameters for authorization request
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "response_type": "code",
        "scope": "openid email profile",
        "redirect_uri": settings.GOOGLE_MOBILE_REDIRECT_URI if is_mobile else settings.GOOGLE_REDIRECT_URI,
        "prompt": "select_account",
    }
    
    # Add PKCE parameters if provided (for mobile clients)
    if code_challenge:
        params["code_challenge"] = code_challenge
        params["code_challenge_method"] = code_challenge_method

    authorize_url = f"{settings.GOOGLE_AUTH_URL}?" + "&".join(
        f"{k}={v}" for k, v in params.items()
    )
    return RedirectResponse(authorize_url)


@router.get("/login/auth/google")
async def auth_google(session: SessionDep, code: str):
    """
    Handle Google OAuth2 callback and issue a JWT token.
    """
    try:
        token_data = {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        }

        async with httpx.AsyncClient() as client:
            # Exchange authorization code for access token
            token_response = await client.post(settings.GOOGLE_TOKEN_URL, data=token_data)
            if token_response.status_code != 200:
                raise HTTPException(
                    status_code=token_response.status_code,
                    detail=f"Failed to retrieve access token: {token_response.text}",
                )
            token_json = token_response.json()

            # Fetch user info from Google
            userinfo_response = await client.get(
                settings.GOOGLE_USER_INFO_URL,
                headers={"Authorization": f"Bearer {token_json['access_token']}"},
            )
            if userinfo_response.status_code != 200:
                raise HTTPException(
                    status_code=userinfo_response.status_code,
                    detail=f"Failed to retrieve user info: {userinfo_response.text}",
                )
            user_json = userinfo_response.json()

            user_email = user_json.get("email")
            if not user_email:
                raise HTTPException(
                    status_code=400, detail="Email not available in user info."
                )

            # Check if user exists in database
            user = crud.get_user_by_email(session=session, email=user_email)
            if not user:
                user = User(
                    email=user_email,
                    full_name=user_json.get("name", ""),
                    is_active=True,
                    google_id=user_json["sub"],
                )
                session.add(user)
                session.commit()
                session.refresh(user)
            elif not user.google_id:
                # Update existing user with Google ID if they didn't have one
                user.google_id = user_json["sub"]
                session.add(user)
                session.commit()
                session.refresh(user)

            # Generate JWT token
            access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
            jwt_token = security.create_access_token(
                subject=user.id, expires_delta=access_token_expires
            )

            # Set cookie with token for web clients
            response = RedirectResponse(url=f"{settings.FRONTEND_HOST}")
            response.set_cookie(
                key="access_token",
                value=f"Bearer {jwt_token}",
                httponly=True,
                max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                expires=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                samesite="lax",
                secure=settings.ENVIRONMENT != "local",
            )
            
            return response
    except Exception as e:
        # Log the error
        print(f"Google auth error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Authentication error: {str(e)}",
        )


@router.get("/login/auth/google/mobile")
async def auth_google_mobile(session: SessionDep, code: str, code_verifier: str = None):
    """
    Handle Google OAuth2 callback for mobile apps and return JSON response with token.
    Uses PKCE flow when code_verifier is provided.
    """
    try:
        # Base token request data
        token_data = {
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_MOBILE_REDIRECT_URI,
            "grant_type": "authorization_code",
        }
        
        # Add code_verifier for PKCE flow if provided
        if code_verifier:
            token_data["code_verifier"] = code_verifier
        else:
            # For non-PKCE flow, client secret is required
            token_data["client_secret"] = settings.GOOGLE_CLIENT_SECRET

        async with httpx.AsyncClient() as client:
            # Exchange authorization code for access token
            token_response = await client.post(settings.GOOGLE_TOKEN_URL, data=token_data)
            if token_response.status_code != 200:
                raise HTTPException(
                    status_code=token_response.status_code,
                    detail=f"Failed to retrieve access token: {token_response.text}",
                )
            token_json = token_response.json()

            # Fetch user info from Google
            userinfo_response = await client.get(
                settings.GOOGLE_USER_INFO_URL,
                headers={"Authorization": f"Bearer {token_json['access_token']}"},
            )
            if userinfo_response.status_code != 200:
                raise HTTPException(
                    status_code=userinfo_response.status_code,
                    detail=f"Failed to retrieve user info: {userinfo_response.text}",
                )
            user_json = userinfo_response.json()

            user_email = user_json.get("email")
            if not user_email:
                raise HTTPException(
                    status_code=400, detail="Email not available in user info."
                )

            # Check if user exists in database
            user = crud.get_user_by_email(session=session, email=user_email)
            if not user:
                user = User(
                    email=user_email,
                    full_name=user_json.get("name", ""),
                    is_active=True,
                    google_id=user_json["sub"],
                )
                session.add(user)
                session.commit()
                session.refresh(user)
            elif not user.google_id:
                # Update existing user with Google ID if they didn't have one
                user.google_id = user_json["sub"]
                session.add(user)
                session.commit()
                session.refresh(user)

            # Generate JWT token
            access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
            jwt_token = security.create_access_token(
                subject=user.id, expires_delta=access_token_expires
            )

            # Return JSON response for mobile clients
            user_data = {
                "id": str(user.id),
                "email": user.email,
                "full_name": user.full_name,
                "is_active": user.is_active,
                "is_superuser": user.is_superuser,
            }
            
            return {
                "access_token": jwt_token,
                "token_type": "bearer",
                "user": user_data
            }
    except Exception as e:
        # Log the error
        print(f"Google auth mobile error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Authentication error: {str(e)}",
        )


@router.post("/login/access-token")
async def login_for_access_token(
    session: SessionDep, form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
) -> Token:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = crud.authenticate(
        session=session, email=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        user.id, expires_delta=access_token_expires
    )
    return Token(access_token=access_token, token_type="bearer")


@router.post("/login/test-token", response_model=UserPublic)
def test_token(current_user: CurrentUser) -> Any:
    """
    Test access token
    """
    return current_user


@router.post("/password-recovery/{email}")
def recover_password(email: str, session: SessionDep) -> Message:
    """
    Password Recovery
    """
    user = crud.get_user_by_email(session=session, email=email)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this email does not exist in the system.",
        )
    password_reset_token = generate_password_reset_token(email=email)
    email_data = generate_reset_password_email(
        email_to=user.email, email=email, token=password_reset_token
    )
    send_email(
        email_to=user.email,
        subject=email_data.subject,
        html_content=email_data.html_content,
    )
    return Message(message="Password recovery email sent")


@router.post("/reset-password/")
def reset_password(session: SessionDep, body: NewPassword) -> Message:
    """
    Reset password
    """
    email = verify_password_reset_token(token=body.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid token")
    user = crud.get_user_by_email(session=session, email=email)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this email does not exist in the system.",
        )
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    hashed_password = get_password_hash(password=body.new_password)
    user.hashed_password = hashed_password
    session.add(user)
    session.commit()
    return Message(message="Password updated successfully")


@router.post(
    "/password-recovery-html-content/{email}",
    dependencies=[Depends(get_current_active_superuser)],
    response_class=HTMLResponse,
)
def recover_password_html_content(email: str, session: SessionDep) -> Any:
    """
    HTML Content for Password Recovery
    """
    user = crud.get_user_by_email(session=session, email=email)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this username does not exist in the system.",
        )
    password_reset_token = generate_password_reset_token(email=email)
    email_data = generate_reset_password_email(
        email_to=user.email, email=email, token=password_reset_token
    )

    return HTMLResponse(
        content=email_data.html_content, headers={"subject:": email_data.subject}
    )
