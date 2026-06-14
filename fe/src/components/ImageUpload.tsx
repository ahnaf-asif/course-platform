'use client';

import { useState } from 'react';
import {
  Group,
  Text,
  Button,
  FileButton,
  Progress,
  Stack,
  Paper,
  ActionIcon,
  Tooltip,
  Box,
  Image,
  Center,
} from '@mantine/core';
import { 
  IconPhoto, 
  IconUpload, 
  IconTrash, 
} from '@tabler/icons-react';
import axios from 'axios';
import { axiosInstance } from '@/lib/axios';
import { notifications } from '@mantine/notifications';

interface ImageUploadProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  description?: string;
}

export default function ImageUpload({ value, onChange, label, description }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleUpload = async (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      notifications.show({
        title: 'Invalid file',
        message: 'Please upload an image file.',
        color: 'red',
      });
      return;
    }

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
      // Use visibility=public for direct access URLs
      const response = await axios.post(`/media-api/upload?visibility=public&upload_token=${token}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (ev) => {
          setProgress(Math.round((ev.loaded * 100) / (ev.total || 1)));
        },
      });

      // Get the public URL from response
      // Standardize on the proxied path
      const imageUrl = response.data.public_url;
      const proxiedUrl = imageUrl.replace('http://localhost:8081/api/v1', '/media-api');

      onChange(proxiedUrl);
      
      notifications.show({
        title: 'Upload Successful',
        message: 'Image has been uploaded and set as thumbnail.',
        color: 'green',
      });
    } catch (error: unknown) {
      console.error('Upload failed:', error);
      let message = 'Failed to upload image';
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || error.message;
      }
      notifications.show({ title: 'Error', message, color: 'red' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Stack gap={5}>
      {label && <Text size="sm" fw={500}>{label}</Text>}
      {description && <Text size="xs" c="dimmed">{description}</Text>}
      
      <Paper withBorder p="md" radius="md" bg="gray.0">
        <Stack gap="sm">
          {value ? (
            <Box pos="relative">
              <Image 
                src={value.startsWith('/') ? value : value} 
                alt="Preview" 
                radius="md" 
                fit="contain"
                mah={200}
                fallbackSrc="https://placehold.co/600x400?text=Error+Loading+Image"
              />
              <Group pos="absolute" top={10} right={10}>
                <Tooltip label="Remove Image">
                  <ActionIcon variant="filled" color="red" onClick={() => onChange('')} size="lg">
                    <IconTrash size={18} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </Box>
          ) : (
            <Center h={150} style={{ border: '2px dashed var(--mantine-color-gray-3)', borderRadius: '8px' }}>
              {!uploading ? (
                <Stack align="center" gap={5}>
                  <IconPhoto size={40} color="var(--mantine-color-gray-4)" />
                  <FileButton onChange={handleUpload} accept="image/png,image/jpeg,image/gif,image/webp">
                    {(props) => (
                      <Button {...props} variant="light" leftSection={<IconUpload size={16} />}>
                        Upload Thumbnail
                      </Button>
                    )}
                  </FileButton>
                  <Text size="xs" c="dimmed">PNG, JPG, WebP up to 10MB</Text>
                </Stack>
              ) : (
                <Stack w="80%" align="center" gap={5}>
                  <Text size="xs">Uploading... {progress}%</Text>
                  <Progress value={progress} size="sm" animated w="100%" />
                </Stack>
              )}
            </Center>
          )}
        </Stack>
      </Paper>
    </Stack>
  );
}
