import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import LessonEditPage from '../page';
import React from 'react';
import { AxiosRequestConfig } from 'axios';

const mockUseGetAdminLessonsId = vi.fn();
const mockUsePatchAdminLessonsId = vi.fn();

vi.mock('@/api/generated/admin-curriculum/admin-curriculum', () => ({
  useGetAdminLessonsId: (id: string) => mockUseGetAdminLessonsId(id),
  usePatchAdminLessonsId: () => mockUsePatchAdminLessonsId(),
}));

const mockPush = vi.fn();
const mockParams = { id: 'course-123', lessonId: 'lesson-abc' };
vi.mock('next/navigation', () => ({
  useParams: () => mockParams,
  useRouter: () => ({
    push: mockPush,
  }),
}));

const mockAxiosInstance = vi.fn();
vi.mock('@/lib/axios', () => ({
  axiosInstance: (args: AxiosRequestConfig) => mockAxiosInstance(args),
  setAuthHandlers: vi.fn(),
  updateAccessToken: vi.fn(),
}));

// Mock dynamic import of RichTextEditor to prevent rendering issues in JSDOM
vi.mock('@/components/Editor/RichTextEditor', () => {
  return {
    default: ({ content, onChange, label }: { content: string; onChange: (val: string) => void; label?: string }) => (
      <div>
        {label && <label>{label}</label>}
        <textarea
          data-testid="mock-rte"
          value={content}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    ),
  };
});

describe('LessonEditPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseGetAdminLessonsId.mockReturnValue({
      data: {
        id: 'lesson-abc',
        title: 'Introduction to Hooks',
        video_url: 'https://example.com/video.mp4',
        text_content: '<p>Learn React Hooks</p>',
      },
      isLoading: false,
      refetch: vi.fn(),
    });

    mockUsePatchAdminLessonsId.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it('renders breadcrumbs, title, and initial values correctly', async () => {
    render(<LessonEditPage />);

    expect(screen.getByText('Curriculum')).toBeInTheDocument();
    expect(screen.getByText('Edit Lesson: Introduction to Hooks')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Introduction to Hooks')).toBeInTheDocument();
    const rte = await screen.findByTestId('mock-rte');
    expect(rte).toHaveValue('<p>Learn React Hooks</p>');
  });

  it('allows editing title and submits the form successfully', async () => {
    const mockMutate = vi.fn().mockResolvedValue({});
    mockUsePatchAdminLessonsId.mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false,
    });

    render(<LessonEditPage />);

    const titleInput = screen.getByDisplayValue('Introduction to Hooks');
    fireEvent.change(titleInput, { target: { value: 'Advanced React Hooks' } });

    const submitButton = screen.getByText('Save Changes');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith({
        id: 'lesson-abc',
        data: {
          title: 'Advanced React Hooks',
          video_url: 'https://example.com/video.mp4',
          text_content: '<p>Learn React Hooks</p>',
        },
      });
    });
  });

  it('shows not found view if lesson does not exist', () => {
    mockUseGetAdminLessonsId.mockReturnValue({
      data: null,
      isLoading: false,
      refetch: vi.fn(),
    });

    render(<LessonEditPage />);

    expect(screen.getByText('Lesson not found')).toBeInTheDocument();
  });
});
