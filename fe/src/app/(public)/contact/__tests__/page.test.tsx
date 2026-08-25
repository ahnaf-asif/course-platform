import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import ContactPage from '../page';
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

describe('ContactPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(axios.post).mockImplementation(async (url: string) => {
      if (url.includes('/auth/refresh')) {
        return { data: { access_token: 'mock-token' } };
      }
      return { data: { success: true } };
    });
  });

  it('renders contact page form and contact info properly', () => {
    render(<ContactPage />);

    expect(
      screen.getByRole('heading', { name: /আমাদের সাথে যোগাযোগ করুন/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /আমাদের কাছে বার্তা পাঠান/i })
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('আপনার নাম লিখুন')
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('your.email@example.com')
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('+৮৮০ ১৭০০-০০০০০০')
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('কী বিষয়ে জানতে চান?')
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('আপনার প্রশ্ন বা মতামত বিস্তারিত লিখুন...')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /বার্তা পাঠান/i })
    ).toBeInTheDocument();
  });

  it('validates required fields on submit', async () => {
    render(<ContactPage />);

    const nameInput = screen.getByPlaceholderText('আপনার নাম লিখুন');
    const emailInput = screen.getByPlaceholderText('your.email@example.com');
    const subjectInput = screen.getByPlaceholderText('কী বিষয়ে জানতে চান?');
    const messageInput = screen.getByPlaceholderText(
      'আপনার প্রশ্ন বা মতামত বিস্তারিত লিখুন...'
    );
    const submitBtn = screen.getByRole('button', { name: /বার্তা পাঠান/i });

    fireEvent.change(nameInput, { target: { value: 'A' } });
    fireEvent.change(emailInput, { target: { value: 'bad-email' } });
    fireEvent.change(subjectInput, { target: { value: 'No' } });
    fireEvent.change(messageInput, { target: { value: 'Short' } });

    fireEvent.submit(submitBtn.closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('কমপক্ষে ২ অক্ষর লিখুন')).toBeInTheDocument();
      expect(screen.getByText('সঠিক ইমেইল লিখুন')).toBeInTheDocument();
      expect(screen.getByText('কমপক্ষে ৩ অক্ষর লিখুন')).toBeInTheDocument();
      expect(screen.getByText('কমপক্ষে ১০ অক্ষর লিখুন')).toBeInTheDocument();
    });

    expect(axios.post).not.toHaveBeenCalledWith(
      '/api/contact',
      expect.anything()
    );
  });

  it('submits form successfully and shows success notification', async () => {
    render(<ContactPage />);

    const nameInput = screen.getByPlaceholderText('আপনার নাম লিখুন');
    const emailInput = screen.getByPlaceholderText('your.email@example.com');
    const phoneInput = screen.getByPlaceholderText('+৮৮০ ১৭০০-০০০০০০');
    const subjectInput = screen.getByPlaceholderText('কী বিষয়ে জানতে চান?');
    const messageInput = screen.getByPlaceholderText(
      'আপনার প্রশ্ন বা মতামত বিস্তারিত লিখুন...'
    );
    const submitBtn = screen.getByRole('button', { name: /বার্তা পাঠান/i });

    fireEvent.change(nameInput, { target: { value: 'Tanvir Hossain' } });
    fireEvent.change(emailInput, { target: { value: 'tanvir@example.com' } });
    fireEvent.change(phoneInput, { target: { value: '+880 1700 000000' } });
    fireEvent.change(subjectInput, { target: { value: 'Admission Query' } });
    fireEvent.change(messageInput, {
      target: { value: 'When will the new batch start for the 47th BCS?' },
    });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/contact', {
        name: 'Tanvir Hossain',
        email: 'tanvir@example.com',
        phone: '+880 1700 000000',
        subject: 'Admission Query',
        message: 'When will the new batch start for the 47th BCS?',
      });
    });

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'বার্তা পাঠানো হয়েছে!',
          color: 'green',
        })
      );
    });
  });

  it('shows error notification when API request fails', async () => {
    vi.mocked(axios.post).mockImplementation(async (url: string) => {
      if (url.includes('/auth/refresh')) {
        return { data: { access_token: 'mock-token' } };
      }
      const error = new axios.AxiosError('Submission failed');
      error.response = {
        data: { message: 'ডিসকর্ড নোটিফিকেশন পাঠাতে ব্যর্থ হয়েছে' },
        status: 502,
        statusText: 'Bad Gateway',
        headers: {},
        config: {} as unknown as import('axios').InternalAxiosRequestConfig,
      };
      throw error;
    });

    render(<ContactPage />);

    const nameInput = screen.getByPlaceholderText('আপনার নাম লিখুন');
    const emailInput = screen.getByPlaceholderText('your.email@example.com');
    const subjectInput = screen.getByPlaceholderText('কী বিষয়ে জানতে চান?');
    const messageInput = screen.getByPlaceholderText(
      'আপনার প্রশ্ন বা মতামত বিস্তারিত লিখুন...'
    );
    const submitBtn = screen.getByRole('button', { name: /বার্তা পাঠান/i });

    fireEvent.change(nameInput, { target: { value: 'Tanvir Hossain' } });
    fireEvent.change(emailInput, { target: { value: 'tanvir@example.com' } });
    fireEvent.change(subjectInput, { target: { value: 'Admission Query' } });
    fireEvent.change(messageInput, {
      target: { value: 'When will the new batch start for the 47th BCS?' },
    });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'বার্তা পাঠানো ব্যর্থ',
          message: 'ডিসকর্ড নোটিফিকেশন পাঠাতে ব্যর্থ হয়েছে',
          color: 'red',
        })
      );
    });
  });
});
