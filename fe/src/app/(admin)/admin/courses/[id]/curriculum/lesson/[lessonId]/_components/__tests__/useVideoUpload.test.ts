import { renderHook, act } from '@testing-library/react';
import { useVideoUpload } from '../useVideoUpload';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { axiosInstance } from '@/lib/axios';
import axios, { AxiosProgressEvent } from 'axios';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';

vi.mock('@/lib/axios', () => ({
  axiosInstance: vi.fn(),
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
      head: vi.fn(),
      post: vi.fn(),
      isAxiosError: vi.fn(),
    },
    isAxiosError: vi.fn(),
  };
});

describe('useVideoUpload hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Helper component to test with dynamic state updates
  function setUpHook(initialValue: string) {
    let hookRef: ReturnType<typeof useVideoUpload>;
    function TestComponent() {
      const [value, setValue] = useState(initialValue);
      const hook = useVideoUpload({ value, onChange: setValue });
      hookRef = hook;
      return null;
    }
    const renderResult = renderHook(() => TestComponent());
    return {
      get current() {
        return hookRef;
      },
      rerender: renderResult.rerender,
    };
  }

  it('should initialize with correct default state', () => {
    const hook = setUpHook('');
    expect(hook.current.uploading).toBe(false);
    expect(hook.current.progress).toBe(0);
    expect(hook.current.status).toBe('idle');
    expect(hook.current.isInternalMedia).toBe(false);
  });

  it('should detect internal media and check readiness on mount', async () => {
    vi.mocked(axiosInstance).mockImplementation((config) => {
      if (config?.url?.startsWith('/admin/media/token/')) {
        return Promise.resolve({ token: 'mock-token' });
      }
      return Promise.reject(new Error('unhandled mock'));
    });
    vi.mocked(axios.head).mockResolvedValue({ status: 200 });

    const hook = setUpHook('lesson-video-123');
    expect(hook.current.isInternalMedia).toBe(true);

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(axiosInstance).toHaveBeenCalledWith({
      url: '/admin/media/token/lesson-video-123',
      method: 'GET',
    });
    expect(axios.head).toHaveBeenCalledWith('/media-api/stream/lesson-video-123/index.m3u8?token=mock-token');
    expect(hook.current.status).toBe('ready');
  });

  it('should set status to processing if checking readiness fails', async () => {
    vi.mocked(axiosInstance).mockImplementation((config) => {
      if (config?.url?.startsWith('/admin/media/token/')) {
        return Promise.reject(new Error('Auth failed'));
      }
      return Promise.reject(new Error('unhandled mock'));
    });

    const hook = setUpHook('lesson-video-123');

    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    expect(hook.current.status).toBe('processing');
  });

  it('polls with taskId and completes successfully', async () => {
    // 1. Initial readiness check fails -> enters processing
    vi.mocked(axiosInstance).mockImplementation((config) => {
      if (config?.url?.startsWith('/admin/media/token/')) {
        return Promise.reject(new Error('initial fail'));
      }
      return Promise.reject(new Error('unhandled mock'));
    });

    const hook = setUpHook('lesson-video-123');
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });
    expect(hook.current.status).toBe('processing');

    // 2. Perform upload to set taskId
    vi.mocked(axiosInstance).mockImplementation((config) => {
      if (config?.url === '/admin/media/upload-token') {
        return Promise.resolve({ token: 'upload-token' });
      }
      return Promise.reject(new Error('unhandled mock'));
    });

    vi.mocked(axios.post).mockResolvedValue({
      data: { file_name: 'new-video-id', task_id: 'task-abc' },
    });

    const file = new File([''], 'video.mp4', { type: 'video/mp4' });
    await act(async () => {
      await hook.current.handleUpload(file);
    });

    // We expect the hooks value to become 'new-video-id' after onChange
    expect(hook.current.status).toBe('processing');

    // 3. Mock polling for task and final readiness check
    vi.mocked(axiosInstance).mockImplementation((config) => {
      if (config?.url === '/admin/media/tasks/task-abc') {
        return Promise.resolve({ state: 'COMPLETED' });
      }
      if (config?.url === '/admin/media/token/new-video-id') {
        return Promise.resolve({ token: 'ready-token' });
      }
      return Promise.reject(new Error('unhandled mock'));
    });
    vi.mocked(axios.head).mockResolvedValue({ status: 200 });

    // Advance timer by 5 seconds to run the polling interval
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(hook.current.status).toBe('ready');
  });

  it('polls with taskId and fails', async () => {
    vi.mocked(axiosInstance).mockImplementation((config) => {
      if (config?.url?.startsWith('/admin/media/token/')) {
        return Promise.reject(new Error('initial fail'));
      }
      return Promise.reject(new Error('unhandled mock'));
    });

    const hook = setUpHook('lesson-video-123');
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    vi.mocked(axiosInstance).mockImplementation((config) => {
      if (config?.url === '/admin/media/upload-token') {
        return Promise.resolve({ token: 'upload-token' });
      }
      return Promise.reject(new Error('unhandled mock'));
    });
    vi.mocked(axios.post).mockResolvedValue({
      data: { file_name: 'new-video-id', task_id: 'task-abc' },
    });

    const file = new File([''], 'video.mp4', { type: 'video/mp4' });
    await act(async () => {
      await hook.current.handleUpload(file);
    });

    // Mock task endpoint failure
    vi.mocked(axiosInstance).mockImplementation((config) => {
      if (config?.url === '/admin/media/tasks/task-abc') {
        return Promise.resolve({ state: 'FAILED' });
      }
      return Promise.reject(new Error('unhandled mock'));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(hook.current.status).toBe('idle');
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Processing Failed',
        color: 'red',
      })
    );
  });

  it('handles polling HTTP errors gracefully', async () => {
    vi.mocked(axiosInstance).mockImplementation((config) => {
      if (config?.url?.startsWith('/admin/media/token/')) {
        return Promise.reject(new Error('initial fail'));
      }
      return Promise.reject(new Error('unhandled mock'));
    });

    const hook = setUpHook('lesson-video-123');
    await act(async () => {
      await vi.runOnlyPendingTimersAsync();
    });

    vi.mocked(axiosInstance).mockImplementation((config) => {
      if (config?.url === '/admin/media/upload-token') {
        return Promise.resolve({ token: 'upload-token' });
      }
      return Promise.reject(new Error('unhandled mock'));
    });
    vi.mocked(axios.post).mockResolvedValue({
      data: { file_name: 'new-video-id', task_id: 'task-abc' },
    });

    const file = new File([''], 'video.mp4', { type: 'video/mp4' });
    await act(async () => {
      await hook.current.handleUpload(file);
    });

    // Mock polling endpoint throws network error
    vi.mocked(axiosInstance).mockImplementation((config) => {
      if (config?.url === '/admin/media/tasks/task-abc') {
        return Promise.reject(new Error('network error'));
      }
      return Promise.reject(new Error('unhandled mock'));
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    // Should remain processing
    expect(hook.current.status).toBe('processing');
  });

  it('does nothing when handleUpload is called with null file', async () => {
    const hook = setUpHook('');
    await act(async () => {
      await hook.current.handleUpload(null);
    });

    expect(hook.current.uploading).toBe(false);
    expect(axiosInstance).not.toHaveBeenCalled();
  });

  it('uploads video successfully', async () => {
    const hook = setUpHook('');

    vi.mocked(axiosInstance).mockImplementation((config) => {
      if (config?.url === '/admin/media/upload-token') {
        return Promise.resolve({ token: 'upload-token' });
      }
      return Promise.reject(new Error('unhandled mock'));
    });

    let progressCallback: ((ev: AxiosProgressEvent) => void) | undefined;
    let resolvePost: (value: unknown) => void;
    const postPromise = new Promise<unknown>((resolve) => {
      resolvePost = resolve;
    });

    vi.mocked(axios.post).mockImplementationOnce((url, data, config) => {
      progressCallback = config?.onUploadProgress;
      return postPromise;
    });

    const file = new File(['video-content'], 'video.mp4', { type: 'video/mp4' });

    let uploadPromise: Promise<void>;
    act(() => {
      uploadPromise = hook.current.handleUpload(file);
    });

    expect(hook.current.uploading).toBe(true);

    // Flush the microtasks to resolve the upload token fetch and execute axios.post
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      if (progressCallback) {
        progressCallback({ loaded: 50, total: 100 } as AxiosProgressEvent);
      }
    });
    expect(hook.current.progress).toBe(50);

    await act(async () => {
      resolvePost({
        data: { file_name: 'uploaded-video-uuid', task_id: 'task-12345' },
      });
      await uploadPromise;
    });

    expect(hook.current.uploading).toBe(false);
    expect(hook.current.status).toBe('processing');
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Upload Successful',
        color: 'green',
      })
    );
  });

  it('handles upload errors gracefully', async () => {
    const hook = setUpHook('');

    const errorObj = { response: { data: { message: 'Token expired' } } };
    vi.mocked(axiosInstance).mockImplementation((config) => {
      if (config?.url === '/admin/media/upload-token') {
        return Promise.reject(errorObj);
      }
      return Promise.reject(new Error('unhandled mock'));
    });
    vi.mocked(axios.isAxiosError).mockReturnValue(true);

    const file = new File(['video-content'], 'video.mp4', { type: 'video/mp4' });

    await act(async () => {
      await hook.current.handleUpload(file);
    });

    expect(hook.current.uploading).toBe(false);
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        message: 'Token expired',
        color: 'red',
      })
    );
  });
});
