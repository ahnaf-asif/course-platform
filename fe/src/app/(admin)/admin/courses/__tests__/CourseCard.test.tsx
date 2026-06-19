import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@/test/test-utils';
import { CourseCard } from '../CourseCard';
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
  created_at: '2026-06-20T00:00:00Z',
};

describe('CourseCard Component', () => {
  it('should render course details correctly', () => {
    render(
      <CourseCard
        course={mockCourse}
        onEditSettings={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Test Course Title')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('slug: test-course-title')).toBeInTheDocument();
    expect(screen.getByText('This is a long enough test description for the course card.')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/media-api/p/thumbnail.png');
  });

  it('should display draft badge when course is unpublished', () => {
    const draftCourse = { ...mockCourse, is_published: false };
    render(
      <CourseCard
        course={draftCourse}
        onEditSettings={vi.fn()}
        onDelete={vi.fn()}
      />
    );

    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('should trigger onEditSettings when clicking edit settings menu item', async () => {
    const mockOnEdit = vi.fn();
    render(
      <CourseCard
        course={mockCourse}
        onEditSettings={mockOnEdit}
        onDelete={vi.fn()}
      />
    );

    // Open Menu dropdown
    const menuButton = screen.getByRole('button', { name: 'Course Options' });
    await act(async () => {
      fireEvent.click(menuButton);
    });

    // Wait for the dropdown and click Edit Settings
    let editItem: HTMLElement | null = null;
    await waitFor(() => {
      editItem = screen.getByText('Edit Settings');
      expect(editItem).toBeInTheDocument();
    });

    await act(async () => {
      if (editItem) fireEvent.click(editItem);
    });

    expect(mockOnEdit).toHaveBeenCalledWith(mockCourse);
  });

  it('should trigger onDelete when clicking delete menu item', async () => {
    const mockOnDelete = vi.fn();
    render(
      <CourseCard
        course={mockCourse}
        onEditSettings={vi.fn()}
        onDelete={mockOnDelete}
      />
    );

    // Open Menu dropdown
    const menuButton = screen.getByRole('button', { name: 'Course Options' });
    await act(async () => {
      fireEvent.click(menuButton);
    });

    // Wait for the dropdown and click Delete Course
    let deleteItem: HTMLElement | null = null;
    await waitFor(() => {
      deleteItem = screen.getByText('Delete Course');
      expect(deleteItem).toBeInTheDocument();
    });

    await act(async () => {
      if (deleteItem) fireEvent.click(deleteItem);
    });

    expect(mockOnDelete).toHaveBeenCalledWith('course-1');
  });
});

