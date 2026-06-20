import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { QuestionEditForm } from '../QuestionEditForm';
import { EditFormValues } from '../types';
import { useForm } from '@mantine/form';
import React from 'react';

// Mock ProseMirror/Tiptap requirements in jsdom
beforeAll(() => {
  if (typeof window !== 'undefined') {
    window.getSelection = () => ({
      addRange: () => {},
      removeAllRanges: () => {},
      getRangeAt: () => ({
        getBoundingClientRect: () => ({
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: 0,
          height: 0,
          x: 0,
          y: 0,
          toJSON: () => {},
        } as DOMRect),
      }),
    } as unknown as Selection);

    class MockRange {
      getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: 0,
          height: 0,
          x: 0,
          y: 0,
          toJSON: () => {},
        } as DOMRect;
      }
      getClientRects() {
        return [] as unknown as DOMRectList;
      }
    }

    Object.defineProperty(window, 'Range', {
      writable: true,
      configurable: true,
      value: MockRange,
    });
  }
});

function TestFormWrapper(props: Partial<React.ComponentProps<typeof QuestionEditForm>>) {
  const editForm = useForm<EditFormValues>({
    initialValues: {
      id: 'q-1',
      content: 'What is CSS?',
      explanation: '<p>Explanation here</p>',
      question_type: 'SINGLE',
      sequence_order: 1,
      answers: [
        { content: 'Cascading Style Sheets', is_correct: true },
        { content: 'Creative Style Sheets', is_correct: false },
      ],
    },
  });

  return (
    <QuestionEditForm
      index={0}
      editForm={editForm}
      handleUpdateSubmit={vi.fn()}
      setEditingId={vi.fn()}
      isUpdating={false}
      {...props}
    />
  );
}

describe('QuestionEditForm Component', () => {
  it('renders form fields with initial values', () => {
    render(<TestFormWrapper />);

    expect(screen.getByText('Editing Question #1')).toBeInTheDocument();
    expect(screen.getByDisplayValue('What is CSS?')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Cascading Style Sheets')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Creative Style Sheets')).toBeInTheDocument();
  });

  it('calls setEditingId(null) when close button is clicked', () => {
    const mockSetEditingId = vi.fn();
    const { container } = render(<TestFormWrapper setEditingId={mockSetEditingId} />);

    const closeBtn = container.querySelector('.tabler-icon-x')?.closest('button');
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn!);

    expect(mockSetEditingId).toHaveBeenCalledWith(null);
  });

  it('calls setEditingId(null) when Cancel is clicked', () => {
    const mockSetEditingId = vi.fn();
    render(<TestFormWrapper setEditingId={mockSetEditingId} />);

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelBtn);

    expect(mockSetEditingId).toHaveBeenCalledWith(null);
  });

  it('submits form values on submit', async () => {
    const mockSubmit = vi.fn();
    render(<TestFormWrapper handleUpdateSubmit={mockSubmit} />);

    const submitBtn = screen.getByRole('button', { name: 'Save Changes' });
    fireEvent.click(submitBtn);

    // form.onSubmit fires mockSubmit
    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'What is CSS?',
        id: 'q-1',
        answers: [
          { content: 'Cascading Style Sheets', is_correct: true },
          { content: 'Creative Style Sheets', is_correct: false },
        ],
      }),
      expect.any(Object)
    );
  });

  it('adds an option when Add Option is clicked', () => {
    render(<TestFormWrapper />);

    const addOptionBtn = screen.getByRole('button', { name: 'Add Option' });
    fireEvent.click(addOptionBtn);

    // Should now show an empty placeholder/input for Option 3
    expect(screen.getByPlaceholderText('Option 3')).toBeInTheDocument();
  });

  it('removes an option when trash icon is clicked', () => {
    // Render with 3 options so the trash icon is visible
    function TestFormWrapperThreeOptions() {
      const editForm = useForm<EditFormValues>({
        initialValues: {
          id: 'q-1',
          content: 'What is CSS?',
          explanation: '',
          question_type: 'SINGLE',
          sequence_order: 1,
          answers: [
            { content: 'A', is_correct: true },
            { content: 'B', is_correct: false },
            { content: 'C', is_correct: false },
          ],
        },
      });

      return (
        <QuestionEditForm
          index={0}
          editForm={editForm}
          handleUpdateSubmit={vi.fn()}
          setEditingId={vi.fn()}
          isUpdating={false}
        />
      );
    }

    const { container } = render(<TestFormWrapperThreeOptions />);

    expect(screen.getByDisplayValue('A')).toBeInTheDocument();

    const trashBtn = container.querySelector('.tabler-icon-trash')?.closest('button');
    expect(trashBtn).toBeInTheDocument();
    fireEvent.click(trashBtn!);

    expect(screen.queryByDisplayValue('A')).not.toBeInTheDocument();
  });
});
