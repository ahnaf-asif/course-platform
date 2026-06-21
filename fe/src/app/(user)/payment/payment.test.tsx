import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import SuccessPage from './success/page';
import FailPage from './fail/page';
import CancelPage from './cancel/page';
import React from 'react';

const mockGet = vi.fn();
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: mockGet,
  }),
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('Payment Callback Pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Success Page', () => {
    it('renders transaction details correctly', () => {
      mockGet.mockReturnValue('tran-12345');
      render(<SuccessPage />);

      expect(screen.getByText('Payment Successful!')).toBeInTheDocument();
      expect(screen.getByText('tran-12345')).toBeInTheDocument();
      expect(screen.getByText('PAID / COMPLETED')).toBeInTheDocument();
      expect(screen.getByText('My Dashboard')).toBeInTheDocument();
    });
  });

  describe('Fail Page', () => {
    it('renders failure message and reason', () => {
      mockGet.mockImplementation((param) => {
        if (param === 'tran_id') return 'tran-failed-id';
        if (param === 'error') return 'Transaction could not be completed';
        return null;
      });

      render(<FailPage />);

      expect(screen.getByText('Payment Failed')).toBeInTheDocument();
      expect(screen.getByText('tran-failed-id')).toBeInTheDocument();
      expect(screen.getByText('Transaction could not be completed')).toBeInTheDocument();
    });
  });

  describe('Cancel Page', () => {
    it('renders cancellation status', () => {
      mockGet.mockReturnValue('tran-cancelled-id');
      render(<CancelPage />);

      expect(screen.getByText('Payment Cancelled')).toBeInTheDocument();
      expect(screen.getByText('tran-cancelled-id')).toBeInTheDocument();
      expect(screen.getByText('CANCELLED')).toBeInTheDocument();
    });
  });
});
