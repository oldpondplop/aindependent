import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import * as AuthSession from 'expo-auth-session';
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

// Test component that uses the auth hook
const TestComponent = () => {
  const { user, isAuthenticated, logout } = useAuth();
  
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'Authenticated' : 'Not authenticated'}</div>
      {user && <div data-testid="user-email">{user.email}</div>}
      <button data-testid="logout-button" onClick={logout}>Logout</button>
    </div>
  );
};

describe('Auth Context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('provides authentication context with initial unauthenticated state', async () => {
    // Mock SecureStore to return null (no stored token)
    SecureStore.getItemAsync.mockResolvedValue(null);
    
    let rendered;
    await act(async () => {
      rendered = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });
    
    const { getByTestId } = rendered;
    
    // Check initial state
    expect(getByTestId('auth-status').textContent).toBe('Not authenticated');
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('auth_token');
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('auth_user');
  });
  
  it('loads authentication state from secure storage', async () => {
    // Mock SecureStore to return token and user
    const mockToken = 'test-token';
    const mockUser = { id: '123', email: 'test@example.com', full_name: 'Test User', is_active: true, is_superuser: false };
    
    SecureStore.getItemAsync.mockImplementation((key) => {
      if (key === 'auth_token') return Promise.resolve(mockToken);
      if (key === 'auth_user') return Promise.resolve(JSON.stringify(mockUser));
      return Promise.resolve(null);
    });
    
    let rendered;
    await act(async () => {
      rendered = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });
    
    const { getByTestId } = rendered;
    
    // Check authenticated state
    expect(getByTestId('auth-status').textContent).toBe('Authenticated');
    expect(getByTestId('user-email').textContent).toBe('test@example.com');
  });
  
  it('handles logout correctly', async () => {
    // Mock SecureStore to return token and user
    const mockToken = 'test-token';
    const mockUser = { id: '123', email: 'test@example.com', full_name: 'Test User', is_active: true, is_superuser: false };
    
    SecureStore.getItemAsync.mockImplementation((key) => {
      if (key === 'auth_token') return Promise.resolve(mockToken);
      if (key === 'auth_user') return Promise.resolve(JSON.stringify(mockUser));
      return Promise.resolve(null);
    });
    
    let rendered;
    await act(async () => {
      rendered = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );
    });
    
    const { getByTestId } = rendered;
    
    // Check authenticated state
    expect(getByTestId('auth-status').textContent).toBe('Authenticated');
    
    // Trigger logout
    await act(async () => {
      fireEvent.press(getByTestId('logout-button'));
    });
    
    // Check that SecureStore items were deleted
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_token');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('auth_user');
    
    // Check unauthenticated state
    expect(getByTestId('auth-status').textContent).toBe('Not authenticated');
  });
});

describe('Google Auth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('handles successful Google sign-in', async () => {
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
      const result = await AuthSession.startAsync();
      
      if (result.type === 'success' && result.params.code) {
        const response = await fetch(`http://localhost:8000/api/v1/login/auth/google/mobile?code=${result.params.code}`);
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
    
    // Check that AuthSession.startAsync was called
    expect(AuthSession.startAsync).toHaveBeenCalled();
    
    // Check that fetch was called with the correct URL
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/login/auth/google/mobile?code=test-auth-code',
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
  
  it('handles Google sign-in error', async () => {
    // Mock the login function from useAuth
    const mockLogin = jest.fn();
    
    // Mock the useAuth hook
    jest.mock('@/hooks/useAuth', () => ({
      useAuth: () => ({
        login: mockLogin,
      }),
    }));
    
    // Mock error AuthSession result
    AuthSession.startAsync.mockResolvedValue({
      type: 'error',
      params: {
        error: 'access_denied',
      },
    });
    
    // Create a mock implementation of useGoogleAuth that throws an error
    const mockGoogleSignIn = jest.fn().mockImplementation(async () => {
      const result = await AuthSession.startAsync();
      
      if (result.type === 'error' || result.params.error) {
        throw new Error(result.params.error || 'Authentication failed');
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
    
    const { getByText, findByText } = rendered;
    
    // Trigger Google sign-in
    await act(async () => {
      fireEvent.press(getByText('Sign in with Google'));
    });
    
    // Check that AuthSession.startAsync was called
    expect(AuthSession.startAsync).toHaveBeenCalled();
    
    // Check that the error message is displayed
    const errorMessage = await findByText('access_denied');
    expect(errorMessage).toBeTruthy();
    
    // Check that login was not called
    expect(mockLogin).not.toHaveBeenCalled();
    
    // Check that router.replace was not called
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});

describe('Auth Guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('redirects to login when not authenticated', async () => {
    // Import the AuthGuard component
    const { AuthGuard } = require('@/components/AuthGuard');
    
    // Mock useAuth to return not authenticated
    jest.mock('@/hooks/useAuth', () => ({
      useAuth: () => ({
        isAuthenticated: false,
        isLoading: false,
      }),
    }));
    
    // Mock usePathname to return a protected route
    const usePathname = require('expo-router').usePathname;
    usePathname.mockReturnValue('/protected');
    
    let rendered;
    await act(async () => {
      rendered = render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );
    });
    
    // Check that it redirects to login
    expect(rendered.getByText('Redirecting to /login')).toBeTruthy();
  });
  
  it('allows access to protected routes when authenticated', async () => {
    // Import the AuthGuard component
    const { AuthGuard } = require('@/components/AuthGuard');
    
    // Mock useAuth to return authenticated
    jest.mock('@/hooks/useAuth', () => ({
      useAuth: () => ({
        isAuthenticated: true,
        isLoading: false,
      }),
    }));
    
    // Mock usePathname to return a protected route
    const usePathname = require('expo-router').usePathname;
    usePathname.mockReturnValue('/protected');
    
    let rendered;
    await act(async () => {
      rendered = render(
        <AuthGuard>
          <div>Protected Content</div>
        </AuthGuard>
      );
    });
    
    // Check that it renders the protected content
    expect(rendered.getByText('Protected Content')).toBeTruthy();
  });
  
  it('redirects to home when authenticated user tries to access login', async () => {
    // Import the AuthGuard component
    const { AuthGuard } = require('@/components/AuthGuard');
    
    // Mock useAuth to return authenticated
    jest.mock('@/hooks/useAuth', () => ({
      useAuth: () => ({
        isAuthenticated: true,
        isLoading: false,
      }),
    }));
    
    // Mock usePathname to return the login route
    const usePathname = require('expo-router').usePathname;
    usePathname.mockReturnValue('/login');
    
    let rendered;
    await act(async () => {
      rendered = render(
        <AuthGuard>
          <div>Login Screen</div>
        </AuthGuard>
      );
    });
    
    // Check that it redirects to home
    expect(rendered.getByText('Redirecting to /')).toBeTruthy();
  });
});
