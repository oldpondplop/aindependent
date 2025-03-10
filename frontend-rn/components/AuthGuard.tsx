import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Redirect } from 'expo-router';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  // Don't render anything while checking authentication status
  if (isLoading) {
    return null;
  }

  // If the user is not authenticated, redirect to the sign-in page
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // Otherwise, render the children
  return <>{children}</>;
}
