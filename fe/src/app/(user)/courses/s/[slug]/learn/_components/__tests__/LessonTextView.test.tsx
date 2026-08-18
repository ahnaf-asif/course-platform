import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { LessonTextView } from '../LessonTextView';
import React from 'react';

const mockUser = {
  id: 'usr-445566',
  email: 'aspirant@eduverse.org',
  role: 'USER',
};

const mockUseAuthContext = vi.fn();

vi.mock('@/context/AuthContext', () => ({
  useAuthContext: () => mockUseAuthContext(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('LessonTextView Component', () => {
  const mockLessonDetails = {
    title: 'Test Lesson Title',
    text_content: 'This is the test lesson written content.',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthContext.mockReturnValue({ userEmail: 'aspirant@eduverse.org' });
  });

  it('renders title and content correctly with anti-copy styling', () => {
    const mockUpdateProgress = vi.fn();
    render(
      <LessonTextView
        lessonDetails={mockLessonDetails}
        selectedLessonId="les-1"
        currentTreeNode={{ progress_status: 'STARTED' }}
        updateProgress={mockUpdateProgress}
        isPendingProgress={false}
      />
    );

    expect(screen.getByText('লেকচার নোট ও রিভিশন শিট')).toBeInTheDocument();
    expect(screen.getByText('Test Lesson Title')).toBeInTheDocument();
    expect(screen.getByText(/This is the test lesson written content/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /পড়া সম্পন্ন হিসেবে চিহ্নিত করুন/i })).toBeInTheDocument();

    const container = screen.getByTestId('lesson-text-view-container');
    expect(container).toHaveStyle({ userSelect: 'none' });
  });

  it('renders completed status and triggers updateProgress on button click', () => {
    const mockUpdateProgress = vi.fn();
    render(
      <LessonTextView
        lessonDetails={mockLessonDetails}
        selectedLessonId="les-1"
        currentTreeNode={{ progress_status: 'COMPLETED' }}
        updateProgress={mockUpdateProgress}
        isPendingProgress={false}
      />
    );

    const completedBtn = screen.getByRole('button', { name: /পড়া সম্পন্ন হয়েছে/i });
    expect(completedBtn).toBeInTheDocument();

    fireEvent.click(completedBtn);
    expect(mockUpdateProgress).toHaveBeenCalledWith('les-1', 'COMPLETED');
  });

  it('prevents default on context menu and copy events', () => {
    const mockUpdateProgress = vi.fn();
    render(
      <LessonTextView
        lessonDetails={mockLessonDetails}
        selectedLessonId="les-1"
        currentTreeNode={{ progress_status: 'STARTED' }}
        updateProgress={mockUpdateProgress}
        isPendingProgress={false}
      />
    );

    const container = screen.getByTestId('lesson-text-view-container');

    const contextMenuEvent = fireEvent.contextMenu(container);
    expect(contextMenuEvent).toBe(false);

    const copyEvent = fireEvent.copy(container);
    expect(copyEvent).toBe(false);
  });
});
