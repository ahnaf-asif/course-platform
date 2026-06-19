import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import { PreviewPlayer } from '../PreviewPlayer';
import React from 'react';

import { AxiosRequestConfig } from 'axios';

const mockHls = {
  loadSource: vi.fn(),
  attachMedia: vi.fn(),
  on: vi.fn(),
  destroy: vi.fn(),
};

vi.mock('hls.js', () => {
  const HlsMock = vi.fn().mockImplementation(function (this: unknown) {
    return mockHls;
  });
  (HlsMock as unknown as Record<string, unknown>).isSupported = () => true;
  (HlsMock as unknown as Record<string, unknown>).Events = {
    MANIFEST_PARSED: 'manifestParsed',
    ERROR: 'error',
  };
  return {
    default: HlsMock,
  };
});

const mockAxiosInstance = vi.fn();

vi.mock('@/lib/axios', () => ({
  axiosInstance: (args: AxiosRequestConfig) => mockAxiosInstance(args),
  setAuthHandlers: vi.fn(),
  updateAccessToken: vi.fn(),
}));

describe('PreviewPlayer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAxiosInstance.mockReset();

    // Mock HTMLMediaElement prototype methods for JSDOM
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    window.HTMLMediaElement.prototype.pause = vi.fn();
    window.HTMLMediaElement.prototype.load = vi.fn();
  });

  it('renders loading initially and plays video when manifest is parsed', async () => {
    mockAxiosInstance.mockResolvedValue({ token: 'mock-token' });

    // Mock manifest parsed event trigger
    mockHls.on.mockImplementation((event, callback) => {
      if (event === 'manifestParsed') {
        callback();
      }
    });

    render(<PreviewPlayer videoId="video-123" />);

    await waitFor(() => {
      expect(mockAxiosInstance).toHaveBeenCalledWith(expect.objectContaining({
        url: '/admin/media/token/video-123',
      }));
      expect(mockHls.loadSource).toHaveBeenCalledWith('/media-api/stream/video-123/index.m3u8?token=mock-token');
    });
  });

  it('renders error message when playback token acquisition fails', async () => {
    mockAxiosInstance.mockRejectedValue(new Error('Auth error'));

    render(<PreviewPlayer videoId="video-123" />);

    await waitFor(() => {
      expect(screen.getByText('Could not acquire secure playback token')).toBeInTheDocument();
    });
  });
});
