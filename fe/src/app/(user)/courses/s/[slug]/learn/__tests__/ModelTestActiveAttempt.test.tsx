import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { ModelTestActiveAttempt } from '../_components/ModelTestActiveAttempt';
import { StudentQuestionResponse } from '@/api/model/components-schemas-assessment/studentQuestionResponse';
import React, { useState } from 'react';

const mockQuestions: StudentQuestionResponse[] = [
  {
    id: 'q-1',
    quiz_id: 'quiz-model-1',
    content: 'Which article of Bangladesh Constitution deals with Fundamental Rights?',
    question_type: 'SINGLE',
    answers: [
      { id: 'ans-1', content: 'Part I' },
      { id: 'ans-2', content: 'Part III' },
      { id: 'ans-3', content: 'Part IV' },
    ],
  },
  {
    id: 'q-2',
    quiz_id: 'quiz-model-1',
    content: 'Which river is the longest in Bangladesh?',
    question_type: 'SINGLE',
    answers: [
      { id: 'ans-4', content: 'Padma' },
      { id: 'ans-5', content: 'Meghna' },
      { id: 'ans-6', content: 'Surma' },
    ],
  },
];

function TestWrapper({ initialQuestionIndex = 0 }: { initialQuestionIndex?: number }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialQuestionIndex);
  const [userAnswers, setUserAnswers] = useState<Record<string, string[]>>({});
  const mockSubmit = vi.fn();

  return (
    <ModelTestActiveAttempt
      activeQuizId="quiz-model-1"
      modelTest={{
        duration_minutes: 60,
        total_marks: 100,
        pass_marks: 40,
        negative_marking_rate: 0.5,
      }}
      modelTestTitle="45th BCS Preliminary Live Model Test"
      questionsData={mockQuestions}
      currentQuestionIndex={currentQuestionIndex}
      setCurrentQuestionIndex={setCurrentQuestionIndex}
      userAnswers={userAnswers}
      setUserAnswers={setUserAnswers}
      setIsAttempting={vi.fn()}
      submitAttemptMutation={{ mutate: mockSubmit, isPending: false }}
      setActiveAttempt={vi.fn()}
      refetchAttempts={vi.fn()}
      refetchTree={vi.fn()}
    />
  );
}

describe('ModelTestActiveAttempt component', () => {
  it('renders exam header, countdown timer, and question content correctly', () => {
    render(<TestWrapper initialQuestionIndex={0} />);

    expect(screen.getByText('45th BCS Preliminary Live Model Test')).toBeInTheDocument();
    expect(screen.getByText(/বাকি/)).toBeInTheDocument();
    expect(screen.getByText('প্রশ্ন 1 / 2')).toBeInTheDocument();
    expect(screen.getByText(/Which article of Bangladesh Constitution/)).toBeInTheDocument();
  });

  it('selects an answer and toggles bookmark for review', () => {
    render(<TestWrapper initialQuestionIndex={0} />);

    const opt2 = screen.getByText('Part III');
    fireEvent.click(opt2);

    const radios = screen.getAllByRole('radio');
    expect(radios[1]).toBeChecked();

    // Toggle mark for review
    const bookmarkBtn = screen.getByText('রিভিউয়ের জন্য রাখুন');
    fireEvent.click(bookmarkBtn);
    expect(screen.getByText('রিভিউ চিহ্নিত')).toBeInTheDocument();
  });

  it('navigates to next question and opens submission confirmation modal', () => {
    render(<TestWrapper initialQuestionIndex={0} />);

    const nextBtn = screen.getByRole('button', { name: /পরবর্তী প্রশ্ন/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText('প্রশ্ন 2 / 2')).toBeInTheDocument();
    expect(screen.getByText(/Which river is the longest/)).toBeInTheDocument();

    const submitBtns = screen.getAllByRole('button', { name: /জমা দিন/i });
    fireEvent.click(submitBtns[0]);

    expect(screen.getByText('মডেল টেস্ট জমা দিন')).toBeInTheDocument();
    expect(screen.getByText('নিশ্চিত ও জমা দিন')).toBeInTheDocument();
  });
});
