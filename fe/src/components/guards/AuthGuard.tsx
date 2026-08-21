import { useAuthContext } from '@/context/AuthContext';
import { Center, Loader } from '@mantine/core';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export const AuthGuard = ({ children, requiredRole }: AuthGuardProps) => {
  const { isHydrated, isAuthenticated, role } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isHydrated) {
      if (!isAuthenticated) {
        const url = new URL('/login', window.location.origin);
        url.searchParams.set('callbackUrl', pathname);
        router.push(url.pathname + url.search);
      } else if (requiredRole && role !== requiredRole) {
        router.push('/dashboard');
      }
    }
  }, [isHydrated, isAuthenticated, role, requiredRole, router, pathname]);

  if (!isHydrated || !isAuthenticated || (requiredRole && role !== requiredRole)) {
    return (
      <Center style={{ height: '100vh' }}>
        <Loader size="xl" />
      </Center>
    );
  }

  return <>{children}</>;
};
