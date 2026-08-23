import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import ForgotPasswordPage from '../page';
import axios from 'axios';
import { notifications } from '@mantine/notifications';

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

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(axios.post).mockImplementation(async (url: string) => {
      if (url.includes('/auth/refresh')) {
        return { data: { access_token: 'mock-token' } };
      }
      return { data: { message: 'Reset link sent' } };
    });
  });

  it('renders forgot password form properly', () => {
    render(<ForgotPasswordPage />);

    expect(screen.getByRole('heading', { name: /পাসওয়ার্ড ভুলে গেছেন/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /রিসেট লিংক পাঠান/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /সাইন ইন করুন/i })).toBeInTheDocument();
  });

  it('validates email format before submission', async () => {
    render(<ForgotPasswordPage />);

    const emailInput = screen.getByPlaceholderText('you@example.com');
    const submitBtn = screen.getByRole('button', { name: /রিসেট লিংক পাঠান/i });

    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('সঠিক ইমেইল ঠিকানা দিন')).toBeInTheDocument();
    });
    expect(axios.post).not.toHaveBeenCalledWith(
      expect.stringContaining('/auth/forgot-password'),
      expect.anything(),
      expect.anything()
    );
  });

  it('submits valid email and shows success confirmation view', async () => {
    render(<ForgotPasswordPage />);

    const emailInput = screen.getByPlaceholderText('you@example.com');
    const submitBtn = screen.getByRole('button', { name: /রিসেট লিংক পাঠান/i });

    fireEvent.change(emailInput, { target: { value: 'student@example.com' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/auth/forgot-password'),
        { email: 'student@example.com' },
        expect.anything()
      );
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /রিসেট লিংক পাঠানো হয়েছে!/i })).toBeInTheDocument();
      expect(screen.getByText('student@example.com')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /লগইন পেজে ফিরে যান/i })).toBeInTheDocument();
    });
  });

  it('shows error notification when API fails', async () => {
    vi.mocked(axios.post).mockImplementation(async (url: string) => {
      if (url.includes('/auth/refresh')) {
        return { data: { access_token: 'mock-token' } };
      }
      const error = new axios.AxiosError('Rate limited');
      error.response = {
        data: { message: 'Rate limit exceeded' },
        status: 429,
        statusText: 'Too Many Requests',
        headers: {},
        config: {} as any,
      };
      throw error;
    });

    render(<ForgotPasswordPage />);

    const emailInput = screen.getByPlaceholderText('you@example.com');
    const submitBtn = screen.getByRole('button', { name: /রিসেট লিংক পাঠান/i });

    fireEvent.change(emailInput, { target: { value: 'student@example.com' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'অনুরোধ ব্যর্থ',
          message: 'Rate limit exceeded',
          color: 'red',
        })
      );
    });
  });
});
