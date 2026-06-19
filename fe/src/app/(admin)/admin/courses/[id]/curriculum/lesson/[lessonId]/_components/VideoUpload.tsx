'use client';

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
import { useVideoUpload } from './useVideoUpload';
import { PreviewPlayer } from './PreviewPlayer';

interface VideoUploadProps {
  value: string;
  onChange: (value: string) => void;
}

export default function VideoUpload({ value, onChange }: VideoUploadProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const {
    uploading,
    progress,
    status,
    isInternalMedia,
    handleUpload,
  } = useVideoUpload({ value, onChange });

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
