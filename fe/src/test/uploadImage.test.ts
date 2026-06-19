import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleImageUpload } from '../components/Editor/uploadImage';
import { notifications } from '@mantine/notifications';
import { axiosInstance } from '@/lib/axios';
import axios from 'axios';
import { Editor } from '@tiptap/react';

// Mock axiosInstance
vi.mock('@/lib/axios', () => ({
  axiosInstance: vi.fn(),
}));

// Mock axios
vi.mock('axios', async () => {
  const actual = await vi.importActual<typeof axios>('axios');
  return {
    default: {
      ...actual,
      post: vi.fn(),
      isAxiosError: vi.fn().mockImplementation((err) => err && err.isAxiosError),
    },
  };
});

// Mock @mantine/notifications
vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn().mockReturnValue('mock-notification-id'),
    update: vi.fn(),
  },
}));

describe('handleImageUpload', () => {
  let mockEditor: Editor;
  let mockSetImage: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetImage = vi.fn().mockReturnThis();
    mockEditor = {
      chain: vi.fn().mockReturnThis(),
      focus: vi.fn().mockReturnThis(),
      setImage: mockSetImage,
      run: vi.fn(),
    } as unknown as Editor;
  });

  it('should exit early if file is null', async () => {
    await handleImageUpload(null, mockEditor);
    expect(notifications.show).not.toHaveBeenCalled();
  });

  it('should show error notification if file is not an image', async () => {
    const file = new File(['text'], 'test.txt', { type: 'text/plain' });
    await handleImageUpload(file, mockEditor);

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Invalid file',
        message: 'Please upload an image file.',
        color: 'red',
      })
    );
    expect(axiosInstance).not.toHaveBeenCalled();
  });

  it('should upload successfully and insert image into editor', async () => {
    const file = new File(['image-data'], 'test.png', { type: 'image/png' });

    // Mock get upload token
    vi.mocked(axiosInstance).mockResolvedValueOnce({ token: 'mock-upload-token' });

    // Mock upload response
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: { file_name: 'uploaded-test.png' }
    });

    await handleImageUpload(file, mockEditor);

    // Should show loading notification
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        loading: true,
        title: 'Uploading image',
        autoClose: false,
      })
    );

    // Should request token
    expect(axiosInstance).toHaveBeenCalledWith({
      url: '/admin/media/upload-token',
      method: 'GET',
    });

    // Should post to media-api
    expect(axios.post).toHaveBeenCalledWith(
      '/media-api/upload?visibility=public&upload_token=mock-upload-token',
      expect.any(FormData),
      expect.objectContaining({
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    );

    // Should insert to editor
    expect(mockEditor.chain).toHaveBeenCalled();
    expect(mockSetImage).toHaveBeenCalledWith({ src: '/media-api/p/uploaded-test.png' });

    // Should update notification to success
    expect(notifications.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'mock-notification-id',
        color: 'green',
        title: 'Success',
      })
    );
  });

  it('should handle API errors during upload gracefully', async () => {
    const file = new File(['image-data'], 'test.png', { type: 'image/png' });

    vi.mocked(axiosInstance).mockRejectedValueOnce(new Error('Auth failed'));

    await handleImageUpload(file, mockEditor);

    // Should update notification to error
    expect(notifications.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'mock-notification-id',
        color: 'red',
        title: 'Upload failed',
      })
    );
    expect(mockSetImage).not.toHaveBeenCalled();
  });
});
