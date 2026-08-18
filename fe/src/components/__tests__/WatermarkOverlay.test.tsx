import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@/test/test-utils';
import { WatermarkOverlay } from '../WatermarkOverlay';
import React from 'react';

const mockUser = {
  id: 'usr-12345',
  email: 'student.protect@eduverse.org',
  role: 'USER',
};

const mockUseAuthContext = vi.fn();

vi.mock('@/context/AuthContext', () => ({
  useAuthContext: () => mockUseAuthContext(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('WatermarkOverlay Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders video watermark with user email and shifting coordinates', () => {
    mockUseAuthContext.mockReturnValue({ user: mockUser });

    render(<WatermarkOverlay variant="video" />);

    const watermark = screen.getByTestId('video-watermark');
    expect(watermark).toBeInTheDocument();
    expect(watermark).toHaveTextContent('student.protect@eduverse.org');
    expect(watermark).toHaveStyle({ userSelect: 'none' });
  });

  it('renders reading watermark with repeating tiled text for reading notes', () => {
    mockUseAuthContext.mockReturnValue({ user: mockUser });

    render(<WatermarkOverlay variant="reading" />);

    const watermark = screen.getByTestId('reading-watermark');
    expect(watermark).toBeInTheDocument();
    expect(watermark).toHaveTextContent('student.protect@eduverse.org');
  });

  it('falls back to default protection label when no user is logged in', () => {
    mockUseAuthContext.mockReturnValue({ user: null });

    render(<WatermarkOverlay variant="video" />);

    const watermark = screen.getByTestId('video-watermark');
    expect(watermark).toHaveTextContent('EduVerse Protected Content');
  });

  it('triggers onTamper callback when watermark node is removed from DOM', async () => {
    mockUseAuthContext.mockReturnValue({ user: mockUser });
    const onTamper = vi.fn();

    const { container } = render(
      <div id="parent-container">
        <WatermarkOverlay variant="video" onTamper={onTamper} />
      </div>
    );

    const watermark = screen.getByTestId('video-watermark');
    expect(watermark).toBeInTheDocument();

    // Simulate attacker deleting watermark element via DevTools
    act(() => {
      watermark.remove();
    });

    // Allow MutationObserver callback to run
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(onTamper).toHaveBeenCalled();
  });

  it('triggers onTamper callback when watermark style is altered to display: none', async () => {
    mockUseAuthContext.mockReturnValue({ user: mockUser });
    const onTamper = vi.fn();

    render(
      <div id="parent-wrapper">
        <WatermarkOverlay variant="video" onTamper={onTamper} />
      </div>
    );

    const watermark = screen.getByTestId('video-watermark');

    // Simulate attacker setting display: none via DevTools
    act(() => {
      watermark.style.display = 'none';
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(onTamper).toHaveBeenCalled();
  });
});
