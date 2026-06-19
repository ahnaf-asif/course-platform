import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import VideoUpload from '../VideoUpload';
import React from 'react';

const mockAxiosInstance = vi.fn();

vi.mock('@/lib/axios', () => ({
  axiosInstance: (args: any) => mockAxiosInstance(args),
  setAuthHandlers: vi.fn(),
  updateAccessToken: vi.fn(),
}));

vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>();
  return {
    ...actual,
    default: {
      ...actual.default,
      post: vi.fn(),
      head: vi.fn(),
      isAxiosError: vi.fn().mockReturnValue(false),
    },
  };
});

describe('VideoUpload Component', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders lesson video title and upload button when no video value', () => {
    render(<VideoUpload value="" onChange={mockOnChange} />);

    expect(screen.getByText('Lesson Video')).toBeInTheDocument();
    expect(screen.getByText('Upload Video')).toBeInTheDocument();
  });

  it('renders video ID and status correctly', () => {
    mockAxiosInstance.mockResolvedValueOnce({ token: 'preview-token' });

    render(<VideoUpload value="video-abc" onChange={mockOnChange} />);

    expect(screen.getByText(/video-abc/)).toBeInTheDocument();
  });
});
