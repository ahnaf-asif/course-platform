import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import PublicCoursePage from '../page';
import React from 'react';

const mockUseGetCourseBySlug = vi.fn();
const mockUseGetCourseTreeBySlug = vi.fn();
const mockUseCheckAccess = vi.fn();
const mockUseCheckout = vi.fn();
const mockUseGetMe = vi.fn();
const mockPush = vi.fn();

vi.mock('@/api/generated/course/course', () => ({
  useGetCourseBySlug: (slug: string) => mockUseGetCourseBySlug(slug),
  useGetCourseTreeBySlug: (slug: string) => mockUseGetCourseTreeBySlug(slug),
}));

vi.mock('@/api/generated/commerce/commerce', () => ({
  useCheckAccess: (slug: string) => mockUseCheckAccess(slug),
  useCheckout: () => mockUseCheckout(),
}));

vi.mock('@/api/generated/user/user', () => ({
  useGetMe: () => mockUseGetMe(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'test-course' }),
  useRouter: () => ({ push: mockPush }),
}));

describe('PublicCoursePage Landing and Checkout', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseGetMe.mockReturnValue({ data: null });
    mockUseCheckAccess.mockReturnValue({ data: { has_access: false }, isLoading: false });
    mockUseCheckout.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockUseGetCourseTreeBySlug.mockReturnValue({ data: [] });
  });

  it('renders free course layout correctly', () => {
    mockUseGetCourseBySlug.mockReturnValue({
      data: {
        id: 'course-1',
        title: 'Learn Go Programming',
        description: 'Comprehensive guide to Golang.',
        price: '0.00',
        currency: 'BDT',
        slug: 'test-course',
      },
      isLoading: false,
    });

    render(<PublicCoursePage />);

    expect(screen.getByRole('heading', { name: 'Learn Go Programming' })).toBeInTheDocument();
    expect(screen.getByText('ফ্রি')).toBeInTheDocument();
    expect(screen.getByText('বিনামূল্যে এনরোল করুন')).toBeInTheDocument();
  });

  it('renders paid course pricing and coupon fields', () => {
    mockUseGetCourseBySlug.mockReturnValue({
      data: {
        id: 'course-2',
        title: 'Advanced Microservices',
        description: 'Scale systems with Go.',
        price: '1500.00',
        currency: 'BDT',
        slug: 'test-course',
      },
      isLoading: false,
    });

    render(<PublicCoursePage />);

    expect(screen.getByText(/1500\.00 BDT/)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('প্রোমো কোড (যদি থাকে)')).toBeNull();
  });

  it('shows promo code input when user is logged in and course is paid', () => {
    mockUseGetMe.mockReturnValue({ data: { id: 'user-123' } });
    mockUseGetCourseBySlug.mockReturnValue({
      data: {
        id: 'course-2',
        title: 'Advanced Microservices',
        description: 'Scale systems with Go.',
        price: '1500.00',
        currency: 'BDT',
        slug: 'test-course',
      },
      isLoading: false,
    });

    render(<PublicCoursePage />);

    expect(screen.getByPlaceholderText('প্রোমো কোড (যদি থাকে)')).toBeInTheDocument();
    expect(screen.getByText('এনরোল করুন')).toBeInTheDocument();
  });

  it('initiates paid checkout redirection on click', async () => {
    mockUseGetMe.mockReturnValue({ data: { id: 'user-123' } });
    mockUseGetCourseBySlug.mockReturnValue({
      data: {
        id: 'course-2',
        title: 'Advanced Microservices',
        price: '1500.00',
        currency: 'BDT',
        slug: 'test-course',
      },
      isLoading: false,
    });

    const mockMutate = vi.fn().mockResolvedValue({
      enrolled: false,
      checkout_url: 'https://gateway.com/pay-session-1',
    });
    mockUseCheckout.mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false,
    });

    // Mock window.location.href assignment
    const locationMock = vi.spyOn(window, 'location', 'get').mockReturnValue({
      ...window.location,
      href: '',
    });

    render(<PublicCoursePage />);

    const enrollButton = screen.getByText('এনরোল করুন');
    fireEvent.click(enrollButton);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });

    locationMock.mockRestore();
  });
});
