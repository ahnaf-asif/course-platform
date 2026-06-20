import { renderHook, act } from '@testing-library/react';
import { useNodeQuizzes } from '../useNodeQuizzes';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockGetAdminQuizzes = vi.fn();
const mockGetAdminNodesIdQuizzes = vi.fn();
const mockAttachQuiz = vi.fn();
const mockDetachQuiz = vi.fn();
const mockCreateQuiz = vi.fn();

vi.mock('@/api/generated/admin-assessment/admin-assessment', () => ({
  useGetAdminQuizzes: () => mockGetAdminQuizzes(),
  useGetAdminNodesIdQuizzes: (id: string) => mockGetAdminNodesIdQuizzes(id),
  usePostAdminNodesIdQuizzes: () => ({ mutateAsync: mockAttachQuiz, isPending: false }),
  useDeleteAdminNodesIdQuizzesQuizId: () => ({ mutateAsync: mockDetachQuiz, isPending: false }),
  usePostAdminQuizzes: () => ({ mutateAsync: mockCreateQuiz, isPending: false }),
}));

describe('useNodeQuizzes hook', () => {
  const mockRefetchAll = vi.fn();
  const mockRefetchLinked = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetAdminQuizzes.mockReturnValue({
      data: [{ id: 'q-1', title: 'Quiz 1' }, { id: 'q-2', title: 'Quiz 2' }],
      isLoading: false,
      refetch: mockRefetchAll,
    });

    mockGetAdminNodesIdQuizzes.mockReturnValue({
      data: [{ id: 'q-1', title: 'Quiz 1' }],
      isLoading: false,
      refetch: mockRefetchLinked,
    });
  });

  it('filters out already linked quizzes from options', () => {
    const { result } = renderHook(() => useNodeQuizzes('node-123'));

    expect(result.current.quizOptions).toEqual([{ value: 'q-2', label: 'Quiz 2' }]);
  });

  it('attaches quiz successfully', async () => {
    mockAttachQuiz.mockResolvedValue({});
    const { result } = renderHook(() => useNodeQuizzes('node-123'));

    act(() => {
      result.current.setSelectedQuizId('q-2');
    });

    await act(async () => {
      await result.current.handleAttach();
    });

    expect(mockAttachQuiz).toHaveBeenCalledWith({ id: 'node-123', data: { quiz_id: 'q-2' } });
    expect(result.current.selectedQuizId).toBeNull();
  });

  it('detaches quiz successfully', async () => {
    mockDetachQuiz.mockResolvedValue({});
    const { result } = renderHook(() => useNodeQuizzes('node-123'));

    await act(async () => {
      await result.current.handleDetach('q-1');
    });

    expect(mockDetachQuiz).toHaveBeenCalledWith({ id: 'node-123', quizId: 'q-1' });
  });
});
