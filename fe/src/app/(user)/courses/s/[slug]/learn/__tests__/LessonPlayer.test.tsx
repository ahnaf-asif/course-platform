import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@/test/test-utils';
import { LessonPlayer } from '../_components/LessonPlayer';
import React from 'react';

const mockUser = {
  id: 'usr-vid-99',
  email: 'video.student@eduverse.org',
  role: 'USER',
};

const mockUseAuthContext = vi.fn();

vi.mock('@/context/AuthContext', () => ({
  useAuthContext: () => mockUseAuthContext(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/lib/axios', () => ({
  axiosInstance: vi.fn().mockResolvedValue({ token: 'mock-media-token-xyz' }),
}));

vi.mock('hls.js', () => {
  const MockHls = vi.fn().mockImplementation(() => ({
    loadSource: vi.fn(),
    attachMedia: vi.fn(),
    on: vi.fn(),
    destroy: vi.fn(),
  }));
  (MockHls as any).isSupported = vi.fn().mockReturnValue(true);
  (MockHls as any).Events = {
    MANIFEST_PARSED: 'manifestParsed',
    ERROR: 'error',
  };
  return { default: MockHls };
});

describe('LessonPlayer Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthContext.mockReturnValue({ user: mockUser });
  });

  it('renders video element with anti-download and anti-picture-in-picture attributes', () => {
    render(<LessonPlayer videoId="vid-101" />);

    const videoEl = screen.getByTestId('lesson-video-element');
    expect(videoEl).toBeInTheDocument();
    expect(videoEl).toHaveAttribute('controlsList', 'nodownload noplaybackrate');
    expect(videoEl).toHaveAttribute('disablePictureInPicture');
  });

  it('prevents default right-click context menu on player container and video element', () => {
    render(<LessonPlayer videoId="vid-101" />);

    const container = screen.getByTestId('lesson-player-container');
    const contextMenuEvent = fireEvent.contextMenu(container);
    expect(contextMenuEvent).toBe(false);
  });

  it('renders dynamic video watermark overlay with user credentials', () => {
    render(<LessonPlayer videoId="vid-101" />);

    const watermark = screen.getByTestId('video-watermark');
    expect(watermark).toBeInTheDocument();
    expect(watermark).toHaveTextContent('video.student@eduverse.org');
  });

  it('displays security alert and halts when watermark tampering occurs', async () => {
    render(<LessonPlayer videoId="vid-101" />);

    const watermark = screen.getByTestId('video-watermark');
    expect(watermark).toBeInTheDocument();

    // Attacker removes watermark via DevTools
    act(() => {
      watermark.remove();
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(screen.getByTestId('player-tamper-warning')).toBeInTheDocument();
    expect(screen.getByText(/ভিডিও প্লেয়ার ও কন্টেন্ট সুরক্ষায় অননুমোদিত হস্তক্ষেপ ধরা পড়েছে/i)).toBeInTheDocument();
  });
});
