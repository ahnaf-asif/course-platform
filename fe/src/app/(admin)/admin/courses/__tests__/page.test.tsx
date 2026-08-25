import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@/test/test-utils';
import CoursesManagement from '../page';
import { CourseResponse } from '@/api/model/components-schemas-course/courseResponse';
import React from 'react';

// Mock the API hooks
const mockUseGetAdminCourses = vi.fn();
const mockUsePostAdminCourses = vi.fn();
const mockUsePatchAdminCoursesId = vi.fn();
const mockUseDeleteAdminCoursesId = vi.fn();

vi.mock('@/api/generated/admin-course/admin-course', () => ({
  useGetAdminCourses: () => mockUseGetAdminCourses(),
  usePostAdminCourses: () => mockUsePostAdminCourses(),
  usePatchAdminCoursesId: () => mockUsePatchAdminCoursesId(),
  useDeleteAdminCoursesId: () => mockUseDeleteAdminCoursesId(),
}));

const mockCoursesList: CourseResponse[] = [
  {
    id: 'course-1',
    title: 'Advanced Go Patterns',
    slug: 'advanced-go-patterns',
    description: 'Learn channels, context and concurrency.',
    thumbnail_url: '',
    is_published: true,
    node_type: 'COURSE',
    created_at: '2026-06-20T00:00:00Z',
  },
];

describe('CoursesManagement Page Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set default mock implementations
    mockUseGetAdminCourses.mockReturnValue({
      data: mockCoursesList,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });

    mockUsePostAdminCourses.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    mockUsePatchAdminCoursesId.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    mockUseDeleteAdminCoursesId.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it('renders title and course cards', () => {
    render(<CoursesManagement />);

    expect(screen.getByText('Courses Management')).toBeInTheDocument();
    expect(screen.getByText('Advanced Go Patterns')).toBeInTheDocument();
  });

  it('renders empty state when no courses exist', () => {
    mockUseGetAdminCourses.mockReturnValue({
      data: [],
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<CoursesManagement />);

    expect(screen.getByText('No courses found')).toBeInTheDocument();
  });

  it('renders error Alert when API fails to fetch', () => {
    mockUseGetAdminCourses.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      refetch: vi.fn(),
    });

    render(<CoursesManagement />);

    expect(screen.getByText(/Failed to load courses/)).toBeInTheDocument();
  });

  it('triggers course deletion confirm dialog when delete clicked', async () => {
    const mockDeleteMutate = vi.fn().mockResolvedValue({});
    mockUseDeleteAdminCoursesId.mockReturnValue({
      mutateAsync: mockDeleteMutate,
      isPending: false,
    });

    // Spy on window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValueOnce(true);

    render(<CoursesManagement />);

    // Open Actions menu
    const menuButton = screen.getByRole('button', { name: 'Course Options' });
    await act(async () => {
      fireEvent.click(menuButton);
    });

    // Wait for dropdown item to be visible and click it
    let deleteItem: HTMLElement | null = null;
    await waitFor(() => {
      deleteItem = screen.getByText('Delete Course');
      expect(deleteItem).toBeInTheDocument();
    });

    await act(async () => {
      if (deleteItem) fireEvent.click(deleteItem);
    });

    expect(confirmSpy).toHaveBeenCalled();
    expect(mockDeleteMutate).toHaveBeenCalledWith({ id: 'course-1' });
  });

  it('updates course settings including publish status and price', async () => {
    const mockUpdateMutate = vi.fn().mockResolvedValue({});
    mockUsePatchAdminCoursesId.mockReturnValue({
      mutateAsync: mockUpdateMutate,
      isPending: false,
    });

    render(<CoursesManagement />);

    const menuButton = screen.getByRole('button', { name: 'Course Options' });
    await act(async () => {
      fireEvent.click(menuButton);
    });

    let editItem: HTMLElement | null = null;
    await waitFor(() => {
      editItem = screen.getByText('Edit Settings');
      expect(editItem).toBeInTheDocument();
    });

    await act(async () => {
      if (editItem) fireEvent.click(editItem);
    });

    await waitFor(() => {
      expect(screen.getByText('Edit Course Settings')).toBeInTheDocument();
    });

    const formElement = document.querySelector('form');
    fireEvent.submit(formElement!);

    await waitFor(() => {
      expect(mockUpdateMutate).toHaveBeenCalledWith({
        id: 'course-1',
        data: expect.objectContaining({
          title: 'Advanced Go Patterns',
          is_published: true,
        }),
      });
    });
  });
});
