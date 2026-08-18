import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { QuizActiveAttempt } from '../_components/QuizActiveAttempt';
import { StudentQuestionResponse } from '@/api/model/components-schemas-assessment/studentQuestionResponse';
import React, { useState } from 'react';

const mockQuestions: StudentQuestionResponse[] = [
  {
    id: 'q-single',
    quiz_id: 'quiz-1',
    content: 'What is 2 + 2?',
    question_type: 'SINGLE',
    answers: [
      { id: 'ans-1', content: '3' },
      { id: 'ans-2', content: '4' },
      { id: 'ans-3', content: '5' },
    ],
  },
  {
    id: 'q-multi',
    quiz_id: 'quiz-1',
    content: 'Which of the following are prime numbers?',
    question_type: 'MULTIPLE',
    answers: [
      { id: 'ans-a', content: '2' },
      { id: 'ans-b', content: '3' },
      { id: 'ans-c', content: '4' },
      { id: 'ans-d', content: '5' },
    ],
  },
];

function TestWrapper({ initialQuestionIndex = 0 }: { initialQuestionIndex?: number }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialQuestionIndex);
  const [userAnswers, setUserAnswers] = useState<Record<string, string[]>>({});

  return (
    <QuizActiveAttempt
      activeQuizId="quiz-1"
      questionsData={mockQuestions}
      currentQuestionIndex={currentQuestionIndex}
      setCurrentQuestionIndex={setCurrentQuestionIndex}
      userAnswers={userAnswers}
      setUserAnswers={setUserAnswers}
      setIsAttempting={vi.fn()}
      submitAttemptMutation={{ mutate: vi.fn(), isPending: false }}
      setActiveAttempt={vi.fn()}
      refetchAttempts={vi.fn()}
      refetchTree={vi.fn()}
    />
  );
}

describe('QuizActiveAttempt component', () => {
  it('handles single select question: only one option selected at a time', () => {
    render(<TestWrapper initialQuestionIndex={0} />);

    expect(screen.getByText('একক উত্তর')).toBeInTheDocument();
    expect(screen.getByText('What is 2 + 2?')).toBeInTheDocument();

    const opt1 = screen.getByText('3');
    const opt2 = screen.getByText('4');

    // Select first option
    fireEvent.click(opt1);
    const radio1 = screen.getAllByRole('radio')[0];
    expect(radio1).toBeChecked();

    // Select second option - should replace the first
    fireEvent.click(opt2);
    const radio2 = screen.getAllByRole('radio')[1];
    expect(radio2).toBeChecked();
    expect(radio1).not.toBeChecked();
  });

  it('handles multi-select question: multiple options can be toggled on and off', () => {
    render(<TestWrapper initialQuestionIndex={1} />);

    expect(screen.getByText('বহুনির্বাচনী (একাধিক উত্তর)')).toBeInTheDocument();
    expect(screen.getByText('Which of the following are prime numbers?')).toBeInTheDocument();

    const optA = screen.getByText('2');
    const optB = screen.getByText('3');
    const optC = screen.getByText('4');

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(4);

    // Select option A
    fireEvent.click(optA);
    expect(checkboxes[0]).toBeChecked();

    // Select option B
    fireEvent.click(optB);
    expect(checkboxes[0]).toBeChecked();
    expect(checkboxes[1]).toBeChecked();

    // Deselect option A
    fireEvent.click(optA);
    expect(checkboxes[0]).not.toBeChecked();
    expect(checkboxes[1]).toBeChecked();

    // Select option C
    fireEvent.click(optC);
    expect(checkboxes[1]).toBeChecked();
    expect(checkboxes[2]).toBeChecked();
  });
});
