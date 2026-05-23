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
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should hydrate auth state from refresh token in localStorage', async () => {
    localStorage.setItem('refresh_token', 'valid-refresh-token');

    render(<AuthTestComponent />);

    // Initially not authenticated
    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated');

    // Wait for hydration
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });

    expect(screen.getByTestId('access-token')).toHaveTextContent('new-access-token');
    expect(localStorage.getItem('refresh_token')).toBe('new-refresh-token');
  });

  it('should login correctly and store tokens', async () => {
    render(<AuthTestComponent />);

    const loginButton = screen.getByText('Login');
    
    await act(async () => {
      loginButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated');
    });

    expect(screen.getByTestId('access-token')).toHaveTextContent('fake-access-token');
    expect(localStorage.getItem('refresh_token')).toBe('fake-refresh-token');
  });

  it('should logout correctly and clear tokens', async () => {
    // Start authenticated
    localStorage.setItem('refresh_token', 'valid-refresh-token');
    render(<AuthTestComponent />);

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
    expect(localStorage.getItem('refresh_token')).toBeNull();
  });
});
