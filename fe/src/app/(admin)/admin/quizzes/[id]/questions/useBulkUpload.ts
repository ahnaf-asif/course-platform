'use client';

import { useState, useEffect } from 'react';
import { useDisclosure, useClipboard } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { axiosInstance } from '@/lib/axios';
import { handleDownloadSample, getAIPrompt } from './questionsUtils';

interface UseBulkUploadProps {
  quizId: string;
  refetch: () => void;
}

export function useBulkUpload({ quizId, refetch }: UseBulkUploadProps) {
  const [uploadTaskId, setUploadTaskId] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'ready'>('idle');
  const [uploadModalOpened, { open: openUploadModal, close: closeUploadModal }] = useDisclosure(false);
  const clipboard = useClipboard({ timeout: 2000 });

  // Polling logic for bulk upload
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (uploadStatus === 'processing' && uploadTaskId) {
      interval = setInterval(async () => {
        try {
          const res = await axiosInstance<{ state: string }>({
            url: `/admin/quizzes/tasks/${uploadTaskId}`,
            method: 'GET'
          });
          
          if (res.state === 'COMPLETED' || res.state === 'success' || res.state === 'finished') {
            notifications.show({ title: 'Success', message: 'Bulk upload completed successfully!', color: 'green' });
            setUploadStatus('ready');
            setUploadTaskId(null);
            refetch();
          } else if (res.state === 'FAILED') {
            notifications.show({ title: 'Failed', message: 'Bulk upload failed. Please check the file format.', color: 'red' });
            setUploadStatus('idle');
            setUploadTaskId(null);
          }
        } catch (err) {
          console.error('Polling task failed:', err);
        }
      }, 3000);
    }

    return () => clearInterval(interval);
  }, [uploadStatus, uploadTaskId, refetch]);

  const handleCopyAIPrompt = () => {
    clipboard.copy(getAIPrompt());
    notifications.show({ title: 'Copied', message: 'AI prompt copied to clipboard!', color: 'green' });
  };

  const handleBulkUpload = async (file: File | null) => {
    if (!file) return;

    setUploadStatus('processing');
    closeUploadModal();
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await axiosInstance<{ task_id: string }>({
        url: `/admin/quizzes/${quizId}/questions/csv`,
        method: 'POST',
        data: formData,
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (res.task_id) {
        setUploadTaskId(res.task_id);
        notifications.show({
          title: 'Upload Started',
          message: 'Your CSV is being processed in the background. We will notify you when it is done.',
          color: 'blue'
        });
      }
    } catch (error) {
      console.error('Bulk upload failed', error);
      notifications.show({
        title: 'Upload Failed',
        message: 'Failed to start bulk upload.',
        color: 'red'
      });
      setUploadStatus('idle');
    }
  };

  return {
    uploadStatus,
    uploadModalOpened,
    openUploadModal,
    closeUploadModal,
    copied: clipboard.copied,
    handleDownloadSample,
    handleCopyAIPrompt,
    handleBulkUpload,
  };
}
