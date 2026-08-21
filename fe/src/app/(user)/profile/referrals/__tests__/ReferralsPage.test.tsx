import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import React from 'react';
import StudentReferralsPage from '../page';

const mockUseGetReferralsOverview = vi.fn();
const mockUseGetReferralsEarnings = vi.fn();
const mockUseGetReferralsPayouts = vi.fn();
const mockMutatePayout = vi.fn();

vi.mock('@/api/generated/referral/referral', () => ({
  useGetReferralsOverview: () => mockUseGetReferralsOverview(),
  useGetReferralsEarnings: () => mockUseGetReferralsEarnings(),
  useGetReferralsPayouts: () => mockUseGetReferralsPayouts(),
  usePostReferralsPayoutRequests: () => ({
    mutate: mockMutatePayout,
    isPending: false,
  }),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

const mockOverview = {
  code: 'K7X9B2',
  total_earned: 2500,
  total_withdrawn: 1000,
  pending_payout: 800,
  available_balance: 700,
  total_referrals: 3,
  commission_percentage: 10,
  buyer_discount_percentage: 5,
  min_payout_amount: 500,
  is_enabled: true,
  terms_and_conditions: 'Standard terms',
};

const mockEarnings = [
  {
    id: 'earn-1',
    order_id: 'ord-1',
    node_id: 'node-1',
    course_title: 'Complete Go Programming',
    referred_user_name: 'Sadman Sakib',
    referred_user_email: 'sadman@example.com',
    order_amount: 3000,
    commission_percentage: 10,
    commission_earned: 300,
    currency: 'BDT',
    status: 'COMMISSION_EARNED',
    created_at: '2026-08-19T10:00:00Z',
  },
];

const mockPayouts = [
  {
    id: 'pay-1',
    amount: 500,
    currency: 'BDT',
    payment_method: 'bkash',
    account_number: '01712345678',
    account_type: 'PERSONAL',
    status: 'PENDING',
    transaction_ref: null,
    admin_note: null,
    processed_at: null,
    created_at: '2026-08-20T12:00:00Z',
  },
];

describe('StudentReferralsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGetReferralsOverview.mockReturnValue({
      data: mockOverview,
      isLoading: false,
      refetch: vi.fn(),
    });
    mockUseGetReferralsEarnings.mockReturnValue({
      data: mockEarnings,
      isLoading: false,
      refetch: vi.fn(),
    });
    mockUseGetReferralsPayouts.mockReturnValue({
      data: mockPayouts,
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  it('renders referral code, share link, and balance KPI cards correctly', () => {
    render(<StudentReferralsPage />);

    expect(screen.getByTestId('referral-code-display')).toHaveTextContent('K7X9B2');
    expect(screen.getByText('রেফারাল ও আয় (Affiliate Program)')).toBeInTheDocument();
    expect(screen.getByText('৳700.00')).toBeInTheDocument(); // Available balance
    expect(screen.getByText('৳2,500.00')).toBeInTheDocument(); // Total earned
    expect(screen.getByText('৳1,000.00')).toBeInTheDocument(); // Total withdrawn
    expect(screen.getByText('৳800.00')).toBeInTheDocument(); // Pending payout
    expect(screen.getByText('3 টি')).toBeInTheDocument(); // Total referrals count
  });

  it('displays the earnings history list', () => {
    render(<StudentReferralsPage />);

    expect(screen.getByText('Complete Go Programming')).toBeInTheDocument();
    expect(screen.getByText('Sadman Sakib')).toBeInTheDocument();
    expect(screen.getByText('+৳300.00')).toBeInTheDocument();
  });

  it('opens payout modal and submits bKash withdrawal request successfully', async () => {
    render(<StudentReferralsPage />);

    const requestPayoutBtn = screen.getByTestId('btn-request-payout-header');
    fireEvent.click(requestPayoutBtn);

    expect(screen.getByText('বিকাশ (bKash) উত্তোলন অনুরোধ')).toBeInTheDocument();

    const amountInput = screen.getByTestId('input-payout-amount');
    const phoneInput = screen.getByTestId('input-bkash-number');

    fireEvent.change(amountInput, { target: { value: '500' } });
    fireEvent.change(phoneInput, { target: { value: '01712345678' } });

    const submitBtn = screen.getByTestId('btn-submit-payout');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockMutatePayout).toHaveBeenCalledWith(
        {
          data: {
            amount: 500,
            payment_method: 'bkash',
            account_number: '01712345678',
            account_type: 'PERSONAL',
          },
        },
        expect.any(Object)
      );
    });
  });
});
