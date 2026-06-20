import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { QuestionCard } from '../QuestionCard';
import { EditFormValues } from '../types';
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

function QuestionCardTestContainer(props: Partial<React.ComponentProps<typeof QuestionCard>>) {
  const defaultEditForm = useForm<EditFormValues>({
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
      editingId={null}
      editForm={defaultEditForm}
      handleUpdateSubmit={vi.fn()}
      setEditingId={vi.fn()}
      isUpdating={false}
      {...props}
    />
  );
}

describe('QuestionCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders read-only view of question content and answer options', () => {
    render(<QuestionCardTestContainer />);

    expect(screen.getAllByText('What is HTML?')[0]).toBeInTheDocument();
    expect(screen.getByText('Answer Options:')).toBeInTheDocument();
  });

  it('renders form editor view when editingId matches question ID', () => {
    render(<QuestionCardTestContainer editingId="q-1" />);

    expect(screen.getByText('Question Content')).toBeInTheDocument();
    expect(screen.getByDisplayValue('What is HTML?')).toBeInTheDocument();
  });

  it('toggles expansion when clicking the card header', () => {
    render(<QuestionCardTestContainer />);

    // Click the card header area
    const clickableBox = screen.getAllByText('What is HTML?')[0].closest('div');
    expect(clickableBox).toBeInTheDocument();

    fireEvent.click(clickableBox!);

    // Answers section should now be visible
    expect(screen.getByText('Answer Options:')).toBeInTheDocument();
    expect(screen.getByText('A markup language')).toBeInTheDocument();
    expect(screen.getByText('A programming language')).toBeInTheDocument();

    // Click again to collapse
    fireEvent.click(clickableBox!);
    // Since Collapse component is used, wait to see if it closes or check visibility state
  });

  it('calls onEdit when clicking the edit pencil icon', () => {
    const mockOnEdit = vi.fn();
    render(<QuestionCardTestContainer onEdit={mockOnEdit} />);

    const buttons = screen.getAllByRole('button');
    const editButton = buttons[0];
    fireEvent.click(editButton);

    expect(mockOnEdit).toHaveBeenCalledWith(mockQuestion);
  });

  it('calls onDelete when clicking the delete trash icon', () => {
    const mockOnDelete = vi.fn();
    render(<QuestionCardTestContainer onDelete={mockOnDelete} />);

    const buttons = screen.getAllByRole('button');
    const deleteButton = buttons[1];
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith('q-1');
  });

  it('toggles explanation block when clicking explanation button', () => {
    render(<QuestionCardTestContainer />);

    // First expand the card
    const clickableBox = screen.getAllByText('What is HTML?')[0].closest('div');
    fireEvent.click(clickableBox!);

    const explanationButton = screen.getByText('Explanation');
    expect(explanationButton).toBeInTheDocument();

    // Explanation text should initially not be visible or hidden in collapse
    fireEvent.click(explanationButton);
    expect(screen.getByText('HTML stands for HyperText Markup Language')).toBeInTheDocument();
  });
});
