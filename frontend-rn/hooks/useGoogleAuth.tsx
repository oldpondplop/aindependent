import React from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from './useAuth';
import { OpenAPI } from '@/src/client';

// Register for the authentication callback
WebBrowser.maybeCompleteAuthSession();

// Define the response type for Google authentication
type GoogleAuthResponse = {
  type: 'success' | 'error';
  params: {
    code?: string;
    error?: string;
  };
  url: string;
};

// Define the user data type returned from the backend
type UserData = {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_superuser: boolean;
};

// Define the authentication response type
type AuthResponse = {
  access_token: string;
  token_type: string;
  user: UserData;
};

// Generate a random string for code verifier
const generateCodeVerifier = async (): Promise<string> => {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  return AuthSession.buildCodeVerifier(randomBytes);
};

// Generate a code challenge from the code verifier
const generateCodeChallenge = async (codeVerifier: string): Promise<string> => {
  return AuthSession.buildCodeChallenge(codeVerifier, AuthSession.CodeChallengeMethod.S256);
};

export const useGoogleAuth = () => {
  const { login } = useAuth();
  const apiUrl = OpenAPI.BASE;

  // Function to handle Google sign-in
  const googleSignIn = async () => {
    try {
      // Generate code verifier and challenge for PKCE
      const codeVerifier = await generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      
      // Determine if we're on a mobile device
      const isMobile = Platform.OS !== 'web';
      
      // Construct the redirect URI
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'aindependent',
        path: 'auth/google',
      });
      
      // Construct the Google auth URL with PKCE parameters
      const authUrl = `${apiUrl}/api/v1/login/google?code_challenge=${codeChallenge}&code_challenge_method=S256`;
      
      console.log('Starting authentication with PKCE flow');
      console.log('Auth URL:', authUrl);
      console.log('Redirect URI:', redirectUri);
      
      // Open the browser for authentication
      const result = await AuthSession.startAsync({
        authUrl,
        returnUrl: redirectUri,
      }) as GoogleAuthResponse;
      
      // Handle the authentication result
      if (result.type === 'success' && result.params.code) {
        console.log('Authentication successful, exchanging code for token');
        
        // Exchange the code for a token using PKCE
        const response = await fetch(
          `${apiUrl}/api/v1/login/auth/google/mobile?code=${result.params.code}&code_verifier=${codeVerifier}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Token exchange failed:', response.status, errorText);
          throw new Error(`Authentication failed: ${response.statusText}`);
        }
        
        // Parse the response
        const authData: AuthResponse = await response.json();
        console.log('Token exchange successful');
        
        // Login with the token and user data
        await login(authData.access_token, authData.user);
        
        return true;
      } else if (result.type === 'error' || result.params.error) {
        console.error('Authentication error:', result.params.error);
        throw new Error(result.params.error || 'Authentication failed');
      } else {
        console.log('Authentication cancelled or failed');
        return false;
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  };
  
  return { googleSignIn };
};
