import unittest
from unittest.mock import patch, MagicMock, AsyncMock
import pytest
from fastapi.testclient import TestClient
from fastapi import FastAPI
import json
import uuid

# Create a mock for the app and dependencies
@pytest.fixture
def mock_app():
    # Import app after mocking settings
    with patch('app.core.config.settings') as mock_settings:
        # Configure mock settings
        mock_settings.GOOGLE_CLIENT_ID = "test-client-id"
        mock_settings.GOOGLE_CLIENT_SECRET = "test-client-secret"
        mock_settings.GOOGLE_REDIRECT_URI = "http://localhost:8000/api/v1/login/auth/google"
        mock_settings.GOOGLE_MOBILE_REDIRECT_URI = "http://localhost:8000/api/v1/login/auth/google/mobile"
        mock_settings.GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/auth"
        mock_settings.GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
        mock_settings.GOOGLE_USER_INFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
        mock_settings.FRONTEND_HOST = "http://localhost:5173"
        mock_settings.ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 8
        mock_settings.ENVIRONMENT = "local"
        
        # Import app after mocking settings
        from app.main import app
        
        # Create test client
        client = TestClient(app)
        
        # Override dependencies
        from app.api.deps import get_current_active_user, get_session
        
        # Create mock user
        mock_user = MagicMock()
        mock_user.id = uuid.uuid4()
        mock_user.email = "test@example.com"
        mock_user.full_name = "Test User"
        mock_user.is_active = True
        mock_user.is_superuser = False
        mock_user.google_id = "google123"
        
        # Create mock session
        mock_session = MagicMock()
        
        # Override dependencies
        app.dependency_overrides[get_current_active_user] = lambda: mock_user
        app.dependency_overrides[get_session] = lambda: mock_session
        
        yield client, mock_session, mock_user

