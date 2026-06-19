import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { BulkUploadModal } from '../BulkUploadModal';
import React from 'react';

describe('BulkUploadModal Component', () => {
  it('renders download sample and copy AI prompt buttons', () => {
    const mockDownload = vi.fn();
    const mockCopy = vi.fn();
    const mockUpload = vi.fn();

    render(
      <BulkUploadModal
        opened={true}
        onClose={vi.fn()}
        handleDownloadSample={mockDownload}
        handleCopyAIPrompt={mockCopy}
        handleBulkUpload={mockUpload}
        copied={false}
      />
    );

    expect(screen.getByText('Bulk Upload Questions (CSV)')).toBeInTheDocument();
    
    const downloadBtn = screen.getByText('Download Sample CSV');
    const copyBtn = screen.getByText('Copy AI Prompt');

    fireEvent.click(downloadBtn);
    fireEvent.click(copyBtn);

    expect(mockDownload).toHaveBeenCalled();
    expect(mockCopy).toHaveBeenCalled();
  });

  it('displays Copied text when copied prop is true', () => {
    render(
      <BulkUploadModal
        opened={true}
        onClose={vi.fn()}
        handleDownloadSample={vi.fn()}
        handleCopyAIPrompt={vi.fn()}
        handleBulkUpload={vi.fn()}
        copied={true}
      />
    );

    expect(screen.getByText('Prompt Copied!')).toBeInTheDocument();
  });
});
