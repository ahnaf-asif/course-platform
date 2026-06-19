'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { axiosInstance } from '@/lib/axios';
import { notifications } from '@mantine/notifications';

interface UseVideoUploadProps {
  value: string;
  onChange: (value: string) => void;
}

export function useVideoUpload({ value, onChange }: UseVideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'processing' | 'ready'>('idle');
  const [taskId, setTaskId] = useState<string | null>(null);

  const isInternalMedia = !!(value && !value.startsWith('http'));

  const checkReadiness = async (id: string) => {
    try {
      const res = await axiosInstance<{ token: string }>({
        url: `/admin/media/token/${id}`,
        method: 'GET'
      });
      const token = res.token;

      // Use relative proxy path for polling
      await axios.head(`/media-api/stream/${id}/index.m3u8?token=${token}`);
      setStatus('ready');
      setTaskId(null);
    } catch {
      setStatus('processing');
    }
  };

  useEffect(() => {
    if (isInternalMedia) {
      queueMicrotask(() => {
        checkReadiness(value);
      });
    }
  }, [value, isInternalMedia]);

  // Polling logic
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (status === 'processing' && (taskId || isInternalMedia)) {
      interval = setInterval(async () => {
        if (taskId) {
          try {
            const res = await axiosInstance<{ state: string }>({
              url: `/admin/media/tasks/${taskId}`,
              method: 'GET'
            });
            if (res.state === 'COMPLETED' || res.state === 'success' || res.state === 'finished') {
              checkReadiness(value);
            } else if (res.state === 'FAILED') {
              notifications.show({ title: 'Processing Failed', message: 'Video transcoding failed.', color: 'red' });
              setStatus('idle');
              setTaskId(null);
            }
          } catch (err) {
            console.error('Polling task failed:', err);
          }
        } else {
          // Fallback to head request polling if no task ID
          checkReadiness(value);
        }
      }, 5000);
    }

    return () => clearInterval(interval);
  }, [status, taskId, value, isInternalMedia]);

  const handleUpload = async (file: File | null) => {
    if (!file) return;

    setUploading(true);
    setProgress(0);

    try {
      // 1. Get a Temporary Upload Token from Go Backend (Authenticated)
      const authRes = await axiosInstance<{ token: string }>({
        url: '/admin/media/upload-token',
        method: 'GET',
      });
      
      const { token } = authRes;

      const formData = new FormData();
      formData.append('file', file);

      // 2. Perform DIRECT UPLOAD to Media Server (via Next.js proxy)
      const response = await axios.post(`/media-api/upload?upload_token=${token}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (ev) => {
          setProgress(Math.round((ev.loaded * 100) / (ev.total || 1)));
        },
      });

      const videoId = response.data.file_name;
      const uploadTaskId = response.data.task_id;
      
      onChange(videoId);
      if (uploadTaskId) {
        setTaskId(uploadTaskId);
      }
      setStatus('processing');
      notifications.show({
        title: 'Upload Successful',
        message: 'Video is being processed for secure streaming.',
        color: 'green',
      });
    } catch (error: unknown) {
      console.error('Upload failed:', error);
      let message = 'Failed to upload video';
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || error.message;
      }
      notifications.show({ title: 'Error', message, color: 'red' });
    } finally {
      setUploading(false);
    }
  };

  return {
    uploading,
    progress,
    status,
    isInternalMedia,
    handleUpload,
  };
}
