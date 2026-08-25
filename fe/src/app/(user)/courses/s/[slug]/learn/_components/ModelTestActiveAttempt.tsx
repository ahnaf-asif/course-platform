'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Card,
  Divider,
  Stack,
  Text,
  Title,
  Badge,
  Group,
  Button,
  Container,
  Checkbox,
  Radio,
  Alert,
  Modal,
  SimpleGrid,
  Paper,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconAlertTriangle,
  IconClock,
  IconBookmark,
  IconLayoutGrid,
} from '@tabler/icons-react';
import { MathJaxContent } from '@/components/MathJaxContent';
import { useDevToolsDetector, isDevToolsOpenSync } from '@/lib/useDevToolsDetector';
import { parseHTMLContent } from './utils';
import { StudentQuestionResponse } from '@/api/model/components-schemas-assessment/studentQuestionResponse';
import { SubmitQuizResponse } from '@/api/model/components-schemas-assessment/submitQuizResponse';
import { ModelTestSummaryResponse } from '@/api/model/components-schemas-curriculum/modelTestSummaryResponse';

interface SubmitAttemptMutation {
  mutate: (
    variables: {
      id: string;
      data: {
        answers: { question_id: string; answer_id: string }[];
        time_spent_seconds?: number;
      };
    },
    options?: { onSuccess?: (data: SubmitQuizResponse) => void }
  ) => void;
  isPending: boolean;
}

interface ModelTestActiveAttemptProps {
  activeQuizId: string;
  modelTest?: ModelTestSummaryResponse | null;
  modelTestTitle?: string;
  questionsData: StudentQuestionResponse[];
  currentQuestionIndex: number;
  setCurrentQuestionIndex: (idx: number) => void;
  userAnswers: Record<string, string[]>;
  setUserAnswers: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  setIsAttempting: (val: boolean) => void;
  submitAttemptMutation: SubmitAttemptMutation;
  setActiveAttempt: (attempt: SubmitQuizResponse) => void;
  refetchAttempts: () => void;
  refetchTree: () => void;
  nodeId?: string;
  updateProgress?: (nodeId: string, status: 'STARTED' | 'COMPLETED') => Promise<void>;
}

