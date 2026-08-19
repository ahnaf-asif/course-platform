'use client';

import React, { useState, useMemo } from 'react';
import {
  Box,
  Progress,
  Stack,
  Text,
  Title,
  Group,
  Badge,
  Collapse,
  UnstyledButton,
  ThemeIcon,
} from '@mantine/core';
import {
  IconBook,
  IconBooks,
  IconCheck,
  IconVideo,
  IconFileText,
  IconChevronDown,
  IconFolder,
  IconFolderOpen,
  IconPlayerPlay,
  IconAward,
  IconLayoutList,
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
  // Track open/collapsed subjects and chapters with initial open state
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>(() => {
    const initSubjects: Record<string, boolean> = {};
    organizedTree.forEach((sub, idx) => {
      initSubjects[sub.id] = idx === 0;
    });
    return initSubjects;
  });

  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>(() => {
    const initChapters: Record<string, boolean> = {};
    organizedTree.forEach((sub, idx) => {
      sub.children.forEach((chap, cIdx) => {
        initChapters[chap.id] = idx === 0 && cIdx === 0;
      });
    });
    return initChapters;
  });

  // Adjust state when selectedLessonId prop changes (React recommended pattern)
  const [prevLessonId, setPrevLessonId] = useState(selectedLessonId);
  if (selectedLessonId !== prevLessonId) {
    setPrevLessonId(selectedLessonId);
    if (selectedLessonId) {
      for (const subject of organizedTree) {
        for (const chapter of subject.children) {
          const hasActiveLesson = chapter.children.some((l) => l.id === selectedLessonId);
          if (hasActiveLesson) {
            setExpandedSubjects((prev) => ({ ...prev, [subject.id]: true }));
            setExpandedChapters((prev) => ({ ...prev, [chapter.id]: true }));
            break;
          }
        }
      }
    }
  }

  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [subjectId]: !prev[subjectId],
    }));
  };

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }));
  };

  const toggleExpandAll = () => {
    const allSubjectsOpen = organizedTree.every((s) => expandedSubjects[s.id]);
    const nextSubjects: Record<string, boolean> = {};
    const nextChapters: Record<string, boolean> = {};

    organizedTree.forEach((s) => {
      nextSubjects[s.id] = !allSubjectsOpen;
      s.children.forEach((c) => {
        nextChapters[c.id] = !allSubjectsOpen;
      });
    });

    setExpandedSubjects(nextSubjects);
    setExpandedChapters(nextChapters);
  };

  const onSelectLesson = (lessonId: string) => {
    handleSelectLesson(lessonId);
    if (setMobileSidebarOpen) setMobileSidebarOpen(false);
  };

  const onSelectQuiz = (lessonId: string, quizId: string) => {
    handleSelectQuiz(lessonId, quizId);
    if (setMobileSidebarOpen) setMobileSidebarOpen(false);
  };

  const progressPercent =
    totalSlidesCount > 0
      ? Math.min(100, Math.round((currentSlideProgressIndex / totalSlidesCount) * 100))
      : 0;

  // Calculate total completed count
  const completedStats = useMemo(() => {
    let completedLessons = 0;
    let totalLessons = 0;

    organizedTree.forEach((sub) => {
      sub.children.forEach((chap) => {
        chap.children.forEach((les) => {
          totalLessons++;
          if (les.progress_status === 'COMPLETED') {
            completedLessons++;
          }
        });
      });
    });

    return { completedLessons, totalLessons };
  }, [organizedTree]);

  const isAllExpanded = organizedTree.length > 0 && organizedTree.every((s) => expandedSubjects[s.id]);

  return (
    <Box
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        color: '#0f172a',
      }}
      data-testid="syllabus-sidebar-container"
    >
      {/* Top Header & Progress Card */}
      <Box
        p="md"
        style={{
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#fafbfc',
        }}
      >
        <Stack gap="xs">
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <ThemeIcon size={28} radius="md" color="blue" variant="light">
                <IconBook size={16} />
              </ThemeIcon>
              <Title order={4} size="h5" style={{ color: '#0f172a', fontWeight: 800, letterSpacing: '-0.2px' }}>
                কোর্স সিলেবাস
              </Title>
            </Group>

            <Badge
              variant="gradient"
              gradient={{ from: 'blue', to: 'indigo' }}
              size="sm"
              radius="md"
              style={{ fontWeight: 700 }}
            >
              {progressPercent}% সম্পূর্ণ
            </Badge>
          </Group>

          {/* Progress Details */}
          <Box
            p="xs"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #f1f5f9',
            }}
          >
            <Group justify="space-between" align="center" mb={6}>
              <Text size="xs" fw={600} c="gray.6">
                পড়াশোনার অগ্রগতি
              </Text>
              <Text size="xs" c="blue.7" fw={700}>
                {completedStats.completedLessons} / {completedStats.totalLessons || totalSlidesCount} পাঠ সম্পন্ন
              </Text>
            </Group>
            <Progress
              value={progressPercent}
              size="xs"
              radius="xl"
              color="blue"
              animated={progressPercent > 0 && progressPercent < 100}
            />
          </Box>

          {/* Quick Actions (Expand/Collapse All) */}
          <Group justify="space-between" align="center" pt={2}>
            <Text size="xs" c="dimmed" fw={600}>
              {organizedTree.length} টি বিষয় অন্তর্ভুক্ত
            </Text>
            <UnstyledButton
              onClick={toggleExpandAll}
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              <IconLayoutList size={13} />
              {isAllExpanded ? 'সব বন্ধ করুন' : 'সব খুলুন'}
            </UnstyledButton>
          </Group>
        </Stack>
      </Box>

      {/* Accordion Course Syllabus Tree */}
      <Box
        style={{
          flex: 1,
          overflowY: 'auto',
          scrollBehavior: 'smooth',
        }}
        p="sm"
      >
        <Stack gap="xs">
          {organizedTree.map((subject) => {
            const isSubOpen = !!expandedSubjects[subject.id];
            const totalSubjectLessons = subject.children.reduce(
              (acc, chap) => acc + chap.children.length,
              0
            );

            return (
              <Box
                key={subject.id}
                style={{
                  borderRadius: '10px',
                  border: isSubOpen ? '1px solid #e2e8f0' : '1px solid #f1f5f9',
                  backgroundColor: isSubOpen ? '#fafbfc' : '#ffffff',
                  transition: 'all 0.2s ease',
                  overflow: 'hidden',
                }}
              >
                {/* Subject Accordion Header */}
                <UnstyledButton
                  onClick={() => toggleSubject(subject.id)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: isSubOpen ? 'rgba(241, 245, 249, 0.8)' : 'transparent',
                    transition: 'background-color 0.15s ease',
                  }}
                  data-testid={`subject-toggle-${subject.id}`}
                >
                  <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
                    <ThemeIcon
                      size={24}
                      radius="md"
                      variant="light"
                      color={isSubOpen ? 'blue' : 'gray'}
                    >
                      <IconBooks size={14} />
                    </ThemeIcon>
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        size="xs"
                        fw={700}
                        c={isSubOpen ? 'blue.9' : 'gray.8'}
                        style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.3,
                        }}
                      >
                        {subject.title}
                      </Text>
                      <Text size="10px" c="dimmed" fw={500}>
                        {subject.children.length} টি অধ্যায় • {totalSubjectLessons} টি পাঠ
                      </Text>
                    </Box>
                  </Group>

                  <IconChevronDown
                    size={16}
                    color="#64748b"
                    style={{
                      transform: isSubOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease',
                      flexShrink: 0,
                    }}
                  />
                </UnstyledButton>

                {/* Subject Content Collapse */}
                <Collapse expanded={isSubOpen}>
                  <Box p="xs" style={{ borderTop: '1px solid #f1f5f9', backgroundColor: '#ffffff' }}>
                    <Stack gap="xs">
                      {subject.children.map((chapter) => {
                        const isChapOpen = !!expandedChapters[chapter.id];
                        const chapterCompletedCount = chapter.children.filter(
                          (l) => l.progress_status === 'COMPLETED'
                        ).length;
                        const isChapterAllDone =
                          chapter.children.length > 0 &&
                          chapterCompletedCount === chapter.children.length;

                        return (
                          <Box
                            key={chapter.id}
                            style={{
                              borderRadius: '8px',
                              border: '1px solid #f1f5f9',
                              backgroundColor: '#ffffff',
                              overflow: 'hidden',
                            }}
                          >
                            {/* Chapter Dropdown Header */}
                            <UnstyledButton
                              onClick={() => toggleChapter(chapter.id)}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: isChapOpen
                                  ? 'rgba(248, 250, 252, 0.9)'
                                  : 'transparent',
                              }}
                              data-testid={`chapter-toggle-${chapter.id}`}
                            >
                              <Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
                                <ThemeIcon
                                  size={20}
                                  radius="sm"
                                  variant="light"
                                  color={isChapterAllDone ? 'green' : 'orange'}
                                >
                                  {isChapOpen ? (
                                    <IconFolderOpen size={12} />
                                  ) : (
                                    <IconFolder size={12} />
                                  )}
                                </ThemeIcon>
                                <Text
                                  size="xs"
                                  fw={600}
                                  c="gray.8"
                                  style={{
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    flex: 1,
                                  }}
                                >
                                  {chapter.title}
                                </Text>
                              </Group>

                              <Group gap={6}>
                                {isChapterAllDone ? (
                                  <Badge size="xs" color="green" variant="light" radius="sm">
                                    সম্পূর্ণ
                                  </Badge>
                                ) : (
                                  <Badge size="xs" color="gray" variant="subtle" radius="sm">
                                    {chapterCompletedCount}/{chapter.children.length}
                                  </Badge>
                                )}
                                <IconChevronDown
                                  size={14}
                                  color="#94a3b8"
                                  style={{
                                    transform: isChapOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                    transition: 'transform 0.2s ease',
                                  }}
                                />
                              </Group>
                            </UnstyledButton>

                            {/* Chapter Lessons List */}
                            <Collapse expanded={isChapOpen}>
                              <Stack gap={2} p={4} style={{ borderTop: '1px solid #f8fafc' }}>
                                {chapter.children.flatMap((lesson) => {
                                  const isLessonActive = selectedLessonId === lesson.id;
                                  const isLessonCompleted =
                                    lesson.progress_status === 'COMPLETED';

                                  const lessonButton = (
                                    <UnstyledButton
                                      key={lesson.id}
                                      onClick={() => onSelectLesson(lesson.id)}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        width: '100%',
                                        padding: '7px 8px',
                                        borderRadius: '6px',
                                        fontSize: '12.5px',
                                        transition: 'all 0.15s ease',
                                        backgroundColor:
                                          isLessonActive && !activeQuizId
                                            ? 'rgba(37, 99, 235, 0.08)'
                                            : 'transparent',
                                        borderLeft:
                                          isLessonActive && !activeQuizId
                                            ? '3px solid #2563eb'
                                            : '3px solid transparent',
                                        color:
                                          isLessonActive && !activeQuizId
                                            ? '#1d4ed8'
                                            : isLessonCompleted
                                            ? '#334155'
                                            : '#475569',
                                        fontWeight:
                                          isLessonActive && !activeQuizId ? 700 : 500,
                                      }}
                                      data-testid={`lesson-item-${lesson.id}`}
                                    >
                                      {/* Status / Type Icon */}
                                      <Box style={{ flexShrink: 0 }}>
                                        {isLessonCompleted ? (
                                          <ThemeIcon
                                            size={20}
                                            radius="xl"
                                            color="green"
                                            variant="light"
                                          >
                                            <IconCheck size={12} />
                                          </ThemeIcon>
                                        ) : isLessonActive && !activeQuizId ? (
                                          <ThemeIcon
                                            size={20}
                                            radius="xl"
                                            color="blue"
                                            variant="filled"
                                          >
                                            <IconPlayerPlay size={11} />
                                          </ThemeIcon>
                                        ) : lesson.video_url ? (
                                          <ThemeIcon
                                            size={20}
                                            radius="xl"
                                            color="blue"
                                            variant="light"
                                          >
                                            <IconVideo size={11} />
                                          </ThemeIcon>
                                        ) : (
                                          <ThemeIcon
                                            size={20}
                                            radius="xl"
                                            color="teal"
                                            variant="light"
                                          >
                                            <IconFileText size={11} />
                                          </ThemeIcon>
                                        )}
                                      </Box>

                                      {/* Lesson Title */}
                                      <Text
                                        size="xs"
                                        style={{
                                          flex: 1,
                                          lineHeight: 1.35,
                                          wordBreak: 'break-word',
                                        }}
                                      >
                                        {lesson.title}
                                      </Text>

                                      {/* Active Playing Badge */}
                                      {isLessonActive && !activeQuizId && (
                                        <Badge size="xs" variant="filled" color="blue" radius="xs">
                                          চলছে
                                        </Badge>
                                      )}
                                    </UnstyledButton>
                                  );

                                  // Linked quizzes
                                  const quizButtons = (lesson.quizzes ?? []).map((quiz) => {
                                    const isQuizActive = activeQuizId === quiz.id;
                                    const isQuizPassed = quiz.is_passed;

                                    return (
                                      <UnstyledButton
                                        key={quiz.id}
                                        onClick={() => onSelectQuiz(lesson.id, quiz.id)}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '8px',
                                          width: '100%',
                                          padding: '7px 8px 7px 18px',
                                          borderRadius: '6px',
                                          fontSize: '12px',
                                          transition: 'all 0.15s ease',
                                          backgroundColor: isQuizActive
                                            ? 'rgba(124, 58, 237, 0.08)'
                                            : 'transparent',
                                          borderLeft: isQuizActive
                                            ? '3px solid #7c3aed'
                                            : '3px solid transparent',
                                          color: isQuizActive
                                            ? '#6d28d9'
                                            : isQuizPassed
                                            ? '#334155'
                                            : '#6b21a8',
                                          fontWeight: isQuizActive ? 700 : 500,
                                        }}
                                        data-testid={`quiz-item-${quiz.id}`}
                                      >
                                        <Box style={{ flexShrink: 0 }}>
                                          {isQuizPassed ? (
                                            <ThemeIcon
                                              size={18}
                                              radius="xl"
                                              color="green"
                                              variant="light"
                                            >
                                              <IconCheck size={11} />
                                            </ThemeIcon>
                                          ) : (
                                            <ThemeIcon
                                              size={18}
                                              radius="xl"
                                              color="violet"
                                              variant="light"
                                            >
                                              <IconAward size={11} />
                                            </ThemeIcon>
                                          )}
                                        </Box>

                                        <Text
                                          size="xs"
                                          style={{
                                            flex: 1,
                                            lineHeight: 1.35,
                                            wordBreak: 'break-word',
                                          }}
                                        >
                                          {quiz.title}
                                        </Text>

                                        <Badge
                                          size="xs"
                                          variant={isQuizActive ? 'filled' : 'dot'}
                                          color={isQuizPassed ? 'green' : 'violet'}
                                          radius="xs"
                                        >
                                          {isQuizPassed ? 'পাস' : 'কুইজ'}
                                        </Badge>
                                      </UnstyledButton>
                                    );
                                  });

                                  return [lessonButton, ...quizButtons];
                                })}
                              </Stack>
                            </Collapse>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
}
