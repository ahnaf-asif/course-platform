'use client';

import { useAuthContext } from '@/context/AuthContext';
import { Center, Loader } from '@mantine/core';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { isHydrated } = useAuthContext();

  if (!isHydrated) {
    return (
      <Center style={{ height: '100vh' }}>
        <Loader size="xl" />
      </Center>
    );
  }

  return <>{children}</>;
};
