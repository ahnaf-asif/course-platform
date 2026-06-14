'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Container,
  Title,
  Stack,
  Button,
  Group,
  Text,
  Paper,
  Code,
  Box,
  Alert,
  FileButton,
  Progress,
  Badge,
  Timeline,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { 
  IconVideo, 
  IconLoader2, 
  IconCheck, 
  IconAlertCircle,
  IconKey
} from '@tabler/icons-react';
import axios from 'axios';
import Hls from 'hls.js';

export default function VideoTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'ready' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [streamToken, setStreamToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  // 1. Handle Video Upload
  const handleUpload = async () => {
    if (!file) return;

    setStatus('uploading');
    setUploadProgress(0);
    setError(null);
    setStreamToken(null);
    setVideoId(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/media-api/upload', formData, {
        headers: {
          'X-API-KEY': 'secret-api-key',
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setUploadProgress(percentCompleted);
        },
      });

      const fileName = response.data.file_name;
      setVideoId(fileName);
      setStatus('processing');
      
      notifications.show({
        title: 'Upload Successful',
        message: 'Transcoding has started in the background.',
        color: 'green',
      });

      // Start polling for token/manifest readiness
      pollForReadiness(fileName);
    } catch (err: unknown) {
      setStatus('error');
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || err.message);
      } else {
        setError(String(err));
      }
    }
  };

  // 2. Poll for readiness (Wait for HLS manifest to exist and get token)
  const pollForReadiness = async (id: string) => {
    let attempts = 0;
    const maxAttempts = 150; // 5 minutes max wait (150 * 2s)

    const check = async () => {
      try {
        // Try to get a stream token
        const tokenRes = await axios.get(`/media-api/stream-token/${id}`, {
          headers: { 'X-API-KEY': 'secret-api-key' }
        });

        const token = tokenRes.data.token;
        
        // Verify manifest existence via HEAD request
        await axios.head(`/media-api/stream/${id}/index.m3u8?token=${token}`);
        
        setStreamToken(token);
        setStatus('ready');
        notifications.show({
          title: 'Video Ready',
          message: 'Transcoding complete. You can now play the video.',
          color: 'green',
        });
      } catch {
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(check, 2000); // Check every 2 seconds
        } else {
          setStatus('error');
          setError('Transcoding took too long (over 5 mins). Please check media-server logs.');
        }
      }
    };

    check();
  };

  // 3. Initialize HLS Player when ready
  useEffect(() => {
    if (status === 'ready' && videoId && streamToken && videoRef.current) {
      const manifestUrl = `/media-api/stream/${videoId}/index.m3u8?token=${streamToken}`;
      
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(manifestUrl);
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoRef.current?.play().catch(() => console.log("Autoplay prevented"));
        });
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // For Safari
        videoRef.current.src = manifestUrl;
      }
    }
  }, [status, videoId, streamToken]);

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <Title order={1}>Automated Video Pipeline Test</Title>

        <Paper withBorder p="xl" radius="md">
          <Stack gap="lg">
            <Timeline active={status === 'ready' ? 3 : status === 'processing' ? 2 : status === 'uploading' ? 1 : 0} bulletSize={24} lineWidth={2}>
              <Timeline.Item bullet={<IconVideo size={14} />} title="Select & Upload">
                <Text size="sm" c="dimmed">Upload an MP4 video to trigger the pipeline.</Text>
                {status === 'idle' && (
                  <Group mt="md">
                    <FileButton onChange={setFile} accept="video/mp4">
                      {(props) => (
                        <Button {...props} variant="light" leftSection={<IconVideo size={16} />}>
                          {file ? file.name : 'Select Video'}
                        </Button>
                      )}
                    </FileButton>
                    <Button onClick={handleUpload} disabled={!file}>Start Process</Button>
                  </Group>
                )}
                {status === 'uploading' && (
                  <Box mt="md">
                    <Text size="xs" mb={5}>Uploading... {uploadProgress}%</Text>
                    <Progress value={uploadProgress} animated />
                  </Box>
                )}
              </Timeline.Item>

              <Timeline.Item bullet={status === 'processing' ? <IconLoader2 size={14} className="animate-spin" /> : <IconCheck size={14} />} title="HLS Transcoding">
                <Text size="sm" c="dimmed">Media server is splitting the video into encrypted segments.</Text>
                {status === 'processing' && (
                  <Badge variant="dot" color="blue" mt="sm">Asynchronous Worker Running...</Badge>
                )}
              </Timeline.Item>

              <Timeline.Item bullet={<IconKey size={14} />} title="Security & Playback">
                <Text size="sm" c="dimmed">Acquiring HMAC token and initializing HLS player.</Text>
                {status === 'ready' && <Badge color="green" mt="sm">Secure Playback Active</Badge>}
              </Timeline.Item>
            </Timeline>

            {error && (
              <Alert icon={<IconAlertCircle size="1rem" />} title="Error" color="red" variant="filled">
                {error}
              </Alert>
            )}

            {status === 'ready' && (
              <Stack gap="md" mt="xl">
                <Box pos="relative" style={{ borderRadius: '8px', overflow: 'hidden', backgroundColor: '#000' }}>
                  <video 
                    ref={videoRef} 
                    controls 
                    style={{ width: '100%', display: 'block' }}
                  />
                </Box>
                
                <Paper withBorder p="sm" bg="gray.0">
                  <Text size="xs" fw={700} mb={5}>Generated Secure Source:</Text>
                  <Code block color="blue">
                    {`/media-api/stream/${videoId}/index.m3u8?token=${streamToken}`}
                  </Code>
                </Paper>
              </Stack>
            )}
          </Stack>
        </Paper>

        <Button variant="subtle" color="gray" onClick={() => window.location.reload()}>
          Test Another Video
        </Button>
      </Stack>
    </Container>
  );
}
