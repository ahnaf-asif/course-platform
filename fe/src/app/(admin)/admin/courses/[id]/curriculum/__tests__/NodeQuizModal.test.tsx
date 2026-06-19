import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { NodeQuizModal } from '../NodeQuizModal';
import React from 'react';

const mockUseGetAdminQuizzes = vi.fn();
const mockUseGetAdminNodesIdQuizzes = vi.fn();
const mockUsePostAdminNodesIdQuizzes = vi.fn();
const mockUseDeleteAdminNodesIdQuizzesQuizId = vi.fn();
const mockUsePostAdminQuizzes = vi.fn();

vi.mock('@/api/generated/admin-assessment/admin-assessment', () => ({
  useGetAdminQuizzes: () => mockUseGetAdminQuizzes(),
  useGetAdminNodesIdQuizzes: (id: string) => mockUseGetAdminNodesIdQuizzes(id),
  usePostAdminNodesIdQuizzes: () => mockUsePostAdminNodesIdQuizzes(),
  useDeleteAdminNodesIdQuizzesQuizId: () => mockUseDeleteAdminNodesIdQuizzesQuizId(),
  usePostAdminQuizzes: () => mockUsePostAdminQuizzes(),
}));

describe('NodeQuizModal Component', () => {
  const mockClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseGetAdminQuizzes.mockReturnValue({
      data: [
        { id: 'quiz-1', title: 'Quiz One' },
        { id: 'quiz-2', title: 'Quiz Two' },
      ],
      isLoading: false,
      refetch: vi.fn(),
    });

    mockUseGetAdminNodesIdQuizzes.mockReturnValue({
      data: [
        { id: 'quiz-1', title: 'Quiz One' },
      ],
      isLoading: false,
      refetch: vi.fn(),
    });

    mockUsePostAdminNodesIdQuizzes.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    mockUseDeleteAdminNodesIdQuizzesQuizId.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    mockUsePostAdminQuizzes.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it('renders linked quizzes and options correctly', () => {
    render(
      <NodeQuizModal
        opened={true}
        onClose={mockClose}
        nodeId="node-1"
        nodeTitle="Introduction to React"
      />
    );

    expect(screen.getByText('Manage Quizzes: Introduction to React')).toBeInTheDocument();
    expect(screen.getByText('Quiz One')).toBeInTheDocument();
  });

  it('allows clicking Create New Quiz to display title input', () => {
    render(
      <NodeQuizModal
        opened={true}
        onClose={mockClose}
        nodeId="node-1"
        nodeTitle="Introduction to React"
      />
    );

    const toggleButton = screen.getByText('Create New Quiz');
    fireEvent.click(toggleButton);

    expect(screen.getByPlaceholderText('Enter quiz title...')).toBeInTheDocument();
  });
});
