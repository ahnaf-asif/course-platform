import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import LoginPage from '../page';
import { useAuth } from '@/hooks/useAuth';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(),
}));

describe('LoginPage', () => {
  const mockLogin = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      login: mockLogin,
      logout: vi.fn(),
      register: vi.fn(),
      loading: false,
    });
  });

  it('renders login form with forgot password link', () => {
    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: /সাইন ইন করুন/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('আপনার পাসওয়ার্ড লিখুন')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /পাসওয়ার্ড ভুলে গেছেন\?/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /নিবন্ধন করুন/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /সাইন ইন করুন/i })).toBeInTheDocument();
  });

  it('submits credentials when valid', async () => {
    mockLogin.mockResolvedValueOnce({});
    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText('you@example.com');
    const passwordInput = screen.getByPlaceholderText('আপনার পাসওয়ার্ড লিখুন');
    const submitBtn = screen.getByRole('button', { name: /সাইন ইন করুন/i });

    fireEvent.change(emailInput, { target: { value: 'student@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('student@example.com', 'password123');
    });
  });
});
