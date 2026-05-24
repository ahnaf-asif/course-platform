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
  const { isAuthenticated, role, isHydrated } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    // If hydrated and not authenticated, we expect middleware to have redirected,
    // but as a fallback or for client-side navigation:
    if (isHydrated && !isAuthenticated) {
      router.push('/login');
      return;
    }

    // Role-based authorization
    if (isHydrated && isAuthenticated && requiredRole === 'ADMIN' && role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, role, requiredRole, router, isHydrated]);

  // Show loader while hydrating
  if (!isHydrated) {
    return (
      <Center style={{ height: '100vh' }}>
        <Loader size="xl" />
      </Center>
    );
  }

  // If authenticated and role matches
  if (isAuthenticated) {
    if (requiredRole === 'ADMIN' && role !== 'ADMIN') {
      return null; // Will redirect in useEffect
    }
    return <>{children}</>;
  }

  return null;
};
