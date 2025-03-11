import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Redirect, usePathname } from 'expo-router';

// List of routes that don't require authentication
const publicRoutes = ['/login'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();

  // Don't render anything while checking authentication status
  if (isLoading) {
    return null;
  }

  // If the user is not authenticated and trying to access a protected route,
  // redirect to the login page
  if (!isAuthenticated && !publicRoutes.includes(pathname)) {
    return <Redirect href="/login" />;
  }

  // If the user is authenticated and trying to access the login page,
  // redirect to the home page
  if (isAuthenticated && pathname === '/login') {
    return <Redirect href="/" />;
  }

  // Otherwise, render the children
  return <>{children}</>;
}
