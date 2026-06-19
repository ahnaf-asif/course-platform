import { notifications } from '@mantine/notifications';
import { axiosInstance } from '@/lib/axios';
import axios from 'axios';
import { Editor } from '@tiptap/react';

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

  const formData = new FormData();
  formData.append('file', file);

  const id = notifications.show({
    loading: true,
    title: 'Uploading image',
    message: 'Please wait...',
    autoClose: false,
    withCloseButton: false,
  });

  try {
    // 1. Get a Temporary Upload Token from Go Backend (Authenticated)
    // This hides the master API_KEY from the browser
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

    // Get the file name from response and construct the proxy path
    const fileName = response.data.file_name;
    const proxiedUrl = `/media-api/p/${fileName}`;

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
