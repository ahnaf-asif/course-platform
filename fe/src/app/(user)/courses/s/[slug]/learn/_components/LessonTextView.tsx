import { Box, Button, Divider, Stack, Text, Title, Container } from '@mantine/core';
import { IconCheck } from '@tabler/icons-react';
import { MathJaxContent } from '@/components/MathJaxContent';
import { parseHTMLContent } from './utils';

interface LessonTextViewProps {
  lessonDetails: {
    title: string;
    text_content?: string | null;
  };
  selectedLessonId: string | null;
  currentTreeNode: {
    progress_status?: string | null;
  } | null | undefined;
  updateProgress: (nodeId: string, status: 'STARTED' | 'COMPLETED') => Promise<void>;
  isPendingProgress: boolean;
}

export function LessonTextView({
  lessonDetails,
  selectedLessonId,
  currentTreeNode,
  updateProgress,
  isPendingProgress,
}: LessonTextViewProps) {
  const isCompleted = currentTreeNode?.progress_status === 'COMPLETED';

  return (
    <Box py={{ base: 'md', md: 'xl' }} px={{ base: 'xs', sm: 'md' }} style={{ width: '100%' }}>
      <Container size="md" px={{ base: 0, sm: 'md' }} style={{ maxWidth: '840px', width: '100%' }}>
        <Stack gap="xl" px={{ base: 'md', sm: 0 }}>
          <Box>
            <Text size="xs" fw={700} c="blue.6" style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
              Reading Material
            </Text>
            <Title order={1} size="h2" mt={4} style={{ fontWeight: 800 }}>
              {lessonDetails.title}
            </Title>
          </Box>

          <Divider />

          <Box style={{ minHeight: '250px' }}>
            {lessonDetails.text_content ? (
              <MathJaxContent html={parseHTMLContent(lessonDetails.text_content)} />
            ) : (
              <Text c="dimmed" style={{ fontStyle: 'italic' }}>
                No written content for this lesson.
              </Text>
            )}
          </Box>

          <Box mt="xl">
            <Button
              color={isCompleted ? 'green' : 'blue'}
              variant={isCompleted ? 'light' : 'filled'}
              leftSection={<IconCheck size={16} />}
              onClick={() => {
                if (selectedLessonId) {
                  updateProgress(selectedLessonId, 'COMPLETED');
                }
              }}
              loading={isPendingProgress}
            >
              {isCompleted ? 'Completed' : 'Mark as Completed'}
            </Button>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
