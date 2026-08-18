import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import CoursesPage from '../page';
import React from 'react';

const mockUseListPublishedCourses = vi.fn();
const mockUseGetEnrolledCourses = vi.fn();
const mockUseAuthContext = vi.fn();

vi.mock('@/api/generated/course/course', () => ({
  useListPublishedCourses: () => mockUseListPublishedCourses(),
}));

vi.mock('@/api/generated/commerce/commerce', () => ({
  useGetEnrolledCourses: () => mockUseGetEnrolledCourses(),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuthContext: () => mockUseAuthContext(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockCoursesData = [
  {
    id: 'course-1',
    node_type: 'COURSE',
    title: 'বাংলা ভাষা ও সাহিত্য',
    slug: 'bangla-course',
    description: 'বাংলা ভাষা ও সাহিত্যের বিস্তারিত প্রস্তুতি।',
    price: '1000',
    currency: 'BDT',
  },
  {
    id: 'course-2',
    node_type: 'COURSE',
    title: 'সাধারণ জ্ঞান আন্তর্জাতিক',
    slug: 'gk-international',
    description: 'আন্তর্জাতিক বিষয়াবলির সম্পূর্ণ সিলেবাস।',
    price: '0.00',
    currency: 'BDT',
  },
];

describe('CoursesPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders standard view for guest users with "বিস্তারিত দেখুন" buttons', () => {
    mockUseAuthContext.mockReturnValue({ isAuthenticated: false, isHydrated: true });
    mockUseListPublishedCourses.mockReturnValue({ data: mockCoursesData, isLoading: false });
    mockUseGetEnrolledCourses.mockReturnValue({ data: undefined, isLoading: false });

    render(<CoursesPage />);

    expect(screen.getByText('বাংলা ভাষা ও সাহিত্য')).toBeInTheDocument();
    expect(screen.getByText('সাধারণ জ্ঞান আন্তর্জাতিক')).toBeInTheDocument();

    const detailButtons = screen.getAllByRole('link', { name: /বিস্তারিত দেখুন/i });
    expect(detailButtons).toHaveLength(2);
    expect(detailButtons[0]).toHaveAttribute('href', '/courses/s/bangla-course');
    expect(detailButtons[1]).toHaveAttribute('href', '/courses/s/gk-international');
  });

  it('renders "কোর্সে যান" and "এনরোল করা আছে" for enrolled courses when user is logged in', () => {
    mockUseAuthContext.mockReturnValue({ isAuthenticated: true, isHydrated: true });
    mockUseListPublishedCourses.mockReturnValue({ data: mockCoursesData, isLoading: false });
    mockUseGetEnrolledCourses.mockReturnValue({
      data: [{ id: 'course-1', slug: 'bangla-course', title: 'বাংলা ভাষা ও সাহিত্য' }],
      isLoading: false,
    });

    render(<CoursesPage />);

    // Course 1 is enrolled
    const enrolledBtn = screen.getByRole('link', { name: /কোর্সে যান/i });
    expect(enrolledBtn).toBeInTheDocument();
    expect(enrolledBtn).toHaveAttribute('href', '/courses/s/bangla-course/learn');
    expect(screen.getByText('এনরোল করা আছে')).toBeInTheDocument();

    // Course 2 is not enrolled
    const detailBtn = screen.getByRole('link', { name: /বিস্তারিত দেখুন/i });
    expect(detailBtn).toBeInTheDocument();
    expect(detailBtn).toHaveAttribute('href', '/courses/s/gk-international');
  });
});
