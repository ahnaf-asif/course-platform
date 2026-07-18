import { Box, Divider, NavLink, Progress, Stack, Text, Title, Group } from '@mantine/core';
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

  const progressPercent = totalSlidesCount > 0 ? (currentSlideProgressIndex / totalSlidesCount) * 100 : 0;

  const renderSyllabusContent = () => (
    <Stack gap="md">
      {organizedTree.map((subject) => (
        <Box key={subject.id}>
          <Text
            size="xs"
            fw={700}
            c="blue.6"
            style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}
            mb={8}
          >
            {subject.title}
          </Text>
          <Stack gap="xs">
            {subject.children.map((chapter) => (
              <Box key={chapter.id}>
                <Text size="xs" fw={600} c="dimmed" mb={6}>
                  {chapter.title}
                </Text>
                <div
                  style={{
                    borderLeft: '1px solid var(--mantine-color-default-border)',
                    paddingLeft: '8px',
                    marginLeft: '4px',
                  }}
                >
                  <Stack gap={4}>
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
                              <IconCheck size={14} color="var(--mantine-color-green-filled)" />
                            ) : lesson.video_url ? (
                              <IconVideo size={14} />
                            ) : (
                              <IconFileText size={14} />
                            )
                          }
                          onClick={() => onSelectLesson(lesson.id)}
                          styles={{
                            root: {
                              borderRadius: '6px',
                              padding: '8px 10px',
                              fontSize: '13px',
                              transition: 'all 0.2s ease',
                              backgroundColor:
                                isLessonActive && !activeQuizId
                                  ? 'var(--mantine-color-blue-light)'
                                  : 'transparent',
                              color:
                                isLessonActive && !activeQuizId
                                  ? 'var(--mantine-color-blue-filled)'
                                  : 'inherit',
                              fontWeight: isLessonActive && !activeQuizId ? 600 : 400,
                            },
                            label: {
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
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
                                <IconCheck size={14} color="var(--mantine-color-green-filled)" />
                              ) : (
                                <IconHelpCircle size={14} />
                              )
                            }
                            onClick={() => onSelectQuiz(lesson.id, quiz.id)}
                            styles={{
                              root: {
                                borderRadius: '6px',
                                padding: '8px 10px',
                                fontSize: '13px',
                                transition: 'all 0.2s ease',
                                backgroundColor: isQuizActive
                                  ? 'var(--mantine-color-blue-light)'
                                  : 'transparent',
                                color: isQuizActive
                                  ? 'var(--mantine-color-blue-filled)'
                                  : 'inherit',
                                fontWeight: isQuizActive ? 600 : 400,
                              },
                              label: {
                                whiteSpace: 'normal',
                                wordBreak: 'break-word',
                              },
                            }}
                          />
                        );
                      });

                      return [lessonLink, ...quizLinks];
                    })}
                  </Stack>
                </div>
              </Box>
            ))}
          </Stack>
          <Divider my="sm" />
        </Box>
      ))}
    </Stack>
  );

  return (
    <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box p="md" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
        <Stack gap="xs">
          <Title order={4} size="h5" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconBook size={18} color="var(--mantine-color-blue-filled)" />
            Syllabus
          </Title>
          <Group justify="space-between" mb={2} style={{ display: 'flex', width: '100%' }}>
            <Text size="xs" fw={500} c="dimmed">
              Course Progress
            </Text>
            <Text size="xs" c="dimmed" fw={500}>
              {currentSlideProgressIndex > 0
                ? `${currentSlideProgressIndex} / ${totalSlidesCount}`
                : `0 / ${totalSlidesCount}`}
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


