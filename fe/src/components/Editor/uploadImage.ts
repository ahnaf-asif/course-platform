import { notifications } from '@mantine/notifications';
import { axiosInstance } from '@/lib/axios';
import axios from 'axios';
import { Editor } from '@tiptap/react';

/**
 * Uploads an image file or Blob to MinIO storage and returns its proxied URL.
 */
export async function uploadImageFileToStorage(file: File | Blob, customFileName?: string): Promise<string> {
  const formData = new FormData();
  if (file instanceof File) {
    formData.append('file', file);
  } else {
    formData.append('file', file, customFileName || 'image.png');
  }

  // 1. Get a Temporary Upload Token from Go Backend (Authenticated)
  const authRes = await axiosInstance<{ token: string }>({
    url: '/admin/media/upload-token',
    method: 'GET',
  });
  
  const { token } = authRes;

  // 2. Use the proxied /media-api route with public visibility and temporary token
  const response = await axios.post(`/media-api/upload?visibility=public&upload_token=${token}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  const fileName = response.data.file_name;
  return `/media-api/p/${fileName}`;
}

export const handleImageUpload = async (file: File | null, editor: Editor | null) => {
  if (!file) return;

  // Check if it's an image
  if (!file.type.startsWith('image/')) {
    notifications.show({
      title: 'Invalid file',
      message: 'Please upload an image file.',
      color: 'red',
    });
    return;
  }

  const id = notifications.show({
    loading: true,
    title: 'Uploading image',
    message: 'Please wait...',
    autoClose: false,
    withCloseButton: false,
  });

  try {
    const proxiedUrl = await uploadImageFileToStorage(file);

    if (editor) {
      editor.chain().focus().setImage({ src: proxiedUrl }).run();
    }

    notifications.update({
      id,
      color: 'green',
      title: 'Success',
      message: 'Image uploaded and inserted',
      loading: false,
      autoClose: 2000,
    });
  } catch (error: unknown) {
    console.error('Image upload error:', error);
    let message = 'An unknown error occurred';
    if (axios.isAxiosError(error)) {
      message = error.response?.data?.message || error.message;
    }
    notifications.update({
      id,
      color: 'red',
      title: 'Upload failed',
      message,
      loading: false,
      autoClose: 5000,
    });
  }
};
