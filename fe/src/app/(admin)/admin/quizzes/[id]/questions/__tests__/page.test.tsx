import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import QuestionManagement from '../page';
import React from 'react';
import { AxiosRequestConfig } from 'axios';

const mockUseGetAdminQuizzesIdQuestions = vi.fn();
const mockUseGetAdminQuizzes = vi.fn();
const mockUsePostAdminQuizzesIdQuestions = vi.fn();
const mockUseDeleteAdminQuizzesIdQuestionsQId = vi.fn();
const mockUsePatchAdminQuizzesIdQuestionsQId = vi.fn();

vi.mock('@/api/generated/admin-assessment/admin-assessment', () => ({
  useGetAdminQuizzesIdQuestions: (id: string) => mockUseGetAdminQuizzesIdQuestions(id),
  useGetAdminQuizzes: () => mockUseGetAdminQuizzes(),
  usePostAdminQuizzesIdQuestions: () => mockUsePostAdminQuizzesIdQuestions(),
  useDeleteAdminQuizzesIdQuestionsQId: () => mockUseDeleteAdminQuizzesIdQuestionsQId(),
  usePatchAdminQuizzesIdQuestionsQId: () => mockUsePatchAdminQuizzesIdQuestionsQId(),
}));

const mockPush = vi.fn();
const mockParams = { id: 'quiz-abc' };
vi.mock('next/navigation', () => ({
  useParams: () => mockParams,
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockAxiosInstance = vi.fn();
vi.mock('@/lib/axios', () => ({
  axiosInstance: (args: AxiosRequestConfig) => mockAxiosInstance(args),
  setAuthHandlers: vi.fn(),
  updateAccessToken: vi.fn(),
}));

describe('QuestionManagement Page Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseGetAdminQuizzes.mockReturnValue({
      data: [
        { id: 'quiz-abc', title: 'React Quiz', passing_score: 80, created_at: '2026-06-20T00:00:00Z' },
      ],
      isLoading: false,
    });

    mockUseGetAdminQuizzesIdQuestions.mockReturnValue({
      data: [
        { id: 'q-1', content: 'What is JSX?', question_type: 'SINGLE', sequence_order: 0, answers: [], explanation: '' },
      ],
      isLoading: false,
      refetch: vi.fn(),
    });

    mockUsePostAdminQuizzesIdQuestions.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    mockUseDeleteAdminQuizzesIdQuestionsQId.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    mockUsePatchAdminQuizzesIdQuestionsQId.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it('renders breadcrumbs, headers, and question cards', () => {
    render(<QuestionManagement />);

    expect(screen.getByText('Quizzes')).toBeInTheDocument();
    expect(screen.getByText('Manage Questions')).toBeInTheDocument();
    expect(screen.getAllByText('What is JSX?')[0]).toBeInTheDocument();
  });
});
