import { renderHook, act } from '@testing-library/react';
import { useBulkUpload } from '../useBulkUpload';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { axiosInstance } from '@/lib/axios';
import { notifications } from '@mantine/notifications';

vi.mock('@/lib/axios', () => ({
  axiosInstance: vi.fn(),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

const mockCopy = vi.fn();
vi.mock('@mantine/hooks', async (importOriginal) => {
  const original = await importOriginal<typeof import('@mantine/hooks')>();
  return {
    ...original,
    useClipboard: () => ({
      copied: true,
      copy: mockCopy,
    }),
  };
});

describe('useBulkUpload hook', () => {
  const mockRefetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useBulkUpload({ quizId: 'quiz-123', refetch: mockRefetch }));

    expect(result.current.uploadStatus).toBe('idle');
    expect(result.current.uploadModalOpened).toBe(false);
    expect(result.current.copied).toBe(true);
  });

  it('handles copying AI prompt successfully', () => {
    const { result } = renderHook(() => useBulkUpload({ quizId: 'quiz-123', refetch: mockRefetch }));

    act(() => {
      result.current.handleCopyAIPrompt();
    });

    expect(mockCopy).toHaveBeenCalledWith(expect.stringContaining('CSV file'));
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Copied',
        message: 'AI prompt copied to clipboard!',
        color: 'green',
      })
    );
  });

  it('does nothing when bulk upload is called with null file', async () => {
    const { result } = renderHook(() => useBulkUpload({ quizId: 'quiz-123', refetch: mockRefetch }));

    await act(async () => {
      await result.current.handleBulkUpload(null);
    });

    expect(result.current.uploadStatus).toBe('idle');
    expect(axiosInstance).not.toHaveBeenCalled();
  });

  it('handles bulk upload successfully and sets task id', async () => {
    vi.mocked(axiosInstance).mockResolvedValueOnce({ task_id: 'task-999' });

    const { result } = renderHook(() => useBulkUpload({ quizId: 'quiz-123', refetch: mockRefetch }));

    // Open modal first
    act(() => {
      result.current.openUploadModal();
    });
    expect(result.current.uploadModalOpened).toBe(true);

    const file = new File(['csv-content'], 'questions.csv', { type: 'text/csv' });
    await act(async () => {
      await result.current.handleBulkUpload(file);
    });

    expect(result.current.uploadStatus).toBe('processing');
    expect(result.current.uploadModalOpened).toBe(false); // Should close modal
    expect(axiosInstance).toHaveBeenCalledWith({
      url: '/admin/quizzes/quiz-123/questions/csv',
      method: 'POST',
      data: expect.any(FormData),
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Upload Started',
        color: 'blue',
      })
    );
  });

  it('handles bulk upload failures gracefully', async () => {
    vi.mocked(axiosInstance).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useBulkUpload({ quizId: 'quiz-123', refetch: mockRefetch }));

    const file = new File(['csv-content'], 'questions.csv', { type: 'text/csv' });
    await act(async () => {
      await result.current.handleBulkUpload(file);
    });

    expect(result.current.uploadStatus).toBe('idle');
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Upload Failed',
        color: 'red',
      })
    );
  });

  it('polls bulk upload status and triggers refetch on completion', async () => {
    // 1. Start bulk upload to set taskId and processing state
    vi.mocked(axiosInstance).mockResolvedValueOnce({ task_id: 'task-999' });
    const { result } = renderHook(() => useBulkUpload({ quizId: 'quiz-123', refetch: mockRefetch }));

    const file = new File(['csv-content'], 'questions.csv', { type: 'text/csv' });
    await act(async () => {
      await result.current.handleBulkUpload(file);
    });

    // 2. Mock polling responses
    // First poll: RUNNING
    vi.mocked(axiosInstance).mockResolvedValueOnce({ state: 'RUNNING' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(result.current.uploadStatus).toBe('processing');
    expect(mockRefetch).not.toHaveBeenCalled();

    // Second poll: COMPLETED
    vi.mocked(axiosInstance).mockResolvedValueOnce({ state: 'COMPLETED' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(result.current.uploadStatus).toBe('ready');
    expect(mockRefetch).toHaveBeenCalled();
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Success',
        message: 'Bulk upload completed successfully!',
        color: 'green',
      })
    );
  });

  it('polls bulk upload status and handles failure', async () => {
    vi.mocked(axiosInstance).mockResolvedValueOnce({ task_id: 'task-999' });
    const { result } = renderHook(() => useBulkUpload({ quizId: 'quiz-123', refetch: mockRefetch }));

    const file = new File(['csv-content'], 'questions.csv', { type: 'text/csv' });
    await act(async () => {
      await result.current.handleBulkUpload(file);
    });

    // Mock poll response FAILED
    vi.mocked(axiosInstance).mockResolvedValueOnce({ state: 'FAILED' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(result.current.uploadStatus).toBe('idle');
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Failed',
        color: 'red',
      })
    );
  });

  it('handles polling errors gracefully', async () => {
    vi.mocked(axiosInstance).mockResolvedValueOnce({ task_id: 'task-999' });
    const { result } = renderHook(() => useBulkUpload({ quizId: 'quiz-123', refetch: mockRefetch }));

    const file = new File(['csv-content'], 'questions.csv', { type: 'text/csv' });
    await act(async () => {
      await result.current.handleBulkUpload(file);
    });

    // Mock poll throws network error
    vi.mocked(axiosInstance).mockRejectedValueOnce(new Error('Network error'));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    // Hook status should remain processing
    expect(result.current.uploadStatus).toBe('processing');
  });
});
