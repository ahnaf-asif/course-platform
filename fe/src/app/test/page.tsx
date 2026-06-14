'use client';

import { useState } from 'react';
import {
  Container,
  Title,
  Stack,
  Button,
  Group,
  Text,
  Paper,
  TextInput,
  Code,
  Box,
  Alert,
  FileButton,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconUpload, IconPlayerPlay, IconKey, IconAlertCircle } from '@tabler/icons-react';
import axios from 'axios';

export default function TestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResponse, setUploadResponse] = useState<any>(null);

  const [videoId, setVideoId] = useState('');
  const [tokenLoading, setTokenLoading] = useState(false);
  const [streamToken, setStreamToken] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadResponse(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Note: We use the proxied /media-api route and set visibility to public for testing
      const response = await axios.post('/media-api/upload?visibility=public', formData, {
        headers: {
          'X-API-KEY': 'secret-api-key', 
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = response.data;
      // Map the backend's absolute URL to the frontend proxy path
      if (data.public_url) {
        data.proxied_public_url = data.public_url.replace('http://localhost:8081/api/v1', '/media-api');
      }

      setUploadResponse(data);
      notifications.show({
        title: 'Success',
        message: 'File uploaded successfully',
        color: 'green',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      notifications.show({
        title: 'Upload Failed',
        message: error.response?.data?.message || error.message,
        color: 'red',
        icon: <IconAlertCircle size="1.1rem" />,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleGetToken = async () => {
    if (!videoId) return;

    setTokenLoading(true);
    setStreamToken(null);

    try {
      const response = await axios.get(`/media-api/stream-token/${videoId}`, {
        headers: {
          'X-API-KEY': 'secret-api-key',
        },
      });

      setStreamToken(response.data.token);
      notifications.show({
        title: 'Token Generated',
        message: 'Stream token acquired successfully',
        color: 'blue',
      });
    } catch (error: any) {
      console.error('Token error:', error);
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || error.message,
        color: 'red',
      });
    } finally {
      setTokenLoading(false);
    }
  };

  return (
    <Container size="sm" py="xl">
      <Stack gap="xl">
        <Title order={1}>Media Server Test Page</Title>

        {/* Upload Test Section */}
        <Paper withBorder p="md" radius="md">
          <Stack gap="md">
            <Title order={3}>1. Test File Upload</Title>
            <Text size="sm" c="dimmed">
              Upload a file to the media server. If it's a video, transcoding will start automatically in the background.
            </Text>

            <Group align="flex-end">
              <FileButton onChange={setFile}>
                {(props) => (
                  <Button {...props} variant="light" leftSection={<IconUpload size={16} />}>
                    Pick File
                  </Button>
                )}
              </FileButton>
              <Button 
                onClick={handleUpload} 
                disabled={!file} 
                loading={uploading}
              >
                Upload to Media Server
              </Button>
            </Group>

            {file && (
              <Text size="sm" mt="sm">
                Picked file: <Code>{file.name}</Code> ({Math.round(file.size / 1024)} KB)
              </Text>
            )}

            {uploadResponse && (
              <Box mt="md">
                <Text size="sm" fw={500} mb={5}>Upload Response:</Text>
                <Code block>{JSON.stringify(uploadResponse, null, 2)}</Code>
                {uploadResponse.proxied_public_url && (
                  <Alert icon={<IconAlertCircle size="1rem" />} title="Public URL (Proxied)" mt="md" color="blue">
                    <Text size="xs" component="a" href={uploadResponse.proxied_public_url} target="_blank">
                      {window.location.origin + uploadResponse.proxied_public_url}
                    </Text>
                  </Alert>
                )}
              </Box>
            )}
          </Stack>
        </Paper>

        {/* Stream Token Test Section */}
        <Paper withBorder p="md" radius="md">
          <Stack gap="md">
            <Title order={3}>2. Test Stream Token</Title>
            <Text size="sm" c="dimmed">
              Get a secure playback token for a video.
            </Text>

            <Group align="flex-end">
              <TextInput
                label="Video ID (e.g., file_name.mp4)"
                placeholder="Paste file_name from upload response"
                value={videoId}
                onChange={(e) => setVideoId(e.currentTarget.value)}
                style={{ flex: 1 }}
              />
              <Button 
                onClick={handleGetToken} 
                loading={tokenLoading} 
                disabled={!videoId}
                leftSection={<IconKey size={16} />}
              >
                Get Token
              </Button>
            </Group>

            {streamToken && (
              <Box mt="md">
                <Text size="sm" fw={500} mb={5}>Playback Token:</Text>
                <Code block>{streamToken}</Code>
                
                <Text size="sm" fw={500} mt="md" mb={5}>HLS Manifest URL:</Text>
                <Code block>
                  {`/media-api/stream/${videoId}/index.m3u8?token=${streamToken}`}
                </Code>

                <Alert mt="md" color="violet" icon={<IconPlayerPlay size={16} />} title="Player Ready">
                  The HLS manifest URL is ready. You can test it in an HLS-capable player.
                </Alert>
              </Box>
            )}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
}
