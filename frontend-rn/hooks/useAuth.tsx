import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { LoginService } from '@/src/client';

// Define the User type
interface User {
  id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_superuser: boolean;
}

// Define the context type
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, userData: User) => Promise<void>;
  logout: () => Promise<void>;
}

// Create the context with a default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token storage keys
const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load token and user data from secure storage on mount
  useEffect(() => {
    const loadAuthState = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        const storedUser = await SecureStore.getItemAsync(USER_KEY);
        
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Error loading auth state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthState();
  }, []);

  // Login function
  const login = async (newToken: string, userData: User) => {
    try {
      // Store token and user data in secure storage
      await SecureStore.setItemAsync(TOKEN_KEY, newToken);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));
      
      // Update state
      setToken(newToken);
      setUser(userData);
    } catch (error) {
      console.error('Error during login:', error);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      // Remove token and user data from secure storage
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      
      // Update state
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  };

  // Test token validity
  const testToken = async () => {
    if (!token) return;
    
    try {
      // Call the test-token endpoint to verify token validity
      await LoginService.testToken();
    } catch (error) {
      console.error('Token validation failed:', error);
      // If token is invalid, log out
      await logout();
    }
  };

  // Test token validity on mount and when token changes
  useEffect(() => {
    if (token) {
      testToken();
    }
  }, [token]);

  // Provide the auth context value
  const value = {
    user,
    token,
    isAuthenticated: !!token,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
