import { useAuthContext } from '@/context/AuthContext';
import { Center, Loader } from '@mantine/core';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard = ({ children }: AuthGuardProps) => {
  const { isHydrated, isAuthenticated } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      const url = new URL('/login', window.location.origin);
      url.searchParams.set('callbackUrl', pathname);
      router.push(url.pathname + url.search);
    }
  }, [isHydrated, isAuthenticated, router, pathname]);

  if (!isHydrated || !isAuthenticated) {
    return (
      <Center style={{ height: '100vh' }}>
        <Loader size="xl" />
      </Center>
    );
  }

  return <>{children}</>;
};
