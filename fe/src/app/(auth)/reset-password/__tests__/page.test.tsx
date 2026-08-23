import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import ResetPasswordPage from '../page';
import axios from 'axios';
import { notifications } from '@mantine/notifications';
import * as navigation from 'next/navigation';

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      post: vi.fn(),
      isAxiosError: actual.isAxiosError,
    },
    isAxiosError: actual.isAxiosError,
  };
});

vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn(),
}));

describe('ResetPasswordPage', () => {
  const mockPush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(navigation.useRouter).mockReturnValue({
      push: mockPush,
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
    });
    vi.mocked(axios.post).mockImplementation(async (url: string) => {
      if (url.includes('/auth/refresh')) {
        return { data: { access_token: 'mock-token' } };
      }
      return { data: { message: 'Password reset successfully' } };
    });
  });

  it('renders missing/invalid token alert when no token is present', () => {
    vi.mocked(navigation.useSearchParams).mockReturnValue(new URLSearchParams(''));

    render(<ResetPasswordPage />);

    expect(screen.getByText(/অবৈধ বা মেয়াদোত্তীর্ণ লিংক/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /নতুন রিসেট লিংক পাঠান/i })).toBeInTheDocument();
  });

  it('renders password reset form when valid token is present', () => {
    vi.mocked(navigation.useSearchParams).mockReturnValue(
      new URLSearchParams('token=sample_valid_token_123')
    );

    render(<ResetPasswordPage />);

    expect(screen.getByRole('heading', { name: /নতুন পাসওয়ার্ড নির্ধারণ করুন/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/নতুন পাসওয়ার্ডটি পুনরায় লিখুন/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /পাসওয়ার্ড রিসেট করুন/i })).toBeInTheDocument();
  });

  it('validates password length and matching confirmation', async () => {
    vi.mocked(navigation.useSearchParams).mockReturnValue(
      new URLSearchParams('token=sample_valid_token_123')
    );

    render(<ResetPasswordPage />);

    const passwordInput = screen.getByPlaceholderText(/কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড/i);
    const confirmInput = screen.getByPlaceholderText(/নতুন পাসওয়ার্ডটি পুনরায় লিখুন/i);
    const submitBtn = screen.getByRole('button', { name: /পাসওয়ার্ড রিসেট করুন/i });

    // 1. Too short password
    fireEvent.change(passwordInput, { target: { value: 'short' } });
    fireEvent.change(confirmInput, { target: { value: 'short' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে')).toBeInTheDocument();
    });

    // 2. Mismatched passwords
    fireEvent.change(passwordInput, { target: { value: 'ValidPassword123' } });
    fireEvent.change(confirmInput, { target: { value: 'DifferentPassword123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('পাসওয়ার্ড দুটি মিলছে না')).toBeInTheDocument();
    });

    expect(axios.post).not.toHaveBeenCalledWith(
      expect.stringContaining('/auth/reset-password'),
      expect.anything(),
      expect.anything()
    );
  });

  it('submits valid password and displays success state', async () => {
    vi.mocked(navigation.useSearchParams).mockReturnValue(
      new URLSearchParams('token=sample_valid_token_123')
    );

    render(<ResetPasswordPage />);

    const passwordInput = screen.getByPlaceholderText(/কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড/i);
    const confirmInput = screen.getByPlaceholderText(/নতুন পাসওয়ার্ডটি পুনরায় লিখুন/i);
    const submitBtn = screen.getByRole('button', { name: /পাসওয়ার্ড রিসেট করুন/i });

    fireEvent.change(passwordInput, { target: { value: 'StrongPassword123' } });
    fireEvent.change(confirmInput, { target: { value: 'StrongPassword123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/auth/reset-password'),
        {
          token: 'sample_valid_token_123',
          new_password: 'StrongPassword123',
        },
        expect.anything()
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /পাসওয়ার্ড পরিবর্তিত হয়েছে!/i })).toBeInTheDocument();
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'সফল',
          color: 'green',
        })
      );
    });
  });

  it('handles API error when token is invalid or expired on server', async () => {
    vi.mocked(navigation.useSearchParams).mockReturnValue(
      new URLSearchParams('token=expired_token')
    );
    vi.mocked(axios.post).mockImplementation(async (url: string) => {
      if (url.includes('/auth/refresh')) {
        return { data: { access_token: 'mock-token' } };
      }
      const error = new axios.AxiosError('Invalid token');
      error.response = {
        data: { message: 'Invalid or expired password reset token' },
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as any,
      };
      throw error;
    });

    render(<ResetPasswordPage />);

    const passwordInput = screen.getByPlaceholderText(/কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড/i);
    const confirmInput = screen.getByPlaceholderText(/নতুন পাসওয়ার্ডটি পুনরায় লিখুন/i);
    const submitBtn = screen.getByRole('button', { name: /পাসওয়ার্ড রিসেট করুন/i });

    fireEvent.change(passwordInput, { target: { value: 'StrongPassword123' } });
    fireEvent.change(confirmInput, { target: { value: 'StrongPassword123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'পাসওয়ার্ড রিসেট ব্যর্থ',
          message: 'Invalid or expired password reset token',
          color: 'red',
        })
      );
    });
  });
});
