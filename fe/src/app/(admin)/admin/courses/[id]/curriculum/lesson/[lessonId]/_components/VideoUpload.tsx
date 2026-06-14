'use client';

import { useState, useEffect } from 'react';
import {
  Group,
  Text,
  Button,
  FileButton,
  Progress,
  Badge,
  Stack,
  Paper,
  ActionIcon,
  Tooltip,
  Box,
} from '@mantine/core';
import { 
  IconVideo, 
  IconUpload, 
  IconTrash, 
  IconCheck, 
  IconLoader2,
} from '@tabler/icons-react';
import axios from 'axios';
import { axiosInstance } from '@/lib/axios';
import { notifications } from '@mantine/notifications';

interface VideoUploadProps {
  value: string;
  onChange: (value: string) => void;
}

export default function VideoUpload({ value, onChange }: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'processing' | 'ready'>('idle');

  const isInternalMedia = value && !value.startsWith('http');

  const checkReadiness = async (id: string) => {
    try {
      // 1. Get secure token from Go Backend (Authenticated)
      const res = await axiosInstance<{ token: string }>({
        url: `/admin/media/token/${id}`,
        method: 'GET'
      });
      const token = res.token;

      // 2. Check manifest readiness on Media Server (via Next.js proxy)
      // This is a HEAD request, so we use raw axios to avoid base URL interference
      await axios.head(`/media-api/stream/${id}/index.m3u8?token=${token}`);
      setStatus('ready');
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

  const handleUpload = async (file: File | null) => {
    if (!file) return;

    setUploading(true);
    setProgress(0);

    try {
      // 1. Get a Signed S3 Upload URL from Go Backend (Authenticated)
      const authRes = await axiosInstance<{ upload_url: string, file_name: string }>({
        url: '/admin/media/upload-url',
        method: 'GET',
        params: { file_name: file.name }
      });
      
      const { upload_url, file_name } = authRes;

      // 2. Perform DIRECT BINARY UPLOAD to Storage (Zero server-side overhead)
      // We map the internal URL to the actual public-facing Minio port
      const directUploadUrl = upload_url.replace(/minio:9000/, 'localhost:9000');

      await axios.put(directUploadUrl, file, {
        headers: {
          'Content-Type': file.type,
        },
        onUploadProgress: (ev) => {
          setProgress(Math.round((ev.loaded * 100) / (ev.total || 1)));
        },
      });

      // 3. Trigger Transcoding on Media Server (via Go API proxy)
      await axiosInstance({
        url: '/admin/media/transcode',
        method: 'POST',
        data: { file_name: file_name }
      });

      onChange(file_name);
      setStatus('processing');
      notifications.show({
        title: 'Upload Successful',
        message: 'Direct upload complete. Video is being transcoded.',
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

  return (
    <Paper withBorder p="md" radius="md" bg="gray.0">
      <Stack gap="sm">
        <Group justify="space-between">
          <Group gap="xs">
            <IconVideo size={20} color="var(--mantine-color-blue-filled)" />
            <Text fw={500} size="sm">Lesson Video</Text>
          </Group>
          {value && (
            <Tooltip label="Remove Video">
              <ActionIcon variant="light" color="red" onClick={() => onChange('')}>
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>

        {!value && !uploading && (
          <Group>
            <FileButton onChange={handleUpload} accept="video/mp4,video/quicktime,video/x-msvideo">
              {(props) => (
                <Button {...props} variant="light" leftSection={<IconUpload size={16} />}>
                  Upload Video
                </Button>
              )}
            </FileButton>
            <Text size="xs" c="dimmed">Direct S3 Upload (High Performance)</Text>
          </Group>
        )}

        {uploading && (
          <Box>
            <Group justify="space-between" mb={5}>
              <Text size="xs">Uploading Directly to Storage...</Text>
              <Text size="xs">{progress}%</Text>
            </Group>
            <Progress value={progress} size="sm" animated />
          </Box>
        )}

        {value && !uploading && (
          <Stack gap={5}>
            <Group gap="xs">
              <Text size="xs" fw={700} style={{ wordBreak: 'break-all' }}>
                ID: <span style={{ fontWeight: 400 }}>{value}</span>
              </Text>
              {status === 'ready' ? (
                <Badge color="green" variant="light" leftSection={<IconCheck size={10} />}>
                  Ready
                </Badge>
              ) : isInternalMedia ? (
                <Badge color="blue" variant="light" leftSection={<IconLoader2 size={10} className="animate-spin" />}>
                  Processing
                </Badge>
              ) : (
                <Badge color="gray" variant="light">External URL</Badge>
              )}
            </Group>
            {status === 'processing' && (
              <Text size="xs" c="dimmed">
                Transcoding usually takes 1-2 minutes. You can still save the lesson.
              </Text>
            )}
          </Stack>
        )}
      </Stack>
    </Paper>
  );
}