class TestGoogleAuth:
    
    def test_login_google_web(self, mock_app):
        client, _, _ = mock_app
        
        # Test the endpoint
        response = client.get("/api/v1/login/google")
        
        # Check that we get a redirect
        assert response.status_code == 307
        
        # Check that the redirect URL contains the expected parameters
        redirect_url = response.headers["location"]
        assert "accounts.google.com/o/oauth2/auth" in redirect_url
        assert "client_id=test-client-id" in redirect_url
        assert "response_type=code" in redirect_url
        assert "scope=openid+email+profile" in redirect_url
        assert "redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fapi%2Fv1%2Flogin%2Fauth%2Fgoogle" in redirect_url
    
    def test_login_google_mobile(self, mock_app):
        client, _, _ = mock_app
        
        # Test the endpoint with a mobile user agent
        response = client.get(
            "/api/v1/login/google", 
            headers={"User-Agent": "Expo/1.0"}
        )
        
        # Check that we get a redirect
        assert response.status_code == 307
        
        # Check that the redirect URL contains the expected parameters
        redirect_url = response.headers["location"]
        assert "accounts.google.com/o/oauth2/auth" in redirect_url
        assert "client_id=test-client-id" in redirect_url
        assert "response_type=code" in redirect_url
        assert "scope=openid+email+profile" in redirect_url
        assert "redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Fapi%2Fv1%2Flogin%2Fauth%2Fgoogle%2Fmobile" in redirect_url
    
    @patch('httpx.AsyncClient')
    def test_auth_google_success(self, mock_client, mock_app):
        client, mock_session, mock_user = mock_app
        
        # Mock the httpx client
        mock_async_client = AsyncMock()
        mock_client.return_value.__aenter__.return_value = mock_async_client
        
        # Mock the token response
        mock_token_response = MagicMock()
        mock_token_response.status_code = 200
        mock_token_response.json.return_value = {
            "access_token": "test-access-token",
            "token_type": "Bearer",
            "expires_in": 3600
        }
        mock_async_client.post.return_value = mock_token_response
        
        # Mock the userinfo response
        mock_userinfo_response = MagicMock()
        mock_userinfo_response.status_code = 200
        mock_userinfo_response.json.return_value = {
            "sub": "google123",
            "email": "test@example.com",
            "name": "Test User",
            "picture": "https://example.com/picture.jpg"
        }
        mock_async_client.get.return_value = mock_userinfo_response
        
        # Mock the crud.get_user_by_email function
        with patch('app.crud.get_user_by_email') as mock_get_user:
            mock_get_user.return_value = mock_user
            
            # Mock the security.create_access_token function
            with patch('app.core.security.create_access_token') as mock_create_token:
                mock_create_token.return_value = "test-jwt-token"
                
                # Test the endpoint
                response = client.get("/api/v1/login/auth/google?code=test-code")
                
                # Check that we get a redirect
                assert response.status_code == 307
                
                # Check that the redirect URL is the frontend host
                assert response.headers["location"] == "http://localhost:5173"
                
                # Check that we set a cookie with the token
                assert "access_token" in response.cookies
                assert response.cookies["access_token"] == "Bearer test-jwt-token"
    
    @patch('httpx.AsyncClient')
    def test_auth_google_mobile_success(self, mock_client, mock_app):
        client, mock_session, mock_user = mock_app
        
        # Mock the httpx client
        mock_async_client = AsyncMock()
        mock_client.return_value.__aenter__.return_value = mock_async_client
        
        # Mock the token response
        mock_token_response = MagicMock()
        mock_token_response.status_code = 200
        mock_token_response.json.return_value = {
            "access_token": "test-access-token",
            "token_type": "Bearer",
            "expires_in": 3600
        }
        mock_async_client.post.return_value = mock_token_response
        
        # Mock the userinfo response
        mock_userinfo_response = MagicMock()
        mock_userinfo_response.status_code = 200
        mock_userinfo_response.json.return_value = {
            "sub": "google123",
            "email": "test@example.com",
            "name": "Test User",
            "picture": "https://example.com/picture.jpg"
        }
        mock_async_client.get.return_value = mock_userinfo_response
        
        # Mock the crud.get_user_by_email function
        with patch('app.crud.get_user_by_email') as mock_get_user:
            mock_get_user.return_value = mock_user
            
            # Mock the security.create_access_token function
            with patch('app.core.security.create_access_token') as mock_create_token:
                mock_create_token.return_value = "test-jwt-token"
                
                # Test the endpoint
                response = client.get("/api/v1/login/auth/google/mobile?code=test-code")
                
                # Check that we get a successful response
                assert response.status_code == 200
                
                # Check the response JSON
                response_json = response.json()
                assert response_json["access_token"] == "test-jwt-token"
                assert response_json["token_type"] == "bearer"
                assert response_json["user"]["email"] == "test@example.com"
                assert response_json["user"]["full_name"] == "Test User"
    
    @patch('httpx.AsyncClient')
    def test_auth_google_token_error(self, mock_client, mock_app):
        client, _, _ = mock_app
        
        # Mock the httpx client
        mock_async_client = AsyncMock()
        mock_client.return_value.__aenter__.return_value = mock_async_client
        
        # Mock the token response with an error
        mock_token_response = MagicMock()
        mock_token_response.status_code = 400
        mock_token_response.text = "Invalid grant"
        mock_async_client.post.return_value = mock_token_response
        
        # Test the endpoint
        response = client.get("/api/v1/login/auth/google?code=invalid-code")
        
        # Check that we get an error
        assert response.status_code == 400
        assert "Failed to retrieve access token" in response.json()["detail"]
    
    @patch('httpx.AsyncClient')
    def test_auth_google_userinfo_error(self, mock_client, mock_app):
        client, _, _ = mock_app
        
        # Mock the httpx client
        mock_async_client = AsyncMock()
        mock_client.return_value.__aenter__.return_value = mock_async_client
        
        # Mock the token response
        mock_token_response = MagicMock()
        mock_token_response.status_code = 200
        mock_token_response.json.return_value = {
            "access_token": "test-access-token",
            "token_type": "Bearer",
            "expires_in": 3600
        }
        mock_async_client.post.return_value = mock_token_response
        
        # Mock the userinfo response with an error
        mock_userinfo_response = MagicMock()
        mock_userinfo_response.status_code = 401
        mock_userinfo_response.text = "Invalid token"
        mock_async_client.get.return_value = mock_userinfo_response
        
        # Test the endpoint
        response = client.get("/api/v1/login/auth/google?code=test-code")
        
        # Check that we get an error
        assert response.status_code == 401
        assert "Failed to retrieve user info" in response.json()["detail"]
    
    @patch('httpx.AsyncClient')
    def test_auth_google_create_new_user(self, mock_client, mock_app):
        client, mock_session, _ = mock_app
        
        # Mock the httpx client
        mock_async_client = AsyncMock()
        mock_client.return_value.__aenter__.return_value = mock_async_client
        
        # Mock the token response
        mock_token_response = MagicMock()
        mock_token_response.status_code = 200
        mock_token_response.json.return_value = {
            "access_token": "test-access-token",
            "token_type": "Bearer",
            "expires_in": 3600
        }
        mock_async_client.post.return_value = mock_token_response
        
        # Mock the userinfo response
        mock_userinfo_response = MagicMock()
        mock_userinfo_response.status_code = 200
        mock_userinfo_response.json.return_value = {
            "sub": "google456",
            "email": "newuser@example.com",
            "name": "New User",
            "picture": "https://example.com/picture.jpg"
        }
        mock_async_client.get.return_value = mock_userinfo_response
        
        # Mock the crud.get_user_by_email function to return None (user doesn't exist)
        with patch('app.crud.get_user_by_email') as mock_get_user:
            mock_get_user.return_value = None
            
            # Mock the User model
            with patch('app.models.User') as mock_user_model:
                mock_new_user = MagicMock()
                mock_new_user.id = uuid.uuid4()
                mock_new_user.email = "newuser@example.com"
                mock_new_user.full_name = "New User"
                mock_new_user.is_active = True
                mock_new_user.google_id = "google456"
                mock_user_model.return_value = mock_new_user
                
                # Mock the security.create_access_token function
                with patch('app.core.security.create_access_token') as mock_create_token:
                    mock_create_token.return_value = "test-jwt-token"
                    
                    # Test the endpoint
                    response = client.get("/api/v1/login/auth/google?code=test-code")
                    
                    # Check that we get a redirect
                    assert response.status_code == 307
                    
                    # Check that the user was added to the session
                    mock_session.add.assert_called_once_with(mock_new_user)
                    mock_session.commit.assert_called_once()
                    mock_session.refresh.assert_called_once_with(mock_new_user)
