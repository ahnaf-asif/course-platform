import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from './test-utils';
import userEvent from '@testing-library/user-event';
import LoginPage from '@/app/(auth)/login/page';
import RegisterPage from '@/app/(auth)/register/page';
import React from 'react';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/',
}));

describe('Auth Pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render login page and handle validation', async () => {
    render(<LoginPage />);

    expect(screen.getByText('Sign In', { selector: 'h2' })).toBeInTheDocument();

    const form = screen.getByRole('form'); // I need to add aria-label="login-form" to the form
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('should render register page and handle validation', async () => {
    render(<RegisterPage />);

    expect(screen.getByText('Create Account', { selector: 'h2' })).toBeInTheDocument();

    const form = screen.getByRole('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      expect(screen.getByText(/min 8 characters/i)).toBeInTheDocument();
    });
  });

  it('should successfully submit register form and redirect to login', async () => {
    const user = userEvent.setup();
    render(<RegisterPage />);

    await user.type(screen.getByLabelText(/full name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    // Using placeholder to avoid ambiguity with label/button
    await user.type(screen.getByPlaceholderText(/min 8 characters/i), 'password123');

    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });
});
