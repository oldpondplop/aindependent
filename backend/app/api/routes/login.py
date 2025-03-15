from datetime import timedelta
from typing import Annotated, Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

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


class GoogleAuthRequest(BaseModel):
    code: str
    codeVerifier: str
    platform: str


@router.post("/login/auth/google", response_model=Token)
async def auth_google(session: SessionDep, payload: GoogleAuthRequest):
    """
    Receives the Google auth 'code' plus the PKCE 'codeVerifier' from the Expo app.
    Exchanges them for Google tokens. Fetches or creates a local user. Returns our own JWT.
    """
    platform = payload.platform.lower().strip()

    token_data = {
        "client_id": settings.GOOGLE_WEB_CLIENT_ID
        if platform == "web"
        else settings.GOOGLE_ANDROID_CLIENT_ID,
        "client_secret": settings.GOOGLE_WEB_CLIENT_SECRET
        if platform == "web"
        else None,
        "grant_type": "authorization_code",
        "code": payload.code,
        "redirect_uri": settings.GOOGLE_WEB_REDIRECT_URI
        if platform == "web"
        else settings.GOOGLE_ANDROID_REDIRECT_URI,
        "code_verifier": None if platform == "web" else payload.codeVerifier,
    }
    import pprint

    pprint.pprint(token_data)
    async with httpx.AsyncClient() as client:
        # Exchange authorization code for access token
        token_response = await client.post(settings.GOOGLE_TOKEN_URL, data=token_data)
        if token_response.status_code != 200:
            raise HTTPException(
                status_code=token_response.status_code,
                detail="Failed to retrieve access token.",
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
                detail="Failed to retrieve user info.",
            )
        user_json = userinfo_response.json()

        # TODO: properly create a user, add schemas
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

        # Generate JWT token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        jwt_token = security.create_access_token(
            subject=user.id, expires_delta=access_token_expires
        )

        return Token(access_token=jwt_token, token_type="bearer")


@router.get("/login/auth/google1")
async def auth_google1(session: SessionDep, code: str):
    """
    Handle Google OAuth2 callback and issue a JWT token.
    """
    token_data = {
        "code": code,
        "client_id": settings.GOOGLE_WEB_CLIENT_ID,
        "client_secret": settings.GOOGLE_WEB_CLIENT_SECRET,
        "redirect_uri": settings.GOOGLE_WEB_REDIRECT_URI,
        "grant_type": "authorization_code",
    }

    async with httpx.AsyncClient() as client:
        # Exchange authorization code for access token
        token_response = await client.post(settings.GOOGLE_TOKEN_URL, data=token_data)
        if token_response.status_code != 200:
            raise HTTPException(
                status_code=token_response.status_code,
                detail="Failed to retrieve access token.",
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
                detail="Failed to retrieve user info.",
            )
        user_json = userinfo_response.json()

        # TODO: properly create a user, add schemas
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

        # Generate JWT token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        jwt_token = security.create_access_token(
            subject=user.id, expires_delta=access_token_expires
        )

        return Token(access_token=jwt_token, token_type="bearer")


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