export function ModelTestActiveAttempt({
  activeQuizId,
  modelTest,
  modelTestTitle,
  questionsData,
  currentQuestionIndex,
  setCurrentQuestionIndex,
  userAnswers,
  setUserAnswers,
  setIsAttempting,
  submitAttemptMutation,
  setActiveAttempt,
  refetchAttempts,
  refetchTree,
  nodeId,
  updateProgress,
}: ModelTestActiveAttemptProps) {
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(() => isDevToolsOpenSync());
  useDevToolsDetector(setIsDevToolsOpen);

  const durationMinutes = modelTest?.duration_minutes || 60;
  const totalDurationSeconds = durationMinutes * 60;

  // Countdown timer state
  const [remainingSeconds, setRemainingSeconds] = useState(totalDurationSeconds);
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [confirmModalOpened, { open: openConfirmModal, close: closeConfirmModal }] = useDisclosure(false);
  const [paletteOpened, { open: openPalette, close: closePalette }] = useDisclosure(false);

  const submittedRef = useRef(false);

  const currentQuestion = questionsData[currentQuestionIndex];
  const isMultiSelect =
    currentQuestion?.question_type === 'MULTIPLE' ||
    currentQuestion?.question_type === 'MULTI_CORRECT';
  const selectedOptions = currentQuestion ? userAnswers[currentQuestion.id] || [] : [];

  const handleFinalSubmit = useCallback(
    (forcedTimeSpent?: number) => {
      if (submittedRef.current) return;
      submittedRef.current = true;

      const timeSpent = forcedTimeSpent !== undefined
        ? forcedTimeSpent
        : Math.max(1, totalDurationSeconds - remainingSeconds);

      const payload = Object.entries(userAnswers).flatMap(([qId, aIds]) => {
        if (aIds.length === 0) return [];
        return aIds.map((aId) => ({ question_id: qId, answer_id: aId }));
      });

      submitAttemptMutation.mutate(
        {
          id: activeQuizId,
          data: {
            answers: payload,
            time_spent_seconds: timeSpent,
          },
        },
        {
          onSuccess: (res: SubmitQuizResponse) => {
            setActiveAttempt(res);
            setIsAttempting(false);
            if (nodeId && updateProgress) {
              updateProgress(nodeId, 'COMPLETED');
            }
            refetchAttempts();
            refetchTree();
          },
        }
      );
    },
    [
      activeQuizId,
      nodeId,
      updateProgress,
      refetchAttempts,
      refetchTree,
      remainingSeconds,
      setActiveAttempt,
      setIsAttempting,
      submitAttemptMutation,
      totalDurationSeconds,
      userAnswers,
    ]
  );

  // Countdown clock effect
  useEffect(() => {
    if (remainingSeconds <= 0 && !submittedRef.current) {
      handleFinalSubmit(totalDurationSeconds);
      return;
    }

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!submittedRef.current) {
            handleFinalSubmit(totalDurationSeconds);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingSeconds, totalDurationSeconds, handleFinalSubmit]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOptionToggle = (optionId: string) => {
    if (!isMultiSelect) {
      setUserAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: [optionId],
      }));
    } else {
      setUserAnswers((prev) => {
        const currentSelected = prev[currentQuestion.id] || [];
        if (currentSelected.includes(optionId)) {
          return {
            ...prev,
            [currentQuestion.id]: currentSelected.filter((id) => id !== optionId),
          };
        } else {
          return {
            ...prev,
            [currentQuestion.id]: [...currentSelected, optionId],
          };
        }
      });
    }
  };

  const toggleMarkForReview = (questionId: string) => {
    setMarkedForReview((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  // Question stats for palette
  const answeredCount = questionsData.filter((q) => (userAnswers[q.id] || []).length > 0).length;
  const unansweredCount = questionsData.length - answeredCount;
  const reviewCount = questionsData.filter((q) => markedForReview[q.id]).length;

  const isTimeCritical = remainingSeconds <= 300; // < 5 mins
  const isTimeUrgent = remainingSeconds <= 60; // < 1 min

  if (isDevToolsOpen) {
    return (
      <Box py="xl" px="md">
        <Alert
          icon={<IconAlertTriangle size={24} />}
          title="নিরাপত্তা সতর্কতা"
          color="red"
          variant="filled"
          radius="md"
        >
          ডেভলপার টুলস (DevTools) খোলা অবস্থায় মডেল টেস্টের প্রশ্নাবলী গোপন রাখা হয়েছে। পরীক্ষা দিতে ইন্সপেক্ট উইন্ডো বন্ধ করুন।
        </Alert>
      </Box>
    );
  }

  return (
    <Box
      py="xs"
      px={0}
      style={{
        width: '100%',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
      }}
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      data-testid="model-test-active-container"
    >
      <Container size="md" px={0} style={{ maxWidth: '880px', width: '100%' }}>
        <Stack gap="md">
          {/* Sticky Countdown Clock & Status Bar */}
          <Paper
            withBorder
            p="sm"
            radius="md"
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              backgroundColor: isTimeUrgent ? '#fef2f2' : isTimeCritical ? '#fffbeb' : '#ffffff',
              borderColor: isTimeUrgent ? '#ef4444' : isTimeCritical ? '#f59e0b' : '#e2e8f0',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
            }}
          >
            <Group justify="space-between" align="center" wrap="wrap" gap="sm">
              <Group gap="xs">
                <Badge size="lg" color="indigo" variant="light">
                  মডেল টেস্ট
                </Badge>
                <Text size="sm" fw={700} c="gray.8" lineClamp={1}>
                  {modelTestTitle || 'লাইভ মডেল টেস্ট'}
                </Text>
              </Group>

              {/* Countdown Timer Badge */}
              <Group gap="sm">
                <Paper
                  withBorder
                  px="md"
                  py={4}
                  radius="md"
                  style={{
                    backgroundColor: isTimeUrgent ? '#fee2e2' : isTimeCritical ? '#fef3c7' : '#eff6ff',
                    borderColor: isTimeUrgent ? '#f87171' : isTimeCritical ? '#fcd34d' : '#bfdbfe',
                  }}
                >
                  <Group gap={6} align="center">
                    <IconClock
                      size={18}
                      color={isTimeUrgent ? '#dc2626' : isTimeCritical ? '#d97706' : '#2563eb'}
                    />
                    <Text
                      size="sm"
                      fw={800}
                      c={isTimeUrgent ? 'red.9' : isTimeCritical ? 'yellow.9' : 'blue.9'}
                      style={{ fontVariantNumeric: 'tabular-nums' }}
                    >
                      {formatTimer(remainingSeconds)} বাকি
                    </Text>
                  </Group>
                </Paper>

                <Button
                  size="xs"
                  variant="outline"
                  color="gray.7"
                  leftSection={<IconLayoutGrid size={14} />}
                  onClick={openPalette}
                >
                  প্রশ্ন তালিকা ({answeredCount}/{questionsData.length})
                </Button>

                <Button
                  size="xs"
                  variant="filled"
                  color="green"
                  onClick={openConfirmModal}
                  loading={submitAttemptMutation.isPending}
                >
                  জমা দিন
                </Button>
              </Group>
            </Group>
          </Paper>

          {/* Question Header & Action Bar */}
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <Title order={3} size="h4" style={{ fontWeight: 800 }}>
                প্রশ্ন {currentQuestionIndex + 1} / {questionsData.length}
              </Title>
              <Badge color={isMultiSelect ? 'violet' : 'blue'} variant="light" size="sm">
                {isMultiSelect ? 'বহুনির্বাচনী' : 'একক উত্তর'}
              </Badge>
            </Group>

            <Group gap="xs">
              <Button
                variant={markedForReview[currentQuestion?.id] ? 'filled' : 'subtle'}
                color="orange"
                size="xs"
                leftSection={<IconBookmark size={14} />}
                onClick={() => currentQuestion && toggleMarkForReview(currentQuestion.id)}
              >
                {markedForReview[currentQuestion?.id] ? 'রিভিউ চিহ্নিত' : 'রিভিউয়ের জন্য রাখুন'}
              </Button>
            </Group>
          </Group>

          {/* MCQ Question Card */}
          <Card
            withBorder
            radius="lg"
            p={{ base: 'md', sm: 'xl' }}
            style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}
          >
            <Stack gap="md">
              <Box fw={700} style={{ fontSize: '16.5px', color: '#0f172a', lineHeight: 1.65 }}>
                <MathJaxContent html={parseHTMLContent(currentQuestion?.content || '')} />
              </Box>

              <Divider color="#f1f5f9" />

              <Stack gap="xs">
                {currentQuestion?.answers.map((opt) => {
                  const isSelected = selectedOptions.includes(opt.id);
                  return (
                    <UnstyledButton
                      key={opt.id}
                      onClick={() => handleOptionToggle(opt.id)}
                      style={{
                        width: '100%',
                        padding: '14px 18px',
                        border: `2px solid ${
                          isSelected ? '#2563eb' : '#e2e8f0'
                        }`,
                        borderRadius: '10px',
                        backgroundColor: isSelected
                          ? 'rgba(37, 99, 235, 0.08)'
                          : '#ffffff',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                        display: 'block',
                      }}
                      data-testid={`option-${opt.id}`}
                    >
                      <Group wrap="nowrap" align="center" gap="sm">
                        {isMultiSelect ? (
                          <Checkbox
                            checked={isSelected}
                            onChange={() => {}}
                            size="sm"
                            styles={{ input: { cursor: 'pointer' } }}
                          />
                        ) : (
                          <Radio
                            checked={isSelected}
                            onChange={() => {}}
                            size="sm"
                            styles={{ radio: { cursor: 'pointer' } }}
                          />
                        )}
                        <Text size="sm" fw={isSelected ? 700 : 500} c={isSelected ? 'blue.9' : 'gray.8'} style={{ flex: 1 }}>
                          {opt.content}
                        </Text>
                      </Group>
                    </UnstyledButton>
                  );
                })}
              </Stack>
            </Stack>
          </Card>

          {/* Bottom Question Switch Controls */}
          <Group justify="space-between" mt="sm">
            <Button
              variant="outline"
              color="gray.7"
              size="md"
              onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
              disabled={currentQuestionIndex === 0}
              leftSection={<IconChevronLeft size={18} />}
              style={{ fontWeight: 600 }}
            >
              পূর্ববর্তী প্রশ্ন
            </Button>

            <Group gap="xs">
              {currentQuestionIndex < questionsData.length - 1 ? (
                <Button
                  size="md"
                  variant="gradient"
                  gradient={{ from: 'blue', to: 'indigo' }}
                  onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                  rightSection={<IconChevronRight size={18} />}
                  style={{ fontWeight: 700 }}
                >
                  পরবর্তী প্রশ্ন
                </Button>
              ) : (
                <Button
                  size="md"
                  variant="gradient"
                  gradient={{ from: 'teal', to: 'green' }}
                  onClick={openConfirmModal}
                  loading={submitAttemptMutation.isPending}
                  rightSection={<IconCheck size={18} />}
                  style={{ fontWeight: 700 }}
                >
                  পরীক্ষা জমা দিন
                </Button>
              )}
            </Group>
          </Group>
        </Stack>
      </Container>

      {/* Question Palette Modal */}
      <Modal
        opened={paletteOpened}
        onClose={closePalette}
        title="প্রশ্নাবলি নেভিগেটর ও প্যালেট"
        size="lg"
        radius="md"
        centered
        transitionProps={{ duration: 0 }}
      >
        <Stack gap="md">
          {/* Palette Legend */}
          <Group gap="md" justify="center" wrap="wrap">
            <Group gap={6}>
              <Box style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: '#2563eb' }} />
              <Text size="xs">বর্তমান</Text>
            </Group>
            <Group gap={6}>
              <Box style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: '#10b981' }} />
              <Text size="xs">উত্তর দেওয়া ({answeredCount})</Text>
            </Group>
            <Group gap={6}>
              <Box style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: '#f59e0b' }} />
              <Text size="xs">রিভিউ চিহ্নিত ({reviewCount})</Text>
            </Group>
            <Group gap={6}>
              <Box style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: '#f1f5f9', border: '1px solid #cbd5e1' }} />
              <Text size="xs">বাকি ({unansweredCount})</Text>
            </Group>
          </Group>

          <Divider color="#f1f5f9" />

          {/* Palette Grid */}
          <SimpleGrid cols={{ base: 5, sm: 8, md: 10 }} spacing="xs">
            {questionsData.map((q, idx) => {
              const isCurr = idx === currentQuestionIndex;
              const hasAns = (userAnswers[q.id] || []).length > 0;
              const isMarked = markedForReview[q.id];

              let bg = '#f8fafc';
              let border = '#cbd5e1';
              let color = '#334155';

              if (isCurr) {
                bg = '#2563eb';
                border = '#1d4ed8';
                color = '#ffffff';
              } else if (isMarked) {
                bg = '#fef3c7';
                border = '#f59e0b';
                color = '#b45309';
              } else if (hasAns) {
                bg = '#d1fae5';
                border = '#10b981';
                color = '#065f46';
              }

              return (
                <Button
                  key={q.id}
                  p={0}
                  size="sm"
                  variant="subtle"
                  style={{
                    backgroundColor: bg,
                    borderColor: border,
                    borderWidth: 1,
                    borderStyle: 'solid',
                    color: color,
                    fontWeight: 700,
                    minWidth: 'auto',
                  }}
                  onClick={() => {
                    setCurrentQuestionIndex(idx);
                    closePalette();
                  }}
                >
                  {idx + 1}
                </Button>
              );
            })}
          </SimpleGrid>
        </Stack>
      </Modal>

      {/* Confirmation Submission Modal */}
      <Modal
        opened={confirmModalOpened}
        onClose={closeConfirmModal}
        title="মডেল টেস্ট জমা দিন"
        centered
        radius="md"
        transitionProps={{ duration: 0 }}
      >
        <Stack gap="md">
          <Text size="sm" c="gray.7">
            আপনি কি নিশ্চিত যে মডেল টেস্ট সমাপ্ত করতে চান? জমা দেওয়ার পর আপনার উত্তর মূল্যায়ন করে র‍্যাংক লিস্ট এবং ব্যাখ্যা প্রদর্শন করা হবে।
          </Text>

          <Paper withBorder p="md" radius="md" bg="gray.0">
            <SimpleGrid cols={2} spacing="xs">
              <div>
                <Text size="xs" c="dimmed">
                  মোট প্রশ্ন:
                </Text>
                <Text size="sm" fw={700}>
                  {questionsData.length}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  উত্তর দিয়েছেন:
                </Text>
                <Text size="sm" fw={700} c="green.7">
                  {answeredCount}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  উত্তর দেননি:
                </Text>
                <Text size="sm" fw={700} c="red.6">
                  {unansweredCount}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  অবশিষ্ট সময়:
                </Text>
                <Text size="sm" fw={700} c="blue.7">
                  {formatTimer(remainingSeconds)}
                </Text>
              </div>
            </SimpleGrid>
          </Paper>

          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" color="gray" onClick={closeConfirmModal}>
              ফিরে যান
            </Button>
            <Button
              color="green"
              loading={submitAttemptMutation.isPending}
              onClick={() => {
                closeConfirmModal();
                handleFinalSubmit();
              }}
            >
              নিশ্চিত ও জমা দিন
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}

interface UnstyledButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

function UnstyledButton({ children, style, ...props }: UnstyledButtonProps) {
  return (
    <button
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        width: '100%',
        display: 'block',
        color: 'inherit',
        font: 'inherit',
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}
