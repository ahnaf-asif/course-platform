import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import React from 'react';
import OrdersManagement from '../page';
import { OrderSummaryCards } from '../OrderSummaryCards';
import { OrderDetailModal } from '../OrderDetailModal';
import { notifications } from '@mantine/notifications';

const mockUseGetAdminOrdersSummary = vi.fn();
const mockUseGetAdminOrders = vi.fn();
const mockUseGetAdminOrdersId = vi.fn();
const mockMutateStatus = vi.fn();

vi.mock('@/api/generated/admin-commerce/admin-commerce', () => ({
  useGetAdminOrdersSummary: () => mockUseGetAdminOrdersSummary(),
  useGetAdminOrders: (params: unknown) => mockUseGetAdminOrders(params),
  useGetAdminOrdersId: (id: string, options: unknown) => mockUseGetAdminOrdersId(id, options),
  usePatchAdminOrdersIdStatus: () => ({
    mutateAsync: mockMutateStatus,
    isPending: false,
  }),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

const mockSummary = {
  total_orders: 15,
  total_revenue: '45000.00',
  completed_orders: 12,
  pending_orders: 2,
  refunded_orders: 1,
};

const mockOrders = [
  {
    id: '11111111-1111-1111-1111-111111111111',
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
    provider_reference: 'VAL-12345',
    coupon_id: 'coup-1',
    coupon_code: 'SPECIAL20',
    coupon_discount_type: 'PERCENTAGE',
    coupon_discount_value: '20.00',
    created_at: '2026-08-19T10:00:00Z',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    user_id: 'user-2',
    user_name: 'Rahim Uddin',
    user_email: 'rahim@example.com',
    node_id: 'node-2',
    course_title: 'React & Next.js Masterclass',
    course_slug: 'react-nextjs-masterclass',
    amount_paid: '2500.00',
    currency: 'BDT',
    status: 'PENDING',
    payment_provider: 'bkash',
    provider_reference: 'pending',
    created_at: '2026-08-19T11:00:00Z',
  },
];

describe('Orders Management Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGetAdminOrdersSummary.mockReturnValue({
      data: mockSummary,
      isLoading: false,
      refetch: vi.fn(),
    });
    mockUseGetAdminOrdersId.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });
    mockUseGetAdminOrders.mockReturnValue({
      data: {
        orders: mockOrders,
        total_count: 2,
        page: 1,
        limit: 20,
        total_pages: 1,
      },
      isLoading: false,
      isFetching: false,
      isError: false,
      refetch: vi.fn(),
    });
  });

  it('renders order management header and statistics cards', () => {
    render(<OrdersManagement />);

    expect(screen.getByText(/অর্ডার ও ট্রানজেকশন/i)).toBeInTheDocument();
    expect(screen.getByText('মোট আয়')).toBeInTheDocument();
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('৳45,000.00')).toBeInTheDocument();
    expect(screen.getByText('সফল অর্ডার')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('renders orders table with student and course details', () => {
    render(<OrdersManagement />);

    expect(screen.getByText('Shafin Ahmed')).toBeInTheDocument();
    expect(screen.getByText('shafin@example.com')).toBeInTheDocument();
    expect(screen.getByText('Complete Go Programming')).toBeInTheDocument();
    expect(screen.getByText('SPECIAL20')).toBeInTheDocument();
    expect(screen.getByText('SSLCOMMERZ')).toBeInTheDocument();

    expect(screen.getByText('Rahim Uddin')).toBeInTheDocument();
    expect(screen.getByText('rahim@example.com')).toBeInTheDocument();
    expect(screen.getByText('React & Next.js Masterclass')).toBeInTheDocument();
  });

  it('opens order detail modal when clicking view order button', async () => {
    mockUseGetAdminOrdersId.mockReturnValue({
      data: {
        ...mockOrders[0],
        user_role: 'USER',
        node_type: 'COURSE',
        course_thumbnail_url: '',
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    render(<OrdersManagement />);

    const viewBtn = screen.getByTestId('btn-view-order-11111111-1111-1111-1111-111111111111');
    fireEvent.click(viewBtn);

    await waitFor(() => {
      expect(screen.getByText(/অর্ডার বিবরণী/i)).toBeInTheDocument();
      expect(screen.getByText(/শিক্ষার্থী তথ্য/i)).toBeInTheDocument();
      expect(screen.getByText(/পেমেন্ট ও ট্রানজেকশন/i)).toBeInTheDocument();
    });
  });

  it('triggers CSV export successfully', () => {
    render(<OrdersManagement />);

    const exportBtn = screen.getByTestId('btn-export-orders');
    fireEvent.click(exportBtn);

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'CSV ডাউনলোড সম্পন্ন',
        color: 'green',
      })
    );
  });
});

describe('OrderDetailModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders pending order and allows marking as completed', async () => {
    mockUseGetAdminOrdersId.mockReturnValue({
      data: {
        id: '22222222-2222-2222-2222-222222222222',
        user_id: 'user-2',
        user_name: 'Rahim Uddin',
        user_email: 'rahim@example.com',
        user_role: 'USER',
        node_id: 'node-2',
        node_type: 'COURSE',
        course_title: 'React & Next.js Masterclass',
        course_slug: 'react-nextjs-masterclass',
        course_thumbnail_url: '',
        amount_paid: '2500.00',
        currency: 'BDT',
        status: 'PENDING',
        payment_provider: 'bkash',
        provider_reference: 'pending',
        created_at: '2026-08-19T11:00:00Z',
      },
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    const mockOnClose = vi.fn();
    const mockOnStatusUpdated = vi.fn();

    render(
      <OrderDetailModal
        opened={true}
        onClose={mockOnClose}
        orderId="22222222-2222-2222-2222-222222222222"
        onStatusUpdated={mockOnStatusUpdated}
      />
    );

    expect(screen.getByText(/Rahim Uddin/i)).toBeInTheDocument();
    expect(screen.getByText(/অপেক্ষারত/i)).toBeInTheDocument();

    const completeBtn = screen.getByTestId('btn-mark-completed');
    expect(completeBtn).toBeInTheDocument();

    fireEvent.click(completeBtn);
    expect(screen.getByText(/নিশ্চিতকরণ প্রয়োজন/i)).toBeInTheDocument();

    const confirmBtn = screen.getByRole('button', { name: /হ্যাঁ, পরিবর্তন করুন/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockMutateStatus).toHaveBeenCalledWith({
        id: '22222222-2222-2222-2222-222222222222',
        data: { status: 'COMPLETED' },
      });
      expect(notifications.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'অর্ডার স্ট্যাটাস আপডেট হয়েছে',
          color: 'green',
        })
      );
    });
  });
});

describe('OrderSummaryCards Component', () => {
  it('renders skeleton loaders when loading is true', () => {
    const { container } = render(<OrderSummaryCards isLoading={true} />);
    expect(container.querySelectorAll('.mantine-Skeleton-root').length).toBeGreaterThan(0);
  });
});
