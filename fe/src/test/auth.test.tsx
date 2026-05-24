import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from './test-utils';
import { useAuth } from '@/hooks/useAuth';
import React from 'react';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => '/',
}));

// Test component to access useAuth hook
const AuthTestComponent = () => {
  const { login, logout, isAuthenticated, accessToken, role } = useAuth();
  
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
      <div data-testid="access-token">{accessToken}</div>
      <div data-testid="role">{role}</div>
      <button onClick={() => login('test@example.com', 'password')}>Login</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
};

describe('Authentication Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should hydrate auth state from refresh call', async () => {
    // In our test setup, MSW should be configured to return a success for /auth/refresh
    render(<AuthTestComponent />);

    // Initially not authenticated
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');

    // Wait for hydration (AuthContext calls /auth/refresh on mount)
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });

    expect(screen.getByTestId('access-token')).toHaveTextContent('new-access-token');
  });

  it('should login correctly', async () => {
    render(<AuthTestComponent />);

    const loginButton = screen.getByText('Login');
    
    await act(async () => {
      loginButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });

    expect(screen.getByTestId('access-token')).toHaveTextContent('fake-access-token');
  });

  it('should logout correctly', async () => {
    render(<AuthTestComponent />);

    // Wait for hydration to finish so we are authenticated
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });

    const logoutButton = screen.getByText('Logout');
    
    await act(async () => {
      logoutButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');
    });

    expect(screen.getByTestId('access-token')).toHaveTextContent('');
  });
});
