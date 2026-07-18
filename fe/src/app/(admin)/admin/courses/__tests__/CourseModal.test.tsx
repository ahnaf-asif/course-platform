import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import { CourseModal } from '../CourseModal';
import { CourseResponse } from '@/api/model/components-schemas-course/courseResponse';
import React from 'react';

const mockCourse: CourseResponse = {
  id: 'course-1',
  title: 'Test Course Title',
  slug: 'test-course-title',
  description: 'This is a long enough test description for the course card.',
  thumbnail_url: '/media-api/p/thumbnail.png',
  is_published: true,
  node_type: 'COURSE',
  price: '1200.00',
  currency: 'BDT',
  created_at: '2026-06-20T00:00:00Z',
};

describe('CourseModal Component', () => {
  it('should render creation fields when course prop is null', () => {
    render(
      <CourseModal
        opened={true}
        onClose={vi.fn()}
        course={null}
        onSubmit={vi.fn()}
        loading={false}
      />
    );

    expect(screen.getByText('Create New Course')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Mastering Advanced Go')).toHaveValue('');
    expect(screen.getByPlaceholderText('e.g. mastering-advanced-go')).toHaveValue('');
    expect(screen.getByPlaceholderText('e.g. 1500.00 (leave empty for free)')).toHaveValue('');
  });

  it('should populate fields when course prop is provided', () => {
    render(
      <CourseModal
        opened={true}
        onClose={vi.fn()}
        course={mockCourse}
        onSubmit={vi.fn()}
        loading={false}
      />
    );

    expect(screen.getByText('Edit Course Settings')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Mastering Advanced Go')).toHaveValue('Test Course Title');
    expect(screen.getByPlaceholderText('e.g. mastering-advanced-go')).toHaveValue('test-course-title');
    expect(screen.getByPlaceholderText('Provide a brief overview of the course content...')).toHaveValue(
      'This is a long enough test description for the course card.'
    );
    expect(screen.getByPlaceholderText('e.g. 1500.00 (leave empty for free)')).toHaveValue('1200.00');
  });

  it('should show validation errors when fields are invalid and submitted', async () => {
    render(
      <CourseModal
        opened={true}
        onClose={vi.fn()}
        course={null}
        onSubmit={vi.fn()}
        loading={false}
      />
    );

    // Enter short title
    const titleInput = screen.getByPlaceholderText('e.g. Mastering Advanced Go');
    fireEvent.change(titleInput, { target: { value: 'Go' } });

    // Enter invalid price
    const priceInput = screen.getByPlaceholderText('e.g. 1500.00 (leave empty for free)');
    fireEvent.change(priceInput, { target: { value: 'not-a-number' } });

    // Submit form directly
    const formElement = document.querySelector('form');
    fireEvent.submit(formElement!);

    await waitFor(() => {
      expect(screen.getByText('Title must be at least 3 characters')).toBeInTheDocument();
      expect(screen.getByText('Price must be a valid number')).toBeInTheDocument();
    });
  });

  it('should call onSubmit with values when submission is valid', async () => {
    const mockOnSubmit = vi.fn();
    render(
      <CourseModal
        opened={true}
        onClose={vi.fn()}
        course={null}
        onSubmit={mockOnSubmit}
        loading={false}
      />
    );

    // Populate valid fields
    fireEvent.change(screen.getByPlaceholderText('e.g. Mastering Advanced Go'), {
      target: { value: 'Learning Rust' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. mastering-advanced-go'), {
      target: { value: 'learning-rust' },
    });
    fireEvent.change(screen.getByPlaceholderText('Provide a brief overview of the course content...'), {
      target: { value: 'This is a description of the course content that satisfies validation.' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. 1500.00 (leave empty for free)'), {
      target: { value: '1500.00' },
    });

    // Submit form directly
    const formElement = document.querySelector('form');
    fireEvent.submit(formElement!);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          title: 'Learning Rust',
          slug: 'learning-rust',
          description: 'This is a description of the course content that satisfies validation.',
          price: '1500.00',
          currency: 'BDT',
        })
      );
    });
  });
});
