'use client';

import { useAuthContext } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Center, Loader } from '@mantine/core';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: 'ADMIN' | 'USER';
}

export const AuthGuard = ({ children, requiredRole }: AuthGuardProps) => {
  const { isAuthenticated, role, accessToken } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    // If we have a refresh token in localStorage but no access token in state,
    // we might be in the middle of hydration. We should wait.
    const hasRefreshToken = typeof window !== 'undefined' && !!localStorage.getItem('refresh_token');
    
    if (!hasRefreshToken && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated && requiredRole === 'ADMIN' && role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, role, requiredRole, router]);

  // If authenticated and role matches, or if just authenticated and no specific role required
  if (isAuthenticated) {
    if (requiredRole === 'ADMIN' && role !== 'ADMIN') {
      return null; // Will redirect in useEffect
    }
    return <>{children}</>;
  }

  // Show loader while hydrating if refresh token exists
  const hasRefreshToken = typeof window !== 'undefined' && !!localStorage.getItem('refresh_token');
  if (hasRefreshToken && !isAuthenticated) {
    return (
      <Center style={{ height: '100vh' }}>
        <Loader size="xl" />
      </Center>
    );
  }

  return null;
};
