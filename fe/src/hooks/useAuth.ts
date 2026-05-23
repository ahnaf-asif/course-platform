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

      if (response.refresh_token) {
        localStorage.setItem('refresh_token', response.refresh_token);
      }
      if (response.access_token) {
        setAccessToken(response.access_token);
      }
      router.push('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await logoutMutation.mutateAsync({
          data: { refresh_token: refreshToken },
        });
      } catch (error) {
        console.error('Logout request failed:', error);
      }
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
