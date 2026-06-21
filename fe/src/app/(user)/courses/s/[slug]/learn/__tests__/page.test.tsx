import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@/test/test-utils';
import CoursePlayerPage from '../page';
import React from 'react';

const mockUseGetCourseBySlug = vi.fn();
const mockUseGetCourseTreeBySlug = vi.fn();
const mockUseCheckAccess = vi.fn();
const mockUseGetUserLesson = vi.fn();
const mockUseGetMe = vi.fn();
const mockPush = vi.fn();
const mockAxiosInstance = vi.fn();

vi.mock('@/api/generated/course/course', () => ({
  useGetCourseBySlug: (slug: string) => mockUseGetCourseBySlug(slug),
  useGetCourseTreeBySlug: (slug: string) => mockUseGetCourseTreeBySlug(slug),
}));

vi.mock('@/api/generated/commerce/commerce', () => ({
  useCheckAccess: (slug: string) => mockUseCheckAccess(slug),
  useGetUserLesson: (id: string) => mockUseGetUserLesson(id),
}));

vi.mock('@/api/generated/user/user', () => ({
  useGetMe: () => mockUseGetMe(),
}));

vi.mock('@/lib/axios', () => ({
  axiosInstance: (args: unknown) => mockAxiosInstance(args),
  setAuthHandlers: vi.fn(),
  updateAccessToken: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'test-course' }),
  useRouter: () => ({ push: mockPush }),
}));

describe('CoursePlayerPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAxiosInstance.mockReset();

    mockUseGetMe.mockReturnValue({ data: { id: 'user-1' }, isLoading: false });
    mockUseGetCourseBySlug.mockReturnValue({ data: { id: 'course-1', title: 'Go Course' }, isLoading: false });
    mockUseGetCourseTreeBySlug.mockReturnValue({
      data: [
        { id: 'sub-1', title: 'Subject 1', level: 1, node_type: 'SUBJECT' },
        { id: 'chap-1', title: 'Chapter 1', level: 2, parent_id: 'sub-1', node_type: 'CHAPTER' },
        { id: 'les-1', title: 'Lesson 1', level: 3, parent_id: 'chap-1', node_type: 'LESSON', video_url: 'https://video.com/1' }
      ],
      isLoading: false
    });
    mockUseGetUserLesson.mockReturnValue({ data: null, isLoading: false });
    mockAxiosInstance.mockResolvedValue({ token: 'mock-token' });
  });

  it('redirects to course landing page if has_access is false', async () => {
    mockUseCheckAccess.mockReturnValue({ data: { has_access: false }, isLoading: false });

    render(<CoursePlayerPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/courses/s/test-course');
    });
  });

  it('renders player layout and selected lesson when has_access is true', async () => {
    mockUseCheckAccess.mockReturnValue({ data: { has_access: true }, isLoading: false });
    mockUseGetUserLesson.mockReturnValue({
      data: {
        id: 'les-1',
        title: 'Lesson 1 Details',
        video_url: 'https://stream.com/video1.mp4',
        text_content: 'Written content about Go.'
      },
      isLoading: false
    });

    render(<CoursePlayerPage />);

    // Renders back-link and sidebar syllabus title
    expect(screen.getByText('Back to Course Landing Page')).toBeInTheDocument();
    expect(screen.getByText('Syllabus')).toBeInTheDocument();

    // Verifies lesson detail headers/texts
    await waitFor(() => {
      expect(screen.getByText('Lesson 1 Details')).toBeInTheDocument();
      expect(screen.getByText('Written content about Go.')).toBeInTheDocument();
    });
  });
});
