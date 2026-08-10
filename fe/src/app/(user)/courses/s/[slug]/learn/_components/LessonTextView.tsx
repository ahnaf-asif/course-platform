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
    <Box py={{ base: 'xs', sm: 'md' }} px={0} style={{ width: '100%', backgroundColor: '#ffffff', minHeight: '100%' }}>
      <Container size="md" px={{ base: 'xs', sm: 'md' }} style={{ maxWidth: '840px', width: '100%' }}>
        <Stack gap="md">
          <Box>
            <Text size="xs" fw={800} c="blue.6" style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
              লেকচার নোট ও রিভিশন শিট
            </Text>
            <Title order={1} size="h3" mt={4} style={{ fontWeight: 800, color: '#0f172a' }}>
              {lessonDetails.title}
            </Title>
          </Box>

          <Divider color="#e2e8f0" />

          <Box style={{ minHeight: '180px', lineHeight: 1.8, fontSize: '15px', color: '#334155' }}>
            {lessonDetails.text_content ? (
              <MathJaxContent html={parseHTMLContent(lessonDetails.text_content)} />
            ) : (
              <Text c="dimmed" style={{ fontStyle: 'italic' }}>
                এই লেকচারের জন্য কোনো লিখিত কন্টেন্ট পাওয়া যায়নি।
              </Text>
            )}
          </Box>

          <Box mt="md" pb="xs">
            <Button
              variant={isCompleted ? 'light' : 'gradient'}
              gradient={isCompleted ? undefined : { from: 'blue', to: 'violet' }}
              color={isCompleted ? 'green' : undefined}
              leftSection={<IconCheck size={18} />}
              size="md"
              radius="md"
              onClick={() => {
                if (selectedLessonId) {
                  updateProgress(selectedLessonId, 'COMPLETED');
                }
              }}
              loading={isPendingProgress}
              style={{ fontWeight: 700 }}
            >
              {isCompleted ? 'পড়া সম্পন্ন হয়েছে' : 'পড়া সম্পন্ন হিসেবে চিহ্নিত করুন'}
            </Button>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}
