import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import LoginScreen from '@/app/login';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  Redirect: jest.fn().mockImplementation(({ href }) => <div>Redirecting to {href}</div>),
}));

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn().mockReturnValue('exp://localhost:19000/--/auth/google'),
  startAsync: jest.fn(),
  maybeCompleteAuthSession: jest.fn(),
  buildCodeVerifier: jest.fn().mockReturnValue('test_code_verifier'),
  buildCodeChallenge: jest.fn().mockReturnValue('test_code_challenge'),
  CodeChallengeMethod: { S256: 'S256' },
}));

jest.mock('expo-crypto', () => ({
  getRandomBytesAsync: jest.fn().mockResolvedValue(new Uint8Array(32)),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@/hooks/useGoogleAuth', () => ({
  useGoogleAuth: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('PKCE Authentication Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('generates code verifier and challenge for PKCE flow', async () => {
    // Mock the login function from useAuth
    const mockLogin = jest.fn();
    
    // Mock the useAuth hook
    jest.mock('@/hooks/useAuth', () => ({
      useAuth: () => ({
        login: mockLogin,
      }),
    }));
    
    // Mock successful AuthSession result
    AuthSession.startAsync.mockResolvedValue({
      type: 'success',
      params: {
        code: 'test-auth-code',
      },
      url: 'exp://localhost:19000/--/auth/google?code=test-auth-code',
    });
    
    // Mock successful fetch response
    global.fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        access_token: 'test-access-token',
        token_type: 'bearer',
        user: {
          id: '123',
          email: 'test@example.com',
          full_name: 'Test User',
          is_active: true,
          is_superuser: false,
        },
      }),
    });
    
    // Create a mock implementation of useGoogleAuth
    const mockGoogleSignIn = jest.fn().mockImplementation(async () => {
      // Verify that code verifier and challenge are generated
      expect(Crypto.getRandomBytesAsync).toHaveBeenCalledWith(32);
      expect(AuthSession.buildCodeVerifier).toHaveBeenCalled();
      expect(AuthSession.buildCodeChallenge).toHaveBeenCalledWith('test_code_verifier', 'S256');
      
      const result = await AuthSession.startAsync();
      
      if (result.type === 'success' && result.params.code) {
        // Verify that code verifier is included in token exchange request
        const response = await fetch(`http://localhost:8000/api/v1/login/auth/google/mobile?code=${result.params.code}&code_verifier=test_code_verifier`);
        const data = await response.json();
        await mockLogin(data.access_token, data.user);
        return true;
      }
      
      return false;
    });
    
    useGoogleAuth.mockReturnValue({ googleSignIn: mockGoogleSignIn });
    
    // Render the login screen
    const mockRouter = { replace: jest.fn() };
    useRouter.mockReturnValue(mockRouter);
    
    let rendered;
    await act(async () => {
      rendered = render(<LoginScreen />);
    });
    
    const { getByText } = rendered;
    
    // Trigger Google sign-in
    await act(async () => {
      fireEvent.press(getByText('Sign in with Google'));
    });
    
    // Check that AuthSession.startAsync was called with URL containing code_challenge
    expect(AuthSession.startAsync).toHaveBeenCalledWith({
      authUrl: expect.stringContaining('code_challenge=test_code_challenge'),
      returnUrl: 'exp://localhost:19000/--/auth/google',
    });
    
    // Check that fetch was called with the correct URL including code_verifier
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('code_verifier=test_code_verifier'),
      expect.any(Object)
    );
    
    // Check that login was called with the correct arguments
    expect(mockLogin).toHaveBeenCalledWith(
      'test-access-token',
      {
        id: '123',
        email: 'test@example.com',
        full_name: 'Test User',
        is_active: true,
        is_superuser: false,
      }
    );
    
    // Check that router.replace was called to navigate to home
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });
  
  it('handles errors in PKCE flow', async () => {
    // Mock the login function from useAuth
    const mockLogin = jest.fn();
    
    // Mock the useAuth hook
    jest.mock('@/hooks/useAuth', () => ({
      useAuth: () => ({
        login: mockLogin,
      }),
    }));
    
    // Mock error in token exchange
    global.fetch.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: () => Promise.resolve('Invalid code_verifier'),
    });
    
    // Mock successful AuthSession result but failed token exchange
    AuthSession.startAsync.mockResolvedValue({
      type: 'success',
      params: {
        code: 'test-auth-code',
      },
      url: 'exp://localhost:19000/--/auth/google?code=test-auth-code',
    });
    
    // Create a mock implementation of useGoogleAuth that throws an error
    const mockGoogleSignIn = jest.fn().mockImplementation(async () => {
      try {
        const result = await AuthSession.startAsync();
        
        if (result.type === 'success' && result.params.code) {
          const response = await fetch(`http://localhost:8000/api/v1/login/auth/google/mobile?code=${result.params.code}&code_verifier=test_code_verifier`);
          
          if (!response.ok) {
            throw new Error(`Authentication failed: ${response.statusText}`);
          }
          
          const data = await response.json();
          await mockLogin(data.access_token, data.user);
          return true;
        }
        
        return false;
      } catch (error) {
        throw error;
      }
    });
    
    useGoogleAuth.mockReturnValue({ googleSignIn: mockGoogleSignIn });
    
    // Render the login screen
    const mockRouter = { replace: jest.fn() };
    useRouter.mockReturnValue(mockRouter);
    
    let rendered;
    await act(async () => {
      rendered = render(<LoginScreen />);
    });
    
    const { getByText, findByText } = rendered;
    
    // Trigger Google sign-in
    await act(async () => {
      fireEvent.press(getByText('Sign in with Google'));
    });
    
    // Check that the error message is displayed
    const errorMessage = await findByText('Authentication failed: Bad Request');
    expect(errorMessage).toBeTruthy();
    
    // Check that login was not called
    expect(mockLogin).not.toHaveBeenCalled();
    
    // Check that router.replace was not called
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});
