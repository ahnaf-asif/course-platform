import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import CourseCurriculumPage from '../page';
import React from 'react';

const mockUseGetCourseTreeBySlug = vi.fn();
const mockUsePostAdminSubjects = vi.fn();
const mockUsePatchAdminSubjectsId = vi.fn();
const mockUseDeleteAdminSubjectsId = vi.fn();

const mockUsePostAdminChapters = vi.fn();
const mockUsePatchAdminChaptersId = vi.fn();
const mockUseDeleteAdminChaptersId = vi.fn();

const mockUsePostAdminLessons = vi.fn();
const mockUsePatchAdminLessonsId = vi.fn();
const mockUseDeleteAdminLessonsId = vi.fn();

const mockUseCreateModelTest = vi.fn();
const mockUseUpdateModelTest = vi.fn();
const mockUseDeleteModelTest = vi.fn();

vi.mock('@/api/generated/course/course', () => ({
  useGetCourseTreeBySlug: (slug: string) => mockUseGetCourseTreeBySlug(slug),
}));

vi.mock('@/api/generated/admin-curriculum/admin-curriculum', () => ({
  usePostAdminSubjects: () => mockUsePostAdminSubjects(),
  usePatchAdminSubjectsId: () => mockUsePatchAdminSubjectsId(),
  useDeleteAdminSubjectsId: () => mockUseDeleteAdminSubjectsId(),
  usePostAdminChapters: () => mockUsePostAdminChapters(),
  usePatchAdminChaptersId: () => mockUsePatchAdminChaptersId(),
  useDeleteAdminChaptersId: () => mockUseDeleteAdminChaptersId(),
  usePostAdminLessons: () => mockUsePostAdminLessons(),
  usePatchAdminLessonsId: () => mockUsePatchAdminLessonsId(),
  useDeleteAdminLessonsId: () => mockUseDeleteAdminLessonsId(),
  useCreateModelTest: () => mockUseCreateModelTest(),
  useUpdateModelTest: () => mockUseUpdateModelTest(),
  useDeleteModelTest: () => mockUseDeleteModelTest(),
}));

const mockPush = vi.fn();
const mockParams = { id: 'go-course' };
vi.mock('next/navigation', () => ({
  useParams: () => mockParams,
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('CourseCurriculumPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseGetCourseTreeBySlug.mockReturnValue({
      data: [
        { id: 'course-1', title: 'Go course', node_type: 'COURSE', level: 0, parent_id: null, sequence_order: 0 },
        { id: 'sub-1', title: 'Subject One', node_type: 'SUBJECT', level: 1, parent_id: 'course-1', sequence_order: 0 },
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    mockUsePostAdminSubjects.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUsePatchAdminSubjectsId.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUseDeleteAdminSubjectsId.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    mockUsePostAdminChapters.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUsePatchAdminChaptersId.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUseDeleteAdminChaptersId.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    mockUsePostAdminLessons.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUsePatchAdminLessonsId.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUseDeleteAdminLessonsId.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    mockUseCreateModelTest.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUseUpdateModelTest.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    mockUseDeleteModelTest.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it('renders page headers and nodes list correctly', () => {
    render(<CourseCurriculumPage />);

    expect(screen.getByText('Curriculum Editor')).toBeInTheDocument();
    expect(screen.getByText('Manage Content')).toBeInTheDocument();
    expect(screen.getByText('Subject One')).toBeInTheDocument();
  });

  it('renders empty curriculum message when no nodes exist', () => {
    mockUseGetCourseTreeBySlug.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<CourseCurriculumPage />);

    expect(screen.getByText('Your curriculum is empty')).toBeInTheDocument();
  });
});
