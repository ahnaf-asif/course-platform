'use client';

import { useState, useEffect, useRef } from 'react';
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
  Modal,
  AspectRatio,
  Center,
  Loader,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
  IconVideo, 
  IconUpload, 
  IconTrash, 
  IconCheck, 
  IconLoader2,
  IconPlayerPlay,
} from '@tabler/icons-react';
import axios from 'axios';
import Hls from 'hls.js';
import { axiosInstance } from '@/lib/axios';
import { notifications } from '@mantine/notifications';

interface VideoUploadProps {
  value: string;
  onChange: (value: string) => void;
}

// Sub-component to handle secure player initialization safely inside Modal
function PreviewPlayer({ videoId }: { videoId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let hls: Hls | null = null;

    const initPlayer = async () => {
      if (!videoRef.current) return;

      try {
        setLoading(true);
        // 1. Get secure token from Go Backend (Authenticated)
        const res = await axiosInstance<{ token: string }>({
          url: `/admin/media/token/${videoId}`,
          method: 'GET'
        });
        
        const token = res.token;
        // Use relative proxy path for manifest
        const manifestUrl = `/media-api/stream/${videoId}/index.m3u8?token=${token}`;

        // 2. Initialize Hls.js
        if (Hls.isSupported()) {
          hls = new Hls();
          hls.loadSource(manifestUrl);
          hls.attachMedia(videoRef.current);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setLoading(false);
            videoRef.current?.play().catch(() => console.log("Autoplay blocked"));
          });
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              setError("Failed to load video stream");
            }
          });
        } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          // Native Safari support
          videoRef.current.src = manifestUrl;
          videoRef.current.addEventListener('loadedmetadata', () => {
            setLoading(false);
            videoRef.current?.play().catch(() => console.log("Autoplay blocked"));
          });
        }
      } catch (err) {
        console.error('Failed to init preview:', err);
        setError("Could not acquire secure playback token");
      }
    };

    initPlayer();

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [videoId]);

  if (error) {
    return (
      <Center h="100%" bg="dark.8" style={{ borderRadius: '4px' }}>
        <Text c="red" size="sm">{error}</Text>
      </Center>
    );
  }

  return (
    <Box pos="relative" h="100%" w="100%">
      {loading && (
        <Center pos="absolute" inset={0} bg="dark.8" style={{ zIndex: 1, borderRadius: '4px' }}>
          <Loader size="sm" color="blue" />
        </Center>
      )}
      <video 
        ref={videoRef} 
        controls 
        style={{ width: '100%', height: '100%', backgroundColor: 'black', borderRadius: '4px' }}
      />
    </Box>
  );
}

export default function VideoUpload({ value, onChange }: VideoUploadProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'idle' | 'processing' | 'ready'>('idle');
  const [taskId, setTaskId] = useState<string | null>(null);

  const isInternalMedia = value && !value.startsWith('http');

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
            <Text size="xs" c="dimmed">Direct Upload (Secure & High Performance)</Text>
          </Group>
        )}

        {uploading && (
          <Box>
            <Group justify="space-between" mb={5}>
              <Text size="xs">Uploading...</Text>
              <Text size="xs">{progress}%</Text>
            </Group>
            <Progress value={progress} size="sm" animated />
          </Box>
        )}

        {value && !uploading && (
          <Stack gap={5}>
            <Group gap="xs" wrap="nowrap" justify="space-between">
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

              {status === 'ready' && (
                <Button 
                  size="compact-xs" 
                  variant="filled" 
                  color="blue" 
                  leftSection={<IconPlayerPlay size={10} />}
                  onClick={open}
                >
                  Preview
                </Button>
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

      <Modal 
        opened={opened} 
        onClose={close} 
        title="Video Preview" 
        size="lg"
        centered
        overlayProps={{ blur: 3 }}
      >
        <AspectRatio ratio={16 / 9}>
          {opened && <PreviewPlayer videoId={value} />}
        </AspectRatio>
      </Modal>
    </Paper>
  );
}
