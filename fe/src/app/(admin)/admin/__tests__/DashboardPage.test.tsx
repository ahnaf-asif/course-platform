import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import React from 'react';
import AdminDashboard from '../page';
import { DashboardKPIs } from '../_components/DashboardKPIs';

const mockUseGetAdminDashboardAnalytics = vi.fn();

vi.mock('@/api/generated/admin-analytics/admin-analytics', () => ({
  useGetAdminDashboardAnalytics: () => mockUseGetAdminDashboardAnalytics(),
}));

const mockAnalytics = {
  kpis: {
    total_users: 1250,
    users_this_month: 85,
    published_courses: 8,
    total_courses: 10,
    total_lessons: 120,
    total_quizzes: 45,
    total_enrollments: 450,
    total_orders: 320,
    completed_orders: 295,
    pending_orders: 20,
    refunded_orders: 5,
    total_revenue: '750000.00',
    revenue_this_month: '125000.00',
    revenue_this_week: '35000.00',
  },
  daily_revenue_trends: [
    { date: '2026-08-18', display_label: '2026-08-18', revenue: 5000, total_orders: 3, completed_orders: 3 },
    { date: '2026-08-19', display_label: '2026-08-19', revenue: 8000, total_orders: 4, completed_orders: 4 },
  ],
  monthly_revenue_trends: [
    { date: '2026-07', display_label: 'Jul 2026', revenue: 95000, total_orders: 45, completed_orders: 42 },
    { date: '2026-08', display_label: 'Aug 2026', revenue: 125000, total_orders: 55, completed_orders: 50 },
  ],
  daily_user_trends: [
    { date: '2026-08-18', new_users: 12 },
    { date: '2026-08-19', new_users: 18 },
  ],
  top_courses: [
    {
      id: 'course-1',
      title: 'Complete Go Programming',
      slug: 'complete-go-programming',
      total_revenue: 350000,
      total_orders: 140,
      total_students: 135,
    },
  ],
  payment_distribution: [
    { provider: 'sslcommerz', order_count: 220, total_amount: 550000 },
    { provider: 'bkash', order_count: 80, total_amount: 180000 },
  ],
  recent_orders: [
    {
      id: 'order-1',
      user_id: 'user-1',
      user_name: 'Shafin Ahmed',
      user_email: 'shafin@example.com',
      node_id: 'node-1',
      course_title: 'Complete Go Programming',
      course_slug: 'complete-go-programming',
      amount_paid: '3000.00',
      currency: 'BDT',
      status: 'COMPLETED',
      payment_provider: 'sslcommerz',
      provider_reference: 'VAL-111',
      created_at: '2026-08-19T10:00:00Z',
    },
  ],
  recent_users: [
    {
      id: 'user-1',
      email: 'student@example.com',
      full_name: 'Tanvir Hossain',
      role: 'USER',
      avatar_url: '',
      created_at: '2026-08-19T09:00:00Z',
    },
  ],
};

describe('Admin Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGetAdminDashboardAnalytics.mockReturnValue({
      data: mockAnalytics,
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it('renders dashboard header and overview title', () => {
    render(<AdminDashboard />);

    expect(screen.getByText(/অ্যানালিটিক্স ও ড্যাশবোর্ড/i)).toBeInTheDocument();
    expect(screen.getByTestId('btn-refresh-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('btn-new-course')).toBeInTheDocument();
  });

  it('renders executive KPI summary metrics cards', () => {
    render(<AdminDashboard />);

    expect(screen.getByText('মোট আয়')).toBeInTheDocument();
    expect(screen.getByText('৳750,000.00')).toBeInTheDocument();
    expect(screen.getByText('+৳125,000 এই মাসে')).toBeInTheDocument();

    expect(screen.getByText('শিক্ষার্থী সংখ্যা')).toBeInTheDocument();
    expect(screen.getByText('1,250')).toBeInTheDocument();
    expect(screen.getByText('+85 জন নতুন')).toBeInTheDocument();

    expect(screen.getByText('মোট অর্ডার')).toBeInTheDocument();
    expect(screen.getByText('320')).toBeInTheDocument();

    expect(screen.getByText('প্রকাশিত কোর্স')).toBeInTheDocument();
    expect(screen.getByText('8 / 10')).toBeInTheDocument();
  });

  it('renders charts and allows switching revenue timeframe', () => {
    render(<AdminDashboard />);

    expect(screen.getByText(/আয় ও বিক্রয় ট্রেন্ড/i)).toBeInTheDocument();
    expect(screen.getAllByText(/শিক্ষার্থী নিবন্ধন বৃদ্ধি/i)[0]).toBeInTheDocument();

    const monthlyTab = screen.getByText(/গত ১২ মাস/i);
    fireEvent.click(monthlyTab);
    expect(screen.getByText(/গত ১২ মাস/i)).toBeInTheDocument();
  });

  it('renders top performing courses and payment distribution', () => {
    render(<AdminDashboard />);

    expect(screen.getByText(/জনপ্রিয় কোর্সসমূহ/i)).toBeInTheDocument();
    expect(screen.getAllByText('Complete Go Programming').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('135 জন')).toBeInTheDocument();
    expect(screen.getByText('৳350,000.00')).toBeInTheDocument();

    expect(screen.getByText(/পেমেন্ট মেথড অনুপাত/i)).toBeInTheDocument();
    expect(screen.getByText('SSLCOMMERZ')).toBeInTheDocument();
    expect(screen.getByText('BKASH')).toBeInTheDocument();
  });

  it('renders recent activity for orders and users', () => {
    render(<AdminDashboard />);

    expect(screen.getByText(/সাম্প্রতিক অর্ডারসমূহ/i)).toBeInTheDocument();
    expect(screen.getByText('Shafin Ahmed')).toBeInTheDocument();
    expect(screen.getByText('shafin@example.com')).toBeInTheDocument();

    expect(screen.getByText(/নতুন নিবন্ধিত শিক্ষার্থী/i)).toBeInTheDocument();
    expect(screen.getByText('Tanvir Hossain')).toBeInTheDocument();
    expect(screen.getByText('student@example.com')).toBeInTheDocument();
  });

  it('renders quick action shortcut buttons', () => {
    render(<AdminDashboard />);

    expect(screen.getByText(/ম্যানেজমেন্ট শর্টকাটস/i)).toBeInTheDocument();
    expect(screen.getByText('কোর্সসমূহ')).toBeInTheDocument();
    expect(screen.getByText('অর্ডার ও বিক্রয়')).toBeInTheDocument();
    expect(screen.getByText('শিক্ষার্থীবৃন্দ')).toBeInTheDocument();
    expect(screen.getByText('কুইজ ও প্রশ্ন')).toBeInTheDocument();
  });

  it('renders error alert when API fetch fails', () => {
    mockUseGetAdminDashboardAnalytics.mockReturnValue({
      data: null,
      isLoading: false,
      isFetching: false,
      isError: true,
      refetch: vi.fn(),
    });

    render(<AdminDashboard />);
    expect(screen.getByText(/ড্যাশবোর্ড তথ্য লোড করতে সমস্যা হয়েছে/i)).toBeInTheDocument();
  });
});

describe('DashboardKPIs Loading Component', () => {
  it('renders skeleton placeholders while loading', () => {
    const { container } = render(<DashboardKPIs isLoading={true} />);
    expect(container.querySelectorAll('.mantine-Skeleton-root').length).toBeGreaterThan(0);
  });
});
