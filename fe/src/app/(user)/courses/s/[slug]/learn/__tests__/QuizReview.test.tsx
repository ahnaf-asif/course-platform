import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { QuizReview } from '../_components/QuizReview';
import React from 'react';

const mockUser = {
  id: 'usr-review-1',
  email: 'reviewer@eduverse.org',
  role: 'USER',
};

const mockUseAuthContext = vi.fn();

vi.mock('@/context/AuthContext', () => ({
  useAuthContext: () => mockUseAuthContext(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockAttempt = {
  id: 'att-1',
  user_id: 'usr-review-1',
  quiz_id: 'quiz-1',
  score: 80,
  passing_score: 70,
  is_passed: true,
  started_at: '2026-08-18T10:00:00Z',
  submitted_at: '2026-08-18T10:15:00Z',
  questions: [
    {
      id: 'q-1',
      content: '<p>বাংলা সাহিত্যের প্রাচীনতম নিদর্শন কোনটি?</p>',
      question_type: 'SINGLE',
      answer_options: [
        { id: 'ans-1', content: 'চর্যাপদ', is_correct: true },
        { id: 'ans-2', content: 'শ্রীকৃষ্ণকীর্তন', is_correct: false },
      ],
      user_answers: ['ans-1'],
      is_correct: true,
      explanation: 'চর্যাপদ বাংলা ভাষার প্রাচীনতম কাব্য তথা গান সংকলন।',
    },
  ],
};

describe('QuizReview Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuthContext.mockReturnValue({ userEmail: 'reviewer@eduverse.org' });
  });

  it('renders score and question explanations with anti-copy styling', () => {
    render(<QuizReview activeAttempt={mockAttempt as any} setActiveAttempt={vi.fn()} />);

    expect(screen.getByText('Quiz Passed!')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText(/বাংলা সাহিত্যের প্রাচীনতম নিদর্শন/i)).toBeInTheDocument();
    expect(screen.getByText(/চর্যাপদ বাংলা ভাষার প্রাচীনতম/i)).toBeInTheDocument();

    const container = screen.getByTestId('quiz-review-container');
    expect(container).toHaveStyle({ userSelect: 'none' });
  });

  it('suppresses context menu and copy events on review container', () => {
    render(<QuizReview activeAttempt={mockAttempt as any} setActiveAttempt={vi.fn()} />);

    const container = screen.getByTestId('quiz-review-container');

    const contextMenuEvent = fireEvent.contextMenu(container);
    expect(contextMenuEvent).toBe(false);

    const copyEvent = fireEvent.copy(container);
    expect(copyEvent).toBe(false);
  });

  it('renders watermark overlay across review questions', () => {
    render(<QuizReview activeAttempt={mockAttempt as any} setActiveAttempt={vi.fn()} />);

    expect(screen.getByTestId('reading-watermark')).toBeInTheDocument();
  });
});
