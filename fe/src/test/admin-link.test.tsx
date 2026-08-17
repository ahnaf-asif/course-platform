import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import UserLayout from '@/app/(user)/layout';
import React from 'react';
import { MantineProvider } from '@mantine/core';
import { theme } from '@/lib/theme';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  usePathname: () => '/dashboard',
}));

// Mock useAuth
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    logout: vi.fn(),
  }),
}));

// Mock AuthContext
const mockUseAuthContext = vi.fn();
vi.mock('@/context/AuthContext', () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

// Mock AuthGuard (to simplify testing the layout content)
vi.mock('@/components/guards/AuthGuard', () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const renderWithMantine = (ui: React.ReactElement) => {
  return render(
    <MantineProvider theme={theme}>
      {ui}
    </MantineProvider>
  );
};

describe('UserLayout Admin Link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not show Admin Panel link when user is not an admin', async () => {
    mockUseAuthContext.mockReturnValue({
      role: 'USER',
      userEmail: 'user@example.com',
      isAuthenticated: true,
      isHydrated: true,
    });

    renderWithMantine(
      <UserLayout>
        <div>Dashboard Content</div>
      </UserLayout>
    );

    // Click the profile target to open dropdown
    const target = screen.getByText('user@example.com');
    await act(async () => {
      fireEvent.click(target);
    });

    expect(screen.queryByText('অ্যাডমিন প্যানেল')).not.toBeInTheDocument();
  });

  it('should show Admin Panel link when user is an admin', async () => {
    mockUseAuthContext.mockReturnValue({
      role: 'ADMIN',
      userEmail: 'admin@example.com',
      isAuthenticated: true,
      isHydrated: true,
    });

    renderWithMantine(
      <UserLayout>
        <div>Dashboard Content</div>
      </UserLayout>
    );

    // Click the profile target to open dropdown
    const target = screen.getByText('admin@example.com');
    await act(async () => {
      fireEvent.click(target);
    });

    await waitFor(() => {
      expect(screen.getByText('অ্যাডমিন প্যানেল')).toBeInTheDocument();
    });
  });
});
