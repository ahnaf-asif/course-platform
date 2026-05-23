'use client';

import { useAuthContext } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Center, Box } from '@mantine/core';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return null;
  }

  return (
    <Center style={{ height: '100vh', backgroundColor: 'var(--mantine-color-gray-0)' }}>
      <Box w={420} p="md">
        {children}
      </Box>
    </Center>
  );
}
