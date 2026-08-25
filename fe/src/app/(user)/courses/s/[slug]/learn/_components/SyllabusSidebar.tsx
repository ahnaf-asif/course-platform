'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Box,
  Progress,
  Stack,
  Text,
  Title,
  Group,
  Collapse,
  UnstyledButton,
} from '@mantine/core';
import {
  IconCheck,
  IconChevronDown,
  IconPlayerPlay,
  IconFileText,
  IconHelpCircle,
  IconClock,
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
  // Track open/collapsed subjects and chapters
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

  // Automatically keep active lesson's subject & chapter expanded
  useEffect(() => {
    if (!selectedLessonId) return;
    for (const subject of organizedTree) {
      const isDirectChild = subject.id === selectedLessonId || subject.children.some((c) => c.id === selectedLessonId);
      if (isDirectChild) {
        setExpandedSubjects((prev) => ({ ...prev, [subject.id]: true }));
      }
      for (const chapter of subject.children) {
        const isChapterOrLesson = chapter.id === selectedLessonId || chapter.children.some((l) => l.id === selectedLessonId);
        if (isChapterOrLesson) {
          setExpandedSubjects((prev) => ({ ...prev, [subject.id]: true }));
          setExpandedChapters((prev) => ({ ...prev, [chapter.id]: true }));
          break;
        }
      }
    }
  }, [selectedLessonId, organizedTree]);

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

  const onSelectLesson = (lessonId: string) => {
    handleSelectLesson(lessonId);
    if (setMobileSidebarOpen) setMobileSidebarOpen(false);
  };

  const onSelectQuiz = (lessonId: string, quizId: string) => {
    handleSelectQuiz(lessonId, quizId);
    if (setMobileSidebarOpen) setMobileSidebarOpen(false);
  };

  // Helper to compute total and completed content counts for any subtree
  const getNodeStats = useCallback((nodes: ExtendedNode[]) => {
    let completed = 0;
    let total = 0;

    const traverse = (list: ExtendedNode[]) => {
      for (const node of list) {
        if (node.node_type === 'LESSON' || node.node_type === 'MODEL_TEST') {
          total++;
          const isNodeCompleted =
            node.progress_status === 'COMPLETED' ||
            (node.quizzes && node.quizzes.some((q) => q.is_passed));
          if (isNodeCompleted) {
            completed++;
          }
        }
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      }
    };

    traverse(nodes);
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percent };
  }, []);

  const completedStats = useMemo(() => {
    return getNodeStats(organizedTree);
  }, [organizedTree, getNodeStats]);

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
      {/* Clean, Flat Header with Integrated Progress Bar */}
      <Box
        px="md"
        pt="md"
        pb="sm"
        style={{
          borderBottom: '1px solid #f1f5f9',
          backgroundColor: '#ffffff',
        }}
      >
        <Group justify="space-between" align="center" mb={8}>
          <Title order={4} size="14px" style={{ color: '#0f172a', fontWeight: 700 }}>
            কোর্স সিলেবাস
          </Title>
          <Text size="xs" fw={600} c="blue.6">
            {completedStats.percent}% সম্পূর্ণ
          </Text>
        </Group>

        <Progress
          value={completedStats.percent}
          size={4}
          radius="xl"
          color="blue"
          animated={completedStats.percent > 0 && completedStats.percent < 100}
        />

        <Text size="11px" c="dimmed" mt={6}>
          {completedStats.completed} / {completedStats.total} পাঠ সম্পন্ন
        </Text>
      </Box>

      {/* Seamless, Flat Syllabus List (No nested border boxes) */}
      <Box
        style={{
          flex: 1,
          overflowY: 'auto',
          scrollBehavior: 'smooth',
        }}
        py="xs"
      >
        <Stack gap={2}>
          {organizedTree.map((subject) => {
            const isSubOpen = !!expandedSubjects[subject.id];
            const subjectStats = getNodeStats([subject]);
            const subjectPercent = subjectStats.percent;

            return (
              <Box key={subject.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                {/* Clean Subject Dropdown Header with Full-Width Progress Fill */}
                <UnstyledButton
                  onClick={() => toggleSubject(subject.id)}
                  style={{
                    position: 'relative',
                    width: '100%',
                    padding: '10px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: isSubOpen ? '#f8fafc' : 'transparent',
                    overflow: 'hidden',
                    transition: 'background-color 0.15s ease',
                  }}
                  data-testid={`subject-toggle-${subject.id}`}
                >
                  {/* Light green progress fill across the subject header width */}
                  {subjectPercent > 0 && (
                    <Box
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        width: `${subjectPercent}%`,
                        backgroundColor: 'rgba(16, 185, 129, 0.14)',
                        borderRight: subjectPercent < 100 ? '2px solid rgba(16, 185, 129, 0.35)' : 'none',
                        pointerEvents: 'none',
                        transition: 'width 0.3s ease',
                        zIndex: 0,
                      }}
                      data-testid={`subject-progress-fill-${subject.id}`}
                    />
                  )}

                  <Text
                    size="13px"
                    fw={700}
                    c={isSubOpen ? 'blue.7' : 'gray.8'}
                    style={{
                      lineHeight: 1.4,
                      flex: 1,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    {subject.title}
                  </Text>

                  <Group gap={8} align="center" style={{ position: 'relative', zIndex: 1 }}>
                    <Text
                      size="11px"
                      fw={600}
                      c={subjectPercent === 100 ? 'green.7' : subjectPercent > 0 ? 'teal.7' : 'dimmed'}
                      data-testid={`subject-progress-${subject.id}`}
                    >
                      {subjectPercent}% সম্পন্ন
                    </Text>
                    <IconChevronDown
                      size={14}
                      color="#94a3b8"
                      style={{
                        transform: isSubOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                      }}
                    />
                  </Group>
                </UnstyledButton>

                {/* Subject Content Collapse */}
                <Collapse expanded={isSubOpen}>
                  <Box pb="xs">
                    {subject.children.map((child) => {
                      if (child.node_type === 'MODEL_TEST') {
                        const isTestActive = selectedLessonId === child.id;
                        const isTestPassed =
                          child.progress_status === 'COMPLETED' ||
                          (child.quizzes && child.quizzes.some((q) => q.is_passed));

                        return (
                          <UnstyledButton
                            key={child.id}
                            onClick={() => onSelectLesson(child.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              width: '100%',
                              padding: '8px 12px 8px 18px',
                              borderRadius: '6px',
                              fontSize: '12.5px',
                              backgroundColor: isTestActive ? '#eff6ff' : 'transparent',
                              color: isTestActive ? '#1d4ed8' : '#334155',
                              fontWeight: isTestActive ? 600 : 400,
                              transition: 'background-color 0.12s ease',
                            }}
                            data-testid={`model-test-item-${child.id}`}
                          >
                            <Box style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                              {isTestPassed ? (
                                <IconCheck size={14} color="#10b981" stroke={2.5} />
                              ) : (
                                <IconClock size={13} color={isTestActive ? '#2563eb' : '#94a3b8'} />
                              )}
                            </Box>

                            <Text
                              size="12.5px"
                              style={{
                                flex: 1,
                                lineHeight: 1.35,
                                wordBreak: 'break-word',
                              }}
                            >
                              {child.title}
                            </Text>

                            <Text
                              size="11px"
                              fw={600}
                              c={isTestPassed ? 'green.6' : isTestActive ? 'blue.6' : 'dimmed'}
                              style={{ flexShrink: 0 }}
                            >
                              {isTestPassed ? 'সম্পন্ন' : 'মডেল টেস্ট'}
                            </Text>
                          </UnstyledButton>
                        );
                      }

                      const chapter = child;
                      const isChapOpen = !!expandedChapters[chapter.id];

                      return (
                        <Box key={chapter.id} mt={4}>
                          {/* Chapter Dropdown Header */}
                          <UnstyledButton
                            onClick={() => toggleChapter(chapter.id)}
                            style={{
                              width: '100%',
                              padding: '6px 16px 6px 20px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              backgroundColor: 'transparent',
                            }}
                            data-testid={`chapter-toggle-${chapter.id}`}
                          >
                            <Text
                              size="12px"
                              fw={600}
                              c="gray.6"
                              style={{
                                lineHeight: 1.3,
                                flex: 1,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {chapter.title}
                            </Text>

                            <IconChevronDown
                              size={12}
                              color="#cbd5e1"
                              style={{
                                transform: isChapOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.2s ease',
                                marginLeft: '6px',
                              }}
                            />
                          </UnstyledButton>

                          {/* Chapter Lessons & Quizzes (Clean Flat Rows) */}
                          <Collapse expanded={isChapOpen}>
                            <Stack gap={1} px="xs" pt={2}>
                              {chapter.children.flatMap((child) => {
                                if (child.node_type === 'MODEL_TEST') {
                                  const isTestActive = selectedLessonId === child.id;
                                  const isTestCompleted =
                                    child.progress_status === 'COMPLETED' ||
                                    (child.quizzes && child.quizzes.some((q) => q.is_passed));

                                  return (
                                    <UnstyledButton
                                      key={child.id}
                                      onClick={() => onSelectLesson(child.id)}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        width: '100%',
                                        padding: '8px 12px 8px 24px',
                                        borderRadius: '6px',
                                        fontSize: '12.5px',
                                        backgroundColor: isTestActive ? '#eff6ff' : 'transparent',
                                        color: isTestActive ? '#1d4ed8' : '#334155',
                                        fontWeight: isTestActive ? 600 : 400,
                                        transition: 'background-color 0.12s ease',
                                      }}
                                      data-testid={`model-test-item-${child.id}`}
                                    >
                                      <Box style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                                        {isTestCompleted ? (
                                          <IconCheck size={14} color="#10b981" stroke={2.5} />
                                        ) : (
                                          <IconClock size={13} color={isTestActive ? '#2563eb' : '#94a3b8'} />
                                        )}
                                      </Box>

                                      <Text
                                        size="12.5px"
                                        style={{
                                          flex: 1,
                                          lineHeight: 1.35,
                                          wordBreak: 'break-word',
                                        }}
                                      >
                                        {child.title}
                                      </Text>

                                      <Text
                                        size="11px"
                                        fw={600}
                                        c={isTestCompleted ? 'green.6' : isTestActive ? 'blue.6' : 'dimmed'}
                                        style={{ flexShrink: 0 }}
                                      >
                                        {isTestCompleted ? 'সম্পন্ন' : 'মডেল টেস্ট'}
                                      </Text>
                                    </UnstyledButton>
                                  );
                                }

                                const lesson = child;
                                const isLessonActive = selectedLessonId === lesson.id && !activeQuizId;
                                const isLessonCompleted =
                                  lesson.progress_status === 'COMPLETED' ||
                                  (lesson.quizzes && lesson.quizzes.some((q) => q.is_passed));

                                const lessonRow = (
                                  <UnstyledButton
                                    key={lesson.id}
                                    onClick={() => onSelectLesson(lesson.id)}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '10px',
                                      width: '100%',
                                      padding: '8px 12px 8px 24px',
                                      borderRadius: '6px',
                                      fontSize: '12.5px',
                                      backgroundColor: isLessonActive ? '#eff6ff' : 'transparent',
                                      color: isLessonActive ? '#1d4ed8' : '#334155',
                                      fontWeight: isLessonActive ? 600 : 400,
                                      transition: 'background-color 0.12s ease',
                                    }}
                                    data-testid={`lesson-item-${lesson.id}`}
                                  >
                                    {/* Minimalist Status Icon */}
                                    <Box style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                                      {isLessonCompleted ? (
                                        <IconCheck size={14} color="#10b981" stroke={2.5} />
                                      ) : isLessonActive ? (
                                        <IconPlayerPlay size={13} color="#2563eb" fill="#2563eb" />
                                      ) : lesson.video_url ? (
                                        <IconPlayerPlay size={13} color="#94a3b8" />
                                      ) : (
                                        <IconFileText size={13} color="#94a3b8" />
                                      )}
                                    </Box>

                                    <Text
                                      size="12.5px"
                                      style={{
                                        flex: 1,
                                        lineHeight: 1.35,
                                        wordBreak: 'break-word',
                                      }}
                                    >
                                      {lesson.title}
                                    </Text>
                                  </UnstyledButton>
                                );

                                const quizRows = (lesson.quizzes ?? []).map((quiz) => {
                                  const isQuizActive = activeQuizId === quiz.id;
                                  const isQuizPassed = quiz.is_passed;

                                  return (
                                    <UnstyledButton
                                      key={quiz.id}
                                      onClick={() => onSelectQuiz(lesson.id, quiz.id)}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        width: '100%',
                                        padding: '8px 12px 8px 24px',
                                        borderRadius: '6px',
                                        fontSize: '12.5px',
                                        backgroundColor: isQuizActive ? '#eff6ff' : 'transparent',
                                        color: isQuizActive ? '#1d4ed8' : '#334155',
                                        fontWeight: isQuizActive ? 600 : 400,
                                        transition: 'background-color 0.12s ease',
                                      }}
                                      data-testid={`quiz-item-${quiz.id}`}
                                    >
                                      <Box style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                                        {isQuizPassed ? (
                                          <IconCheck size={14} color="#10b981" stroke={2.5} />
                                        ) : (
                                          <IconHelpCircle size={13} color={isQuizActive ? '#2563eb' : '#94a3b8'} />
                                        )}
                                      </Box>

                                      <Text
                                        size="12.5px"
                                        style={{
                                          flex: 1,
                                          lineHeight: 1.35,
                                          wordBreak: 'break-word',
                                        }}
                                      >
                                        {quiz.title}
                                      </Text>

                                      <Text
                                        size="11px"
                                        fw={600}
                                        c={isQuizPassed ? 'green.6' : isQuizActive ? 'blue.6' : 'dimmed'}
                                        style={{ flexShrink: 0 }}
                                      >
                                        {isQuizPassed ? 'পাস' : 'কুইজ'}
                                      </Text>
                                    </UnstyledButton>
                                  );
                                });

                                return [lessonRow, ...quizRows];
                              })}
                            </Stack>
                          </Collapse>
                        </Box>
                      );
                    })}
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
