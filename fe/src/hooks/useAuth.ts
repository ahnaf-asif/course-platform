import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/context/AuthContext';
import { usePostAuthLogin, usePostAuthLogout } from '@/api/generated/authentication/authentication';

export const useAuth = () => {
  const { accessToken, role, setAccessToken, clearAuth, isAuthenticated } = useAuthContext();
  const router = useRouter();

  const loginMutation = usePostAuthLogin();
  const logoutMutation = usePostAuthLogout();

  const login = async (email: string, password: string) => {
    try {
      const response = await loginMutation.mutateAsync({
        data: { email, password },
      });

      if (response.access_token) {
        setAccessToken(response.access_token);
      }
      
      const searchParams = new URLSearchParams(window.location.search);
      const callbackUrl = searchParams.get('callbackUrl');
      router.push(callbackUrl || '/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      // Pass empty object or correct type as required by generated code,
      // but backend will ignore it and use cookies.
      await logoutMutation.mutateAsync({
        data: { refresh_token: '' }, 
      });
    } catch (error) {
      console.error('Logout request failed:', error);
    }
    clearAuth();
    router.push('/login');
  };

  return {
    login,
    logout,
    isAuthenticated,
    role,
    accessToken,
  };
};
