import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { ModelTestReview } from '../_components/ModelTestReview';
import { SubmitQuizResponse } from '@/api/model/components-schemas-assessment/submitQuizResponse';

const mockAttempt: SubmitQuizResponse = {
  attempt_id: 'att-123',
  score: 49.5,
  is_passed: true,
  passing_score: 40,
  time_spent_seconds: 720,
  total_questions: 2,
  correct_count: 1,
  wrong_count: 1,
  unanswered_count: 0,
  total_negative_marks: 0.5,
  is_first_attempt: true,
  rank_position: 1,
  completed_at: '2026-08-25T11:00:00Z',
  questions: [
    {
      id: 'q-1',
      content: 'What is the capital of Bangladesh?',
      question_type: 'SINGLE',
      explanation: 'Dhaka was established as the capital in 1610.',
      is_correct: true,
      user_answers: ['ans-dhaka'],
      answer_options: [
        { id: 'ans-dhaka', content: 'Dhaka', is_correct: true },
        { id: 'ans-ctg', content: 'Chittagong', is_correct: false },
      ],
    },
    {
      id: 'q-2',
      content: 'What is the currency of Japan?',
      question_type: 'SINGLE',
      explanation: 'The official currency of Japan is the Japanese Yen (JPY).',
      is_correct: false,
      user_answers: ['ans-won'],
      answer_options: [
        { id: 'ans-yen', content: 'Yen', is_correct: true },
        { id: 'ans-won', content: 'Won', is_correct: false },
      ],
    },
  ],
};

describe('ModelTestReview component', () => {
  it('renders scorecard, negative mark deduction, and explanation sections', () => {
    const handleRetake = vi.fn();
    const handleViewLeaderboard = vi.fn();

    render(
      <ModelTestReview
        activeAttempt={mockAttempt}
        setActiveAttempt={vi.fn()}
        onRetake={handleRetake}
        onViewLeaderboard={handleViewLeaderboard}
      />
    );

    expect(screen.getByText('মডেল টেস্ট মূল্যায়ন ফলাফল')).toBeInTheDocument();
    expect(screen.getByText('49.50')).toBeInTheDocument();
    expect(screen.getByText('উত্তীর্ণ (Passed)')).toBeInTheDocument();
    expect(screen.getByText('-0.50')).toBeInTheDocument();
    expect(screen.getByText(/Dhaka was established as the capital/)).toBeInTheDocument();
    expect(screen.getByText(/The official currency of Japan is the Japanese Yen/)).toBeInTheDocument();

    const retakeBtn = screen.getByRole('button', { name: /পুনরায় পরীক্ষা দিন/i });
    fireEvent.click(retakeBtn);
    expect(handleRetake).toHaveBeenCalledTimes(1);
  });
});
