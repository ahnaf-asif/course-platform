import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from './test-utils';
import { AuthGuard } from '@/components/guards/AuthGuard';
import * as AuthContextModule from '@/context/AuthContext';
import { AuthContextType } from '@/context/AuthContext';
import React from 'react';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/protected',
}));

describe('AuthGuard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultMockContext: AuthContextType = {
    accessToken: null,
    role: null,
    userEmail: null,
    setAccessToken: vi.fn(),
    clearAuth: vi.fn(),
    isAuthenticated: false,
    isHydrated: false,
  };

  it('should show a loader while hydrating', () => {
    vi.spyOn(AuthContextModule, 'useAuthContext').mockReturnValue({
      ...defaultMockContext,
      isHydrated: false,
      isAuthenticated: false,
    });

    render(
      <AuthGuard>
        <div data-testid="protected-content">Secret Content</div>
      </AuthGuard>
    );

    // No content
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should redirect to login if hydrated and not authenticated', async () => {
    vi.spyOn(AuthContextModule, 'useAuthContext').mockReturnValue({
      ...defaultMockContext,
      isHydrated: true,
      isAuthenticated: false,
    });

    render(
      <AuthGuard>
        <div data-testid="protected-content">Secret Content</div>
      </AuthGuard>
    );

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login?callbackUrl=%2Fprotected');
    });
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('should render children if hydrated and authenticated', () => {
    vi.spyOn(AuthContextModule, 'useAuthContext').mockReturnValue({
      ...defaultMockContext,
      isHydrated: true,
      isAuthenticated: true,
    });

    render(
      <AuthGuard>
        <div data-testid="protected-content">Secret Content</div>
      </AuthGuard>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });
});
