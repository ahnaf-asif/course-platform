import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from './test-utils';
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

const mockLogin = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
  }),
}));

const mockUsePostAuthRegister = vi.fn();
vi.mock('@/api/generated/authentication/authentication', () => ({
  usePostAuthRegister: () => mockUsePostAuthRegister(),
}));

vi.mock('axios', async (importOriginal) => {
  const original = await importOriginal<typeof import('axios')>();
  return {
    ...original,
    default: {
      ...original.default,
      isAxiosError: () => true,
    },
    isAxiosError: () => true,
  };
});

describe('Auth Pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePostAuthRegister.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it('should render login page and handle validation', async () => {
    render(<LoginPage />);

    expect(screen.getByText('সাইন ইন করুন', { selector: 'h2' })).toBeInTheDocument();

    const form = screen.getByRole('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('should successfully submit login form and call login', async () => {
    mockLogin.mockResolvedValue({});
    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('আপনার পাসওয়ার্ড লিখুন'), { target: { value: 'password123' } });

    const form = screen.getByRole('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('should handle login error gracefully', async () => {
    const errorObj = {
      isAxiosError: true,
      response: { data: { message: 'Invalid credentials' } },
    };
    mockLogin.mockRejectedValue(errorObj);
    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('আপনার পাসওয়ার্ড লিখুন'), { target: { value: 'wrongpassword' } });

    const form = screen.getByRole('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'wrongpassword');
    });
  });

  it('should render register page and handle validation', async () => {
    render(<RegisterPage />);

    expect(screen.getByText('নতুন অ্যাকাউন্ট খুলুন', { selector: 'h2' })).toBeInTheDocument();

    const form = screen.getByRole('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
    });
  });

  it('should validate too long fields on registration form', async () => {
    render(<RegisterPage />);

    const nameInput = screen.getByPlaceholderText('আপনার নাম লিখুন');
    const emailInput = screen.getByPlaceholderText('you@example.com');
    const passwordInput = screen.getByPlaceholderText('কমপক্ষে ৮ অক্ষর');

    fireEvent.change(nameInput, { target: { value: 'a'.repeat(101) } });
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'p'.repeat(73) } });

    const form = screen.getByRole('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('Max 100 characters')).toBeInTheDocument();
      expect(screen.getByText('Max 72 characters')).toBeInTheDocument();
    });
  });

  it('should successfully submit register form and redirect to login', async () => {
    mockUsePostAuthRegister.mockReturnValue({
      mutateAsync: vi.fn().mockResolvedValue({}),
      isPending: false,
    });
    render(<RegisterPage />);

    fireEvent.change(screen.getByPlaceholderText('আপনার নাম লিখুন'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('কমপক্ষে ৮ অক্ষর'), { target: { value: 'password123' } });

    const form = screen.getByRole('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login');
    });
  });

  it('should handle registration error gracefully', async () => {
    const errorObj = {
      isAxiosError: true,
      response: { data: { message: 'Email already exists' } },
    };
    mockUsePostAuthRegister.mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(errorObj),
      isPending: false,
    });
    render(<RegisterPage />);

    fireEvent.change(screen.getByPlaceholderText('আপনার নাম লিখুন'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'test@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('কমপক্ষে ৮ অক্ষর'), { target: { value: 'password123' } });

    const form = screen.getByRole('form');
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText('নতুন অ্যাকাউন্ট খুলুন', { selector: 'h2' })).toBeInTheDocument();
    });
  });
});
