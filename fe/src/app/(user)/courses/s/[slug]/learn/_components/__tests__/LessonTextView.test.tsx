import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { LessonTextView } from '../LessonTextView';
import React from 'react';

describe('LessonTextView Component', () => {
  const mockLessonDetails = {
    title: 'Test Lesson Title',
    text_content: 'This is the test lesson written content.',
  };

  it('renders title and content correctly', () => {
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

    expect(screen.getByText('Reading Material')).toBeInTheDocument();
    expect(screen.getByText('Test Lesson Title')).toBeInTheDocument();
    expect(screen.getByText('This is the test lesson written content.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mark as completed/i })).toBeInTheDocument();
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

    const completedBtn = screen.getByRole('button', { name: /completed/i });
    expect(completedBtn).toBeInTheDocument();

    fireEvent.click(completedBtn);
    expect(mockUpdateProgress).toHaveBeenCalledWith('les-1', 'COMPLETED');
  });
});
