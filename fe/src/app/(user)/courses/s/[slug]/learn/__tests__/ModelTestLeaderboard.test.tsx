import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { ModelTestLeaderboard } from '../_components/ModelTestLeaderboard';
import * as assessmentApi from '@/api/generated/assessment/assessment';

vi.mock('@/api/generated/assessment/assessment', () => ({
  useStudentGetQuizLeaderboard: vi.fn(),
}));

describe('ModelTestLeaderboard component', () => {
  it('renders loading state', () => {
    vi.mocked(assessmentApi.useStudentGetQuizLeaderboard).mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    } as unknown as ReturnType<typeof assessmentApi.useStudentGetQuizLeaderboard>);

    render(<ModelTestLeaderboard quizId="test-quiz-id" />);
    expect(screen.getByText('লিডারবোর্ড লোড হচ্ছে...')).toBeInTheDocument();
  });

  it('renders top participants with rank medals and personal ranking highlight', () => {
    vi.mocked(assessmentApi.useStudentGetQuizLeaderboard).mockReturnValue({
      data: {
        quiz_id: 'test-quiz-id',
        quiz_title: 'BCS Model Test 1',
        total_participants: 5,
        my_rank: {
          rank_position: 1,
          attempt_id: 'att-1',
          user_id: 'user-1',
          user_name: 'Shafin Asif',
          avatar_url: null,
          score: 95.5,
          correct_count: 96,
          wrong_count: 1,
          unanswered_count: 3,
          total_negative_marks: 0.5,
          time_spent_seconds: 1400,
          completed_at: '2026-08-25T10:00:00Z',
          is_current_user: true,
        },
        entries: [
          {
            rank_position: 1,
            attempt_id: 'att-1',
            user_id: 'user-1',
            user_name: 'Shafin Asif',
            avatar_url: null,
            score: 95.5,
            correct_count: 96,
            wrong_count: 1,
            unanswered_count: 3,
            total_negative_marks: 0.5,
            time_spent_seconds: 1400,
            completed_at: '2026-08-25T10:00:00Z',
            is_current_user: true,
          },
          {
            rank_position: 2,
            attempt_id: 'att-2',
            user_id: 'user-2',
            user_name: 'Rahim Khan',
            avatar_url: null,
            score: 88.0,
            correct_count: 90,
            wrong_count: 4,
            unanswered_count: 6,
            total_negative_marks: 2.0,
            time_spent_seconds: 1700,
            completed_at: '2026-08-25T10:30:00Z',
            is_current_user: false,
          },
        ],
      },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof assessmentApi.useStudentGetQuizLeaderboard>);

    render(<ModelTestLeaderboard quizId="test-quiz-id" />);

    expect(screen.getByText('🏆 অফিশিয়াল র‍্যাংক লিস্ট')).toBeInTheDocument();
    expect(screen.getByText('মোট পরীক্ষার্থী: 5 জন')).toBeInTheDocument();
    expect(screen.getByTestId('my-rank-banner')).toBeInTheDocument();
    expect(screen.getByText('র‍্যাংক #1')).toBeInTheDocument();
    expect(screen.getByText('Shafin Asif')).toBeInTheDocument();
    expect(screen.getByText('Rahim Khan')).toBeInTheDocument();
    expect(screen.getByText('🥇 ১ম স্থান')).toBeInTheDocument();
    expect(screen.getByText('🥈 ২য় স্থান')).toBeInTheDocument();
  });
});
