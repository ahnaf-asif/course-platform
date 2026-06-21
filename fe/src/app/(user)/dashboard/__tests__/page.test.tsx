import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import UserDashboard from '../page';
import React from 'react';

const mockUseGetEnrolledCourses = vi.fn();
const mockUseListPublishedCourses = vi.fn();

vi.mock('@/api/generated/commerce/commerce', () => ({
  useGetEnrolledCourses: () => mockUseGetEnrolledCourses(),
}));

vi.mock('@/api/generated/course/course', () => ({
  useListPublishedCourses: () => mockUseListPublishedCourses(),
}));

describe('UserDashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock behavior: empty lists
    mockUseGetEnrolledCourses.mockReturnValue({
      data: [],
      isLoading: false,
    });

    mockUseListPublishedCourses.mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  it('renders loading state with skeletons when loading enrolled courses', () => {
    mockUseGetEnrolledCourses.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { container } = render(<UserDashboard />);
    // Verify skeleton elements are rendered
    const skeletons = container.querySelectorAll('.mantine-Skeleton-root');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('renders empty state when no courses are enrolled', () => {
    render(<UserDashboard />);

    expect(screen.getByText('No Enrolled Courses')).toBeInTheDocument();
    expect(screen.getByText(/You haven't enrolled in any courses yet/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Browse Catalog/i })).toBeInTheDocument();
  });

  it('renders enrolled courses correctly', () => {
    mockUseGetEnrolledCourses.mockReturnValue({
      data: [
        {
          id: 'course-1',
          title: 'Learn Go Programming',
          slug: 'learn-go',
          description: 'A comprehensive guide to learning Go.',
          thumbnail_url: '',
          is_published: true,
          enrolled_at: '2026-06-20T00:00:00Z',
        },
      ],
      isLoading: false,
    });

    render(<UserDashboard />);

    expect(screen.getByText('Learn Go Programming')).toBeInTheDocument();
    expect(screen.getByText('A comprehensive guide to learning Go.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Resume Learning/i })).toBeInTheDocument();
  });

  it('switches tabs and displays discover courses', () => {
    mockUseListPublishedCourses.mockReturnValue({
      data: [
        {
          id: 'course-discover-1',
          title: 'Master Next.js',
          slug: 'master-nextjs',
          description: 'A deep dive into building Next.js apps.',
          thumbnail_url: '',
          is_published: true,
          price: '999.00',
          currency: 'BDT',
        },
      ],
      isLoading: false,
    });

    render(<UserDashboard />);

    // Click Discover Courses tab
    const discoverTab = screen.getByRole('tab', { name: /Discover Courses/i });
    fireEvent.click(discoverTab);

    expect(screen.getByText('Master Next.js')).toBeInTheDocument();
    expect(screen.getByText('A deep dive into building Next.js apps.')).toBeInTheDocument();
    expect(screen.getByText('999.00 BDT')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View Course/i })).toBeInTheDocument();
  });
});
