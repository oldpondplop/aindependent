import React from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
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

export const useGoogleAuth = () => {
  const { login } = useAuth();
  const apiUrl = OpenAPI.BASE;

  // Function to handle Google sign-in
  const googleSignIn = async () => {
    try {
      // Determine if we're on a mobile device
      const isMobile = Platform.OS !== 'web';
      
      // Construct the redirect URI
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: 'aindependent',
        path: 'auth/google',
      });
      
      // Construct the Google auth URL
      const authUrl = `${apiUrl}/api/v1/login/google`;
      
      // Open the browser for authentication
      const result = await AuthSession.startAsync({
        authUrl,
        returnUrl: redirectUri,
      }) as GoogleAuthResponse;
      
      // Handle the authentication result
      if (result.type === 'success' && result.params.code) {
        // Exchange the code for a token
        const response = await fetch(
          `${apiUrl}/api/v1/login/auth/google/mobile?code=${result.params.code}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (!response.ok) {
          throw new Error(`Authentication failed: ${response.statusText}`);
        }
        
        // Parse the response
        const authData: AuthResponse = await response.json();
        
        // Login with the token and user data
        await login(authData.access_token, authData.user);
        
        return true;
      } else if (result.type === 'error' || result.params.error) {
        throw new Error(result.params.error || 'Authentication failed');
      }
      
      return false;
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  };
  
  return { googleSignIn };
};
