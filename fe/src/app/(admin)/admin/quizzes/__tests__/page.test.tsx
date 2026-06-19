import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import QuizzesManagement from '../page';
import React from 'react';

const mockUseGetAdminQuizzes = vi.fn();
const mockUsePostAdminQuizzes = vi.fn();
const mockUsePatchAdminQuizzesId = vi.fn();
const mockUseDeleteAdminQuizzesId = vi.fn();

vi.mock('@/api/generated/admin-assessment/admin-assessment', () => ({
  useGetAdminQuizzes: () => mockUseGetAdminQuizzes(),
  usePostAdminQuizzes: () => mockUsePostAdminQuizzes(),
  usePatchAdminQuizzesId: () => mockUsePatchAdminQuizzesId(),
  useDeleteAdminQuizzesId: () => mockUseDeleteAdminQuizzesId(),
}));

describe('QuizzesManagement Page Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseGetAdminQuizzes.mockReturnValue({
      data: [
        { id: 'quiz-1', title: 'JavaScript Basics', passing_score: 75, created_at: '2026-06-20T00:00:00Z' },
      ],
      isLoading: false,
      refetch: vi.fn(),
    });

    mockUsePostAdminQuizzes.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUsePatchAdminQuizzesId.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUseDeleteAdminQuizzesId.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it('renders title and assessment list correctly', () => {
    render(<QuizzesManagement />);

    expect(screen.getByText('Assessment Library')).toBeInTheDocument();
    expect(screen.getByText('JavaScript Basics')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('allows clicking new quiz to open creation modal', async () => {
    render(<QuizzesManagement />);

    const newQuizButton = screen.getByText('New Quiz');
    fireEvent.click(newQuizButton);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g. Mid-term Examination')).toBeInTheDocument();
    });
  });
});
