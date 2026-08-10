import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import UserProfilePage from '../page';
import React from 'react';

const mockUseGetMe = vi.fn();
const mockUseUpdateMe = vi.fn();
const mockUseUpdatePassword = vi.fn();

vi.mock('@/api/generated/user/user', () => ({
  useGetMe: () => mockUseGetMe(),
  useUpdateMe: () => mockUseUpdateMe(),
  useUpdatePassword: () => mockUseUpdatePassword(),
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

describe('UserProfilePage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseGetMe.mockReturnValue({
      data: {
        id: 'user-2',
        full_name: 'Jane Doe',
        email: 'jane@example.com',
        bio: 'Hello standard user bio',
        role: 'USER',
        avatar_url: '',
        created_at: '2026-06-20T00:00:00Z',
      },
      isLoading: false,
      refetch: vi.fn(),
    });

    mockUseUpdateMe.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    mockUseUpdatePassword.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it('renders initial user profile values correctly', () => {
    render(<UserProfilePage />);

    expect(screen.getByText('অ্যাকাউন্ট সেটিংস')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Jane Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('jane@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Hello standard user bio')).toBeInTheDocument();
  });

  it('submits updated profile values successfully', async () => {
    const mockUpdateMe = vi.fn().mockResolvedValue({});
    mockUseUpdateMe.mockReturnValue({
      mutateAsync: mockUpdateMe,
      isPending: false,
    });

    render(<UserProfilePage />);

    const nameInput = screen.getByDisplayValue('Jane Doe');
    fireEvent.change(nameInput, { target: { value: 'Janey Doe' } });

    const saveButton = screen.getByText('পরিবর্তন সংরক্ষণ করুন');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateMe).toHaveBeenCalledWith({
        data: {
          full_name: 'Janey Doe',
          email: 'jane@example.com',
          bio: 'Hello standard user bio',
        },
      });
    });
  });

  it('allows tab switching to security and changing password', async () => {
    const mockUpdatePassword = vi.fn().mockResolvedValue({});
    mockUseUpdatePassword.mockReturnValue({
      mutateAsync: mockUpdatePassword,
      isPending: false,
    });

    render(<UserProfilePage />);

    // Click Security Tab
    const securityTab = screen.getByText('সিকিউরিটি');
    fireEvent.click(securityTab);

    expect(screen.getByText('পাসওয়ার্ড পরিবর্তন করুন')).toBeInTheDocument();

    const currentPasswordInput = screen.getByPlaceholderText('আপনার বর্তমান পাসওয়ার্ড লিখুন');
    const newPasswordInput = screen.getByPlaceholderText('কমপক্ষে ৮ অক্ষর');
    const confirmPasswordInput = screen.getByPlaceholderText('পুনরায় নতুন পাসওয়ার্ড লিখুন');

    fireEvent.change(currentPasswordInput, { target: { value: 'old-pass-123' } });
    fireEvent.change(newPasswordInput, { target: { value: 'new-pass-123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'new-pass-123' } });

    const updateButton = screen.getByText('পাসওয়ার্ড হালনাগাদ করুন');
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalledWith({
        data: {
          old_password: 'old-pass-123',
          new_password: 'new-pass-123',
        },
      });
    });
  });

  it('handles profile update failure with axios error gracefully', async () => {
    const errorObj = {
      isAxiosError: true,
      response: { data: { message: 'Email already in use' } },
    };
    mockUseUpdateMe.mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(errorObj),
      isPending: false,
    });

    render(<UserProfilePage />);

    const saveButton = screen.getByText('পরিবর্তন সংরক্ষণ করুন');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('অ্যাকাউন্ট সেটিংস')).toBeInTheDocument();
    });
  });

  it('handles password update failure with axios error gracefully', async () => {
    const errorObj = {
      isAxiosError: true,
      response: { data: { message: 'Incorrect old password' } },
    };
    mockUseUpdatePassword.mockReturnValue({
      mutateAsync: vi.fn().mockRejectedValue(errorObj),
      isPending: false,
    });

    render(<UserProfilePage />);

    const securityTab = screen.getByText('সিকিউরিটি');
    fireEvent.click(securityTab);

    const currentPasswordInput = screen.getByPlaceholderText('আপনার বর্তমান পাসওয়ার্ড লিখুন');
    const newPasswordInput = screen.getByPlaceholderText('কমপক্ষে ৮ অক্ষর');
    const confirmPasswordInput = screen.getByPlaceholderText('পুনরায় নতুন পাসওয়ার্ড লিখুন');

    fireEvent.change(currentPasswordInput, { target: { value: 'wrong-pass' } });
    fireEvent.change(newPasswordInput, { target: { value: 'new-pass-123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'new-pass-123' } });

    const updateButton = screen.getByText('পাসওয়ার্ড হালনাগাদ করুন');
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText('পাসওয়ার্ড পরিবর্তন করুন')).toBeInTheDocument();
    });
  });
});
