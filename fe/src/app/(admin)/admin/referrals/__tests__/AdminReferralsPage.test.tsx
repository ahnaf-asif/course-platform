import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import React from 'react';
import AdminReferralsPage from '../page';

const mockUseGetAdminReferralsSummary = vi.fn();
const mockUseGetAdminReferralsPayouts = vi.fn();
const mockUseGetAdminReferralsEarnings = vi.fn();
const mockUseGetAdminReferralsSettings = vi.fn();
const mockMutatePatchPayout = vi.fn();
const mockMutatePutSettings = vi.fn();

vi.mock('@/api/generated/admin-referral/admin-referral', () => ({
  useGetAdminReferralsSummary: () => mockUseGetAdminReferralsSummary(),
  useGetAdminReferralsPayouts: (params: unknown) => mockUseGetAdminReferralsPayouts(params),
  useGetAdminReferralsEarnings: (params: unknown) => mockUseGetAdminReferralsEarnings(params),
  useGetAdminReferralsSettings: () => mockUseGetAdminReferralsSettings(),
  usePatchAdminReferralsPayoutsIdStatus: () => ({
    mutate: mockMutatePatchPayout,
    isPending: false,
  }),
  usePutAdminReferralsSettings: () => ({
    mutate: mockMutatePutSettings,
    isPending: false,
  }),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

const mockSummary = {
  total_referral_sales: 50000,
  total_commissions_earned: 5000,
  total_commissions_paid: 3000,
  pending_payout_amount: 1500,
  pending_payout_count: 2,
  active_affiliates_count: 8,
};

const mockPayoutsData = {
  payouts: [
    {
      id: 'pay-1',
      user_id: 'user-1',
      user_name: 'Sadman Sakib',
      user_email: 'sadman@example.com',
      amount: 1000,
      currency: 'BDT',
      payment_method: 'bkash',
      account_number: '01712345678',
      account_type: 'PERSONAL',
      status: 'PENDING',
      transaction_ref: null,
      admin_note: null,
      processed_at: null,
      created_at: '2026-08-20T10:00:00Z',
    },
  ],
  total_count: 1,
};

const mockEarningsData = {
  earnings: [
    {
      id: 'earn-1',
      referrer_user_id: 'user-3',
      referrer_name: 'Kamrul Islam',
      referrer_email: 'kamrul@example.com',
      referred_user_id: 'user-2',
      referred_name: 'Nayeem Hasan',
      referred_email: 'nayeem@example.com',
      order_id: 'ord-1',
      node_id: 'node-1',
      course_title: 'Complete Go Programming',
      order_amount: 3000,
      commission_percentage: 10,
      commission_earned: 300,
      currency: 'BDT',
      status: 'COMMISSION_EARNED',
      created_at: '2026-08-19T10:00:00Z',
    },
  ],
  total_count: 1,
};

const mockSettings = {
  id: 1,
  commission_percentage: 10,
  buyer_discount_percentage: 5,
  min_payout_amount: 500,
  is_enabled: true,
  terms_and_conditions: 'Standard terms',
  updated_at: '2026-08-20T10:00:00Z',
};

describe('AdminReferralsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGetAdminReferralsSummary.mockReturnValue({
      data: mockSummary,
      isLoading: false,
      refetch: vi.fn(),
    });
    mockUseGetAdminReferralsPayouts.mockReturnValue({
      data: mockPayoutsData,
      isLoading: false,
      refetch: vi.fn(),
    });
    mockUseGetAdminReferralsEarnings.mockReturnValue({
      data: mockEarningsData,
      isLoading: false,
      refetch: vi.fn(),
    });
    mockUseGetAdminReferralsSettings.mockReturnValue({
      data: mockSettings,
      isLoading: false,
      refetch: vi.fn(),
    });
  });

  it('renders admin summary KPI metrics properly', () => {
    render(<AdminReferralsPage />);

    expect(screen.getByText('৳50,000.00')).toBeInTheDocument(); // total sales
    expect(screen.getByText('৳5,000.00')).toBeInTheDocument(); // total earned
    expect(screen.getByText('৳3,000.00')).toBeInTheDocument(); // total paid
    expect(screen.getByText('৳1,500.00')).toBeInTheDocument(); // pending amount
    expect(screen.getByText('8 জন')).toBeInTheDocument(); // active affiliates
  });

  it('renders the payout requests table with student and bKash details', () => {
    render(<AdminReferralsPage />);

    expect(screen.getByText('Sadman Sakib')).toBeInTheDocument();
    expect(screen.getByText('01712345678')).toBeInTheDocument();
    expect(screen.getByText('৳1,000.00')).toBeInTheDocument();
    expect(screen.getByTestId('btn-approve-payout-pay-1')).toBeInTheDocument();
    expect(screen.getByTestId('btn-reject-payout-pay-1')).toBeInTheDocument();
  });

  it('opens approve modal and approves payout request with bKash TrxID', async () => {
    render(<AdminReferralsPage />);

    const approveBtn = screen.getByTestId('btn-approve-payout-pay-1');
    fireEvent.click(approveBtn);

    expect(screen.getByText('বিকাশ পেমেন্ট অনুমোদন ও TrxID প্রদান')).toBeInTheDocument();

    const trxIdInput = screen.getByTestId('input-payout-trxid');
    fireEvent.change(trxIdInput, { target: { value: 'BLA981726X' } });

    const confirmApproveBtn = screen.getByTestId('btn-confirm-approve-payout');
    fireEvent.click(confirmApproveBtn);

    await waitFor(() => {
      expect(mockMutatePatchPayout).toHaveBeenCalledWith(
        {
          id: 'pay-1',
          data: {
            status: 'APPROVED',
            transaction_ref: 'BLA981726X',
            admin_note: undefined,
          },
        },
        expect.any(Object)
      );
    });
  });

  it('opens reject modal and cancels payout request with reason', async () => {
    render(<AdminReferralsPage />);

    const rejectBtn = screen.getByTestId('btn-reject-payout-pay-1');
    fireEvent.click(rejectBtn);

    expect(screen.getByText('উত্তোলন অনুরোধ বাতিল')).toBeInTheDocument();

    const noteInput = screen.getByTestId('input-reject-note');
    fireEvent.change(noteInput, { target: { value: 'Invalid bKash number' } });

    const confirmRejectBtn = screen.getByTestId('btn-confirm-reject-payout');
    fireEvent.click(confirmRejectBtn);

    await waitFor(() => {
      expect(mockMutatePatchPayout).toHaveBeenCalledWith(
        {
          id: 'pay-1',
          data: {
            status: 'REJECTED',
            admin_note: 'Invalid bKash number',
          },
        },
        expect.any(Object)
      );
    });
  });
});
