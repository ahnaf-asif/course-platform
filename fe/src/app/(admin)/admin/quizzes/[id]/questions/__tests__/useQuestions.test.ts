import { renderHook, act } from '@testing-library/react';
import { useQuestions } from '../useQuestions';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { notifications } from '@mantine/notifications';
import axios from 'axios';

// Mock next/navigation
const mockPush = vi.fn();
const mockParams = { id: 'quiz-123' };
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useParams: () => mockParams,
}));

// Mock query and mutation hooks
const mockGetQuestions = vi.fn();
const mockGetQuizzes = vi.fn();
const mockAddQuestions = vi.fn();
const mockDeleteQuestion = vi.fn();
const mockUpdateQuestion = vi.fn();
const mockRefetchQuestions = vi.fn();

vi.mock('@/api/generated/admin-assessment/admin-assessment', () => ({
  useGetAdminQuizzesIdQuestions: () => mockGetQuestions(),
  useGetAdminQuizzes: () => mockGetQuizzes(),
  usePostAdminQuizzesIdQuestions: () => ({ mutateAsync: mockAddQuestions, isPending: false }),
  useDeleteAdminQuizzesIdQuestionsQId: () => ({ mutateAsync: mockDeleteQuestion, isPending: false }),
  usePatchAdminQuizzesIdQuestionsQId: () => ({ mutateAsync: mockUpdateQuestion, isPending: false }),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

vi.mock('axios', async (importOriginal) => {
  const original = await importOriginal<typeof import('axios')>();
  return {
    ...original,
    default: {
      ...original.default,
      isAxiosError: vi.fn(),
    },
    isAxiosError: vi.fn(),
  };
});

describe('useQuestions hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetQuestions.mockReturnValue({
      data: [
        {
          id: 'q-1',
          content: 'Q1 Content',
          question_type: 'SINGLE',
          sequence_order: 0,
          answers: [{ content: 'Ans 1', is_correct: true }],
        },
      ],
      isLoading: false,
      refetch: mockRefetchQuestions,
    });

    mockGetQuizzes.mockReturnValue({
      data: [{ id: 'quiz-123', title: 'Quiz 123' }],
      isLoading: false,
    });
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useQuestions());

    expect(result.current.quizId).toBe('quiz-123');
    expect(result.current.editingId).toBeNull();
    expect(result.current.questions).toHaveLength(1);
    expect(result.current.currentQuiz).toEqual({ id: 'quiz-123', title: 'Quiz 123' });
  });

  it('redirects to quizzes listing and shows notification if quiz not found', () => {
    mockGetQuizzes.mockReturnValue({
      data: [{ id: 'quiz-other', title: 'Other Quiz' }],
      isLoading: false,
    });

    renderHook(() => useQuestions());

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Not Found',
        color: 'red',
      })
    );
    expect(mockPush).toHaveBeenCalledWith('/admin/quizzes');
  });

  it('adds a new question skeleton to form when handleAddQuestion is called', () => {
    const { result } = renderHook(() => useQuestions());

    act(() => {
      result.current.handleAddQuestion();
    });

    expect(result.current.form.values.questions).toHaveLength(2);
    expect(result.current.form.values.questions[1]).toEqual({
      content: '',
      explanation: '',
      question_type: 'SINGLE',
      answers: [
        { content: '', is_correct: false },
        { content: '', is_correct: false },
      ],
    });
  });

  it('adds a new answer option to a question in the form when handleAddAnswer is called', () => {
    const { result } = renderHook(() => useQuestions());

    act(() => {
      result.current.handleAddAnswer(0);
    });

    expect(result.current.form.values.questions[0].answers).toHaveLength(3);
  });

  it('shows validation error on submit if questions have no correct answers', async () => {
    const { result } = renderHook(() => useQuestions());

    // Form initial values are not correct
    await act(async () => {
      await result.current.handleSubmit(result.current.form.values);
    });

    expect(mockAddQuestions).not.toHaveBeenCalled();
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Validation Error',
        color: 'red',
      })
    );
  });

  it('submits questions successfully', async () => {
    mockAddQuestions.mockResolvedValue({});
    const { result } = renderHook(() => useQuestions());

    // Make the question valid by checking "is_correct"
    act(() => {
      result.current.form.setValues({
        questions: [
          {
            content: 'Valid Question',
            explanation: 'Expl',
            question_type: 'SINGLE',
            answers: [
              { content: 'Option A', is_correct: true },
              { content: 'Option B', is_correct: false },
            ],
          },
        ],
      });
    });

    await act(async () => {
      await result.current.handleSubmit(result.current.form.values);
    });

    expect(mockAddQuestions).toHaveBeenCalledWith({
      id: 'quiz-123',
      data: {
        questions: [
          {
            content: 'Valid Question',
            explanation: 'Expl',
            question_type: 'SINGLE',
            sequence_order: 1, // existing questions length (1) + index (0)
            answers: [
              { content: 'Option A', is_correct: true },
              { content: 'Option B', is_correct: false },
            ],
          },
        ],
      },
    });
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Success',
        color: 'green',
      })
    );
    expect(mockRefetchQuestions).toHaveBeenCalled();
  });

  it('handles question submit failures gracefully with axios error', async () => {
    const errorObj = { response: { data: { message: 'Server is overloaded' } } };
    mockAddQuestions.mockRejectedValue(errorObj);
    vi.mocked(axios.isAxiosError).mockReturnValue(true);

    const { result } = renderHook(() => useQuestions());

    act(() => {
      result.current.form.setValues({
        questions: [
          {
            content: 'Valid Question',
            explanation: '',
            question_type: 'SINGLE',
            answers: [
              { content: 'Option A', is_correct: true },
              { content: 'Option B', is_correct: false },
            ],
          },
        ],
      });
    });

    await act(async () => {
      await result.current.handleSubmit(result.current.form.values);
    });

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        message: 'Server is overloaded',
        color: 'red',
      })
    );
  });

  it('handles starting edit mode and copies values to editForm', () => {
    const { result } = renderHook(() => useQuestions());

    const questionToEdit = {
      id: 'q-999',
      quiz_id: 'quiz-123',
      content: 'Edit Me',
      explanation: 'Explanation',
      question_type: 'MULTIPLE' as const,
      sequence_order: 5,
      answers: [
        { content: 'A', is_correct: true },
        { content: 'B', is_correct: true },
      ],
    };

    act(() => {
      result.current.handleStartEdit(questionToEdit);
    });

    expect(result.current.editingId).toBe('q-999');
    expect(result.current.editForm.values).toEqual({
      id: 'q-999',
      content: 'Edit Me',
      explanation: 'Explanation',
      question_type: 'MULTIPLE',
      sequence_order: 5,
      answers: [
        { content: 'A', is_correct: true },
        { content: 'B', is_correct: true },
      ],
    });
  });

  it('shows validation error on update if edited question has no correct answers', async () => {
    const { result } = renderHook(() => useQuestions());

    act(() => {
      result.current.editForm.setValues({
        id: 'q-1',
        content: 'No correct answer content',
        answers: [{ content: 'A', is_correct: false }],
      });
    });

    await act(async () => {
      await result.current.handleUpdateSubmit(result.current.editForm.values);
    });

    expect(mockUpdateQuestion).not.toHaveBeenCalled();
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Validation Error',
        color: 'red',
      })
    );
  });

  it('updates question successfully', async () => {
    mockUpdateQuestion.mockResolvedValue({});
    const { result } = renderHook(() => useQuestions());

    act(() => {
      result.current.editForm.setValues({
        id: 'q-1',
        content: 'New content',
        explanation: 'New explanation',
        question_type: 'SINGLE',
        sequence_order: 0,
        answers: [
          { content: 'A', is_correct: true },
          { content: 'B', is_correct: false },
        ],
      });
    });

    await act(async () => {
      await result.current.handleUpdateSubmit(result.current.editForm.values);
    });

    expect(mockUpdateQuestion).toHaveBeenCalledWith({
      id: 'quiz-123',
      qId: 'q-1',
      data: {
        content: 'New content',
        explanation: 'New explanation',
        question_type: 'SINGLE',
        sequence_order: 0,
        answers: [
          { content: 'A', is_correct: true },
          { content: 'B', is_correct: false },
        ],
      },
    });
    expect(result.current.editingId).toBeNull();
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Success',
        color: 'green',
      })
    );
    expect(mockRefetchQuestions).toHaveBeenCalled();
  });

  it('handles question update failures gracefully with axios error', async () => {
    const errorObj = { response: { data: { message: 'Database lock error' } } };
    mockUpdateQuestion.mockRejectedValue(errorObj);
    vi.mocked(axios.isAxiosError).mockReturnValue(true);

    const { result } = renderHook(() => useQuestions());

    act(() => {
      result.current.editForm.setValues({
        id: 'q-1',
        content: 'New content',
        explanation: '',
        question_type: 'SINGLE',
        sequence_order: 0,
        answers: [
          { content: 'A', is_correct: true },
          { content: 'B', is_correct: false },
        ],
      });
    });

    await act(async () => {
      await result.current.handleUpdateSubmit(result.current.editForm.values);
    });

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        message: 'Database lock error',
        color: 'red',
      })
    );
  });

  it('deletes question successfully when confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockDeleteQuestion.mockResolvedValue({});

    const { result } = renderHook(() => useQuestions());

    await act(async () => {
      await result.current.handleDelete('q-1');
    });

    expect(mockDeleteQuestion).toHaveBeenCalledWith({ id: 'quiz-123', qId: 'q-1' });
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Deleted',
        color: 'blue',
      })
    );
    expect(mockRefetchQuestions).toHaveBeenCalled();
  });

  it('cancels question delete when confirm is rejected', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    const { result } = renderHook(() => useQuestions());

    await act(async () => {
      await result.current.handleDelete('q-1');
    });

    expect(mockDeleteQuestion).not.toHaveBeenCalled();
    expect(mockRefetchQuestions).not.toHaveBeenCalled();
  });

  it('handles delete errors gracefully', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockDeleteQuestion.mockRejectedValue(new Error('Delete error'));

    const { result } = renderHook(() => useQuestions());

    await act(async () => {
      await result.current.handleDelete('q-1');
    });

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        message: 'Failed to delete question',
        color: 'red',
      })
    );
  });
});
