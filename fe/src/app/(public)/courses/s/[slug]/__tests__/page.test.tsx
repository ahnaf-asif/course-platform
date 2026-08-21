import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import PublicCoursePage from '../page';
import React from 'react';

const mockUseGetCourseBySlug = vi.fn();
const mockUseGetCourseTreeBySlug = vi.fn();
const mockUseCheckAccess = vi.fn();
const mockUseCheckout = vi.fn();
const mockUseGetMe = vi.fn();
const mockUseGetReferralsValidate = vi.fn();
const mockPush = vi.fn();

vi.mock('@/api/generated/course/course', () => ({
  useGetCourseBySlug: (slug: string) => mockUseGetCourseBySlug(slug),
  useGetCourseTreeBySlug: (slug: string) => mockUseGetCourseTreeBySlug(slug),
}));

vi.mock('@/api/generated/commerce/commerce', () => ({
  useCheckAccess: (slug: string) => mockUseCheckAccess(slug),
  useCheckout: () => mockUseCheckout(),
}));

vi.mock('@/api/generated/referral/referral', () => ({
  useGetReferralsValidate: (params: { code: string }) => mockUseGetReferralsValidate(params),
}));

vi.mock('@/api/generated/user/user', () => ({
  useGetMe: () => mockUseGetMe(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ slug: 'test-course' }),
  useRouter: () => ({ push: mockPush }),
}));

describe('PublicCoursePage Landing, Referral & Checkout Modal', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseGetMe.mockReturnValue({ data: null });
    mockUseCheckAccess.mockReturnValue({ data: { has_access: false }, isLoading: false });
    mockUseCheckout.mockReturnValue({ mutateAsync: vi.fn(), isPending: false });
    mockUseGetCourseTreeBySlug.mockReturnValue({ data: [] });
    mockUseGetReferralsValidate.mockReturnValue({ data: null, isLoading: false });
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
    expect(screen.queryByPlaceholderText('প্রোমো কোড (যদি থাকে)')).toBeNull();
  });

  it('renders paid course pricing and referral code input', () => {
    mockUseGetMe.mockReturnValue({ data: { id: 'user-123' } });
    mockUseGetCourseBySlug.mockReturnValue({
      data: {
        id: 'course-2',
        title: 'Advanced Microservices',
        description: 'Scale systems with Go.',
        price: '2000.00',
        currency: 'BDT',
        slug: 'test-course',
      },
      isLoading: false,
    });

    render(<PublicCoursePage />);

    expect(screen.getByText(/2,000\.00 BDT/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('৬ অক্ষরের কোড')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('প্রোমো কোড (যদি থাকে)')).toBeNull();
  });

  it('validates referral code and displays discounted price', () => {
    mockUseGetMe.mockReturnValue({ data: { id: 'user-123' } });
    mockUseGetCourseBySlug.mockReturnValue({
      data: {
        id: 'course-2',
        title: 'Advanced Microservices',
        description: 'Scale systems with Go.',
        price: '2000.00',
        currency: 'BDT',
        slug: 'test-course',
      },
      isLoading: false,
    });

    mockUseGetReferralsValidate.mockImplementation((params: { code: string }) => {
      if (params.code === 'K7X9B2') {
        return {
          data: {
            valid: true,
            code: 'K7X9B2',
            buyer_discount_percentage: 10,
            message: 'রেফারাল কোড কার্যকর হয়েছে! আপনি 10% ছাড় পাচ্ছেন।',
          },
          isLoading: false,
        };
      }
      return { data: null, isLoading: false };
    });

    render(<PublicCoursePage />);

    const input = screen.getByTestId('input-referral-code');
    fireEvent.change(input, { target: { value: 'K7X9B2' } });

    const applyBtn = screen.getByTestId('btn-apply-referral');
    fireEvent.click(applyBtn);

    expect(screen.getByText(/10% রেফারাল ডিসকাউন্ট প্রযোজ্য/i)).toBeInTheDocument();
    expect(screen.getByText(/৳1,800\.00 BDT/)).toBeInTheDocument();
  });

  it('opens confirmation modal with invoice breakdown and submits checkout', async () => {
    mockUseGetMe.mockReturnValue({ data: { id: 'user-123' } });
    mockUseGetCourseBySlug.mockReturnValue({
      data: {
        id: 'course-2',
        title: 'Advanced Microservices',
        description: 'Scale systems with Go.',
        price: '2000.00',
        currency: 'BDT',
        slug: 'test-course',
      },
      isLoading: false,
    });

    const mutateAsync = vi.fn().mockResolvedValue({
      checkout_url: 'https://sandbox.sslcommerz.com/gwprocess/test',
    });
    mockUseCheckout.mockReturnValue({
      mutateAsync,
      isPending: false,
    });

    render(<PublicCoursePage />);

    const enrollBtn = screen.getByTestId('btn-enroll-course');
    fireEvent.click(enrollBtn);

    // Modal should appear
    expect(screen.getByText('অর্ডার কনফার্মেশন ও পেমেন্ট বিবরণ')).toBeInTheDocument();
    expect(screen.getByText('পেমেন্ট রসিদ বিবরণ (Bill Breakdown)')).toBeInTheDocument();
    expect(screen.getByTestId('btn-proceed-sslcommerz')).toBeInTheDocument();

    const proceedBtn = screen.getByTestId('btn-proceed-sslcommerz');
    fireEvent.click(proceedBtn);

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        data: {
          node_id: 'course-2',
          referral_code: undefined,
        },
      });
    });
  });
});
