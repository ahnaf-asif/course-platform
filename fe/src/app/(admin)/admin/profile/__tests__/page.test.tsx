import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import AdminProfilePage from '../page';
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

describe('AdminProfilePage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseGetMe.mockReturnValue({
      data: {
        id: 'user-1',
        full_name: 'John Doe',
        email: 'john@example.com',
        bio: 'Hello bio',
        role: 'ADMIN',
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

  it('renders initial profile values correctly', () => {
    render(<AdminProfilePage />);

    expect(screen.getByText('Account Settings')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Hello bio')).toBeInTheDocument();
  });

  it('submits updated profile values successfully', async () => {
    const mockUpdateMe = vi.fn().mockResolvedValue({});
    mockUseUpdateMe.mockReturnValue({
      mutateAsync: mockUpdateMe,
      isPending: false,
    });

    render(<AdminProfilePage />);

    const nameInput = screen.getByDisplayValue('John Doe');
    fireEvent.change(nameInput, { target: { value: 'Johnny Doe' } });

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateMe).toHaveBeenCalledWith({
        data: {
          full_name: 'Johnny Doe',
          email: 'john@example.com',
          bio: 'Hello bio',
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

    render(<AdminProfilePage />);

    // Click Security Tab
    const securityTab = screen.getByText('Security');
    fireEvent.click(securityTab);

    expect(screen.getByText('Change Password')).toBeInTheDocument();

    const currentPasswordInput = screen.getByPlaceholderText('Your current password');
    const newPasswordInput = screen.getByPlaceholderText('At least 8 characters');
    const confirmPasswordInput = screen.getByPlaceholderText('Repeat new password');

    fireEvent.change(currentPasswordInput, { target: { value: 'old-pass-123' } });
    fireEvent.change(newPasswordInput, { target: { value: 'new-pass-123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'new-pass-123' } });

    const updateButton = screen.getByText('Update Password');
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

    render(<AdminProfilePage />);

    const saveButton = screen.getByText('Save Changes');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Account Settings')).toBeInTheDocument();
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

    render(<AdminProfilePage />);

    const securityTab = screen.getByText('Security');
    fireEvent.click(securityTab);

    const currentPasswordInput = screen.getByPlaceholderText('Your current password');
    const newPasswordInput = screen.getByPlaceholderText('At least 8 characters');
    const confirmPasswordInput = screen.getByPlaceholderText('Repeat new password');

    fireEvent.change(currentPasswordInput, { target: { value: 'wrong-pass' } });
    fireEvent.change(newPasswordInput, { target: { value: 'new-pass-123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'new-pass-123' } });

    const updateButton = screen.getByText('Update Password');
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText('Change Password')).toBeInTheDocument();
    });
  });
});
