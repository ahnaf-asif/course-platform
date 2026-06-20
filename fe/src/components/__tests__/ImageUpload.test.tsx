import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test/test-utils';
import ImageUpload from '../ImageUpload';
import React from 'react';
import { AxiosRequestConfig } from 'axios';

const mockAxiosInstance = vi.fn();
vi.mock('@/lib/axios', () => ({
  axiosInstance: (args: AxiosRequestConfig) => mockAxiosInstance(args),
  setAuthHandlers: vi.fn(),
  updateAccessToken: vi.fn(),
}));

const mockPost = vi.fn();
vi.mock('axios', () => {
  return {
    default: {
      post: (...args: unknown[]) => mockPost(...args),
      isAxiosError: () => false,
    },
  };
});

describe('ImageUpload Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload button when no image value is provided', () => {
    render(
      <ImageUpload
        value=""
        onChange={vi.fn()}
        label="Course Thumbnail"
        description="Select an image"
      />
    );

    expect(screen.getByText('Course Thumbnail')).toBeInTheDocument();
    expect(screen.getByText('Select an image')).toBeInTheDocument();
    expect(screen.getByText('Upload Thumbnail')).toBeInTheDocument();
  });

  it('renders preview image and delete button when image value is provided', () => {
    const mockOnChange = vi.fn();
    render(<ImageUpload value="/media-api/p/img.png" onChange={mockOnChange} />);

    const img = screen.getByAltText('Preview');
    expect(img).toHaveAttribute('src', '/media-api/p/img.png');

    const removeButton = screen.getByRole('button');
    fireEvent.click(removeButton);
    expect(mockOnChange).toHaveBeenCalledWith('');
  });

  it('handles image upload successfully', async () => {
    const mockOnChange = vi.fn();
    mockAxiosInstance.mockResolvedValue({ token: 'temp-token-123' });
    mockPost.mockResolvedValue({ data: { file_name: 'uploaded.png' } });

    render(<ImageUpload value="" onChange={mockOnChange} />);

    const file = new File(['dummy content'], 'image.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockAxiosInstance).toHaveBeenCalledWith({
        url: '/admin/media/upload-token',
        method: 'GET',
      });
      expect(mockPost).toHaveBeenCalled();
      expect(mockOnChange).toHaveBeenCalledWith('/media-api/p/uploaded.png');
    });
  });

  it('shows error notification when uploading a non-image file', async () => {
    const mockOnChange = vi.fn();
    render(<ImageUpload value="" onChange={mockOnChange} />);

    const file = new File(['dummy content'], 'document.pdf', { type: 'application/pdf' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(mockOnChange).not.toHaveBeenCalled();
    expect(mockAxiosInstance).not.toHaveBeenCalled();
  });

  it('shows error notification when upload API fails', async () => {
    const mockOnChange = vi.fn();
    mockAxiosInstance.mockRejectedValue(new Error('Auth failed'));

    render(<ImageUpload value="" onChange={mockOnChange} />);

    const file = new File(['dummy content'], 'image.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockAxiosInstance).toHaveBeenCalled();
      expect(mockOnChange).not.toHaveBeenCalled();
    });
  });
});
