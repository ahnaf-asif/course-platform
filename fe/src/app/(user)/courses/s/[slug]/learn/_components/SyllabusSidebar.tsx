import { Box, NavLink, Progress, Stack, Text, Title, Group, Badge } from '@mantine/core';
import {
  IconBook,
  IconCheck,
  IconVideo,
  IconFileText,
  IconHelpCircle,
} from '@tabler/icons-react';
import { ExtendedNode } from './utils';

interface SyllabusSidebarProps {
  organizedTree: ExtendedNode[];
  selectedLessonId: string | null;
  activeQuizId: string | null;
  handleSelectLesson: (lessonId: string) => void;
  handleSelectQuiz: (lessonId: string, quizId: string) => void;
  setMobileSidebarOpen?: (open: boolean) => void;
  totalSlidesCount: number;
  currentSlideProgressIndex: number;
}

export function SyllabusSidebar({
  organizedTree,
  selectedLessonId,
  activeQuizId,
  handleSelectLesson,
  handleSelectQuiz,
  setMobileSidebarOpen,
  totalSlidesCount,
  currentSlideProgressIndex,
}: SyllabusSidebarProps) {
  const onSelectLesson = (lessonId: string) => {
    handleSelectLesson(lessonId);
    if (setMobileSidebarOpen) setMobileSidebarOpen(false);
  };

  const onSelectQuiz = (lessonId: string, quizId: string) => {
    handleSelectQuiz(lessonId, quizId);
    if (setMobileSidebarOpen) setMobileSidebarOpen(false);
  };

  const progressPercent = totalSlidesCount > 0 ? Math.min(100, Math.round((currentSlideProgressIndex / totalSlidesCount) * 100)) : 0;

  const renderSyllabusContent = () => (
    <Stack gap="lg">
      {organizedTree.map((subject) => (
        <Box key={subject.id}>
          <Text
            size="xs"
            fw={800}
            c="blue.7"
            style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}
            mb={6}
          >
            {subject.title}
          </Text>
          <Stack gap="xs">
            {subject.children.map((chapter) => (
              <Box key={chapter.id}>
                <Text size="xs" fw={700} c="gray.6" mb={4}>
                  {chapter.title}
                </Text>
                <Stack gap={2}>
                  {chapter.children.flatMap((lesson) => {
                    const isLessonActive = selectedLessonId === lesson.id;
                    const isLessonCompleted = lesson.progress_status === 'COMPLETED';

                    const lessonLink = (
                      <NavLink
                        key={lesson.id}
                        active={isLessonActive && !activeQuizId}
                        label={lesson.title}
                        leftSection={
                          isLessonCompleted ? (
                            <IconCheck size={16} color="#10b981" />
                          ) : lesson.video_url ? (
                            <IconVideo size={16} color={isLessonActive ? '#2563eb' : '#64748b'} />
                          ) : (
                            <IconFileText size={16} color={isLessonActive ? '#2563eb' : '#64748b'} />
                          )
                        }
                        onClick={() => onSelectLesson(lesson.id)}
                        styles={{
                          root: {
                            borderRadius: '8px',
                            padding: '8px 10px',
                            fontSize: '13px',
                            transition: 'all 0.15s ease',
                            backgroundColor:
                              isLessonActive && !activeQuizId
                                ? 'rgba(37, 99, 235, 0.08)'
                                : 'transparent',
                            color:
                              isLessonActive && !activeQuizId
                                ? '#2563eb'
                                : '#334155',
                            fontWeight: isLessonActive && !activeQuizId ? 700 : 500,
                          },
                          label: {
                            whiteSpace: 'normal',
                            wordBreak: 'break-word',
                            lineHeight: 1.4,
                          },
                        }}
                      />
                    );

                    const quizLinks = (lesson.quizzes ?? []).map((quiz) => {
                      const isQuizActive = activeQuizId === quiz.id;
                      const isQuizPassed = quiz.is_passed;
                      return (
                        <NavLink
                          key={quiz.id}
                          active={isQuizActive}
                          label={quiz.title}
                          leftSection={
                            isQuizPassed ? (
                              <IconCheck size={16} color="#10b981" />
                            ) : (
                              <IconHelpCircle size={16} color={isQuizActive ? '#7c3aed' : '#9333ea'} />
                            )
                          }
                          onClick={() => onSelectQuiz(lesson.id, quiz.id)}
                          styles={{
                            root: {
                              borderRadius: '8px',
                              padding: '8px 10px',
                              fontSize: '13px',
                              transition: 'all 0.15s ease',
                              backgroundColor: isQuizActive
                                ? 'rgba(124, 58, 237, 0.08)'
                                : 'transparent',
                              color: isQuizActive
                                ? '#7c3aed'
                                : '#334155',
                              fontWeight: isQuizActive ? 700 : 500,
                            },
                            label: {
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                              lineHeight: 1.4,
                            },
                          }}
                        />
                      );
                    });

                    return [lessonLink, ...quizLinks];
                  })}
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  );

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', color: '#0f172a' }}>
      <Box p="md" style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#fafbfc' }}>
        <Stack gap="xs">
          <Group justify="space-between" align="center">
            <Title order={4} size="h5" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a', fontWeight: 800 }}>
              <IconBook size={18} color="#2563eb" />
              কোর্স সিলেবাস
            </Title>
            <Badge variant="gradient" gradient={{ from: 'blue', to: 'violet' }} size="sm">
              {progressPercent}% সম্পূর্ণ
            </Badge>
          </Group>
          <Group justify="space-between" mb={2} style={{ display: 'flex', width: '100%' }}>
            <Text size="xs" fw={600} c="gray.6">
              পড়াশোনার অগ্রগতি
            </Text>
            <Text size="xs" c="gray.7" fw={700}>
              {currentSlideProgressIndex > 0
                ? `${currentSlideProgressIndex} / ${totalSlidesCount}`
                : `০ / ${totalSlidesCount}`}
            </Text>
          </Group>
          <Progress value={progressPercent} size="xs" radius="xl" color="blue" animated />
        </Stack>
      </Box>

      <Box style={{ flex: 1, overflowY: 'auto' }} p="md">
        {renderSyllabusContent()}
      </Box>
    </Box>
  );
}


