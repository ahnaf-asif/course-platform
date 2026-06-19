import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { QuestionCard, EditFormValues } from '../QuestionCard';
import { useForm } from '@mantine/form';
import React from 'react';
import { QuestionResponse } from '@/api/model/components-schemas-assessment/questionResponse';

const mockQuestion: QuestionResponse = {
  id: 'q-1',
  quiz_id: 'quiz-1',
  content: 'What is HTML?',
  explanation: 'HTML stands for HyperText Markup Language',
  question_type: 'SINGLE',
  sequence_order: 0,
  answers: [
    { content: 'A programming language', is_correct: false },
    { content: 'A markup language', is_correct: true },
  ],
};

// Wrapper component to manage useForm state and pass it down
function QuestionCardWrapper({ editingId }: { editingId: string | null }) {
  const editForm = useForm<EditFormValues>({
    initialValues: {
      id: mockQuestion.id,
      content: mockQuestion.content,
      explanation: mockQuestion.explanation || '',
      question_type: mockQuestion.question_type,
      sequence_order: mockQuestion.sequence_order,
      answers: mockQuestion.answers.map((a) => ({ content: a.content, is_correct: a.is_correct })),
    },
  });

  return (
    <QuestionCard
      q={mockQuestion}
      index={0}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      editingId={editingId}
      editForm={editForm}
      handleUpdateSubmit={vi.fn()}
      setEditingId={vi.fn()}
      isUpdating={false}
    />
  );
}

describe('QuestionCard Component', () => {
  it('renders read-only view of question content and answer options', () => {
    render(<QuestionCardWrapper editingId={null} />);

    expect(screen.getAllByText('What is HTML?')[0]).toBeInTheDocument();
    expect(screen.getByText('A markup language')).toBeInTheDocument();
  });

  it('renders form editor view when editingId matches question ID', () => {
    render(<QuestionCardWrapper editingId="q-1" />);

    expect(screen.getByText('Question Content')).toBeInTheDocument();
    expect(screen.getByDisplayValue('What is HTML?')).toBeInTheDocument();
  });
});
