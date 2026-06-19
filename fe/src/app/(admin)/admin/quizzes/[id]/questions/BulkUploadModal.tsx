'use client';

import {
  Modal,
  Stack,
  Alert,
  List,
  Divider,
  Text,
  Group,
  Button,
  FileButton,
  Code,
} from '@mantine/core';
import {
  IconInfoCircle,
  IconDownload,
  IconCopy,
  IconUpload,
} from '@tabler/icons-react';

interface BulkUploadModalProps {
  opened: boolean;
  onClose: () => void;
  handleDownloadSample: () => void;
  handleCopyAIPrompt: () => void;
  handleBulkUpload: (file: File | null) => Promise<void>;
  copied: boolean;
}

export function BulkUploadModal({
  opened,
  onClose,
  handleDownloadSample,
  handleCopyAIPrompt,
  handleBulkUpload,
  copied,
}: BulkUploadModalProps) {
  return (
    <Modal opened={opened} onClose={onClose} title="Bulk Upload Questions (CSV)" size="lg" centered>
      <Stack gap="md">
        <Alert icon={<IconInfoCircle size={16} />} title="CSV Format Requirements" color="blue">
          Your CSV file must have exactly 5 columns in the following order:
          <List type="ordered" size="sm" mt="xs" spacing="xs">
            <List.Item><b>Question Content:</b> The text of the question.</List.Item>
            <List.Item><b>Question Type:</b> Must be exactly <Code>SINGLE</Code> or <Code>MULTIPLE</Code>.</List.Item>
            <List.Item><b>Explanation:</b> (Optional) Explanation shown after answering.</List.Item>
            <List.Item><b>Correct Answers:</b> Pipe-separated list (e.g. <Code>Option A|Option B</Code>).</List.Item>
            <List.Item><b>Incorrect Answers:</b> Pipe-separated list (e.g. <Code>Option C|Option D</Code>).</List.Item>
          </List>
        </Alert>

        <Divider my="sm" />
        <Text size="sm" fw={600}>Generate with AI (ChatGPT, Claude, etc.)</Text>
        <Text size="xs" c="dimmed">
          Don&apos;t want to format the CSV manually? Click &quot;Copy AI Prompt&quot; to get a pre-written instruction block. Paste it into your favorite AI tool along with your topic or source material to instantly generate correctly formatted questions!
        </Text>

        <Group grow>
          <Button variant="light" color="blue" leftSection={<IconDownload size={16} />} onClick={handleDownloadSample}>
            Download Sample CSV
          </Button>
          <Button variant="light" color="teal" leftSection={<IconCopy size={16} />} onClick={handleCopyAIPrompt}>
            {copied ? 'Prompt Copied!' : 'Copy AI Prompt'}
          </Button>
        </Group>

        <Divider my="sm" />

        <Text size="sm" fw={500}>Upload your completed CSV file:</Text>
        <FileButton onChange={handleBulkUpload} accept=".csv">
          {(props) => (
            <Button {...props} color="grape" leftSection={<IconUpload size={16} />} fullWidth>
              Select & Upload CSV
            </Button>
          )}
        </FileButton>
      </Stack>
    </Modal>
  );
}
