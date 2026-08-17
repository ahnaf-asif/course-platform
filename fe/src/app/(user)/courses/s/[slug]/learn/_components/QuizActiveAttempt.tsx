import React from 'react';
import { Box, Card, Divider, Stack, Text, Title, Badge, Group, Button, Container, Checkbox, Radio } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconCheck } from '@tabler/icons-react';
import { MathJaxContent } from '@/components/MathJaxContent';
import { parseHTMLContent } from './utils';
import { StudentQuestionResponse } from '@/api/model/components-schemas-assessment/studentQuestionResponse';
import { SubmitQuizResponse } from '@/api/model/components-schemas-assessment/submitQuizResponse';

interface SubmitAttemptMutation {
  mutate: (
    variables: { id: string; data: { answers: { question_id: string; answer_id: string }[] } },
    options?: { onSuccess?: (data: SubmitQuizResponse) => void }
  ) => void;
  isPending: boolean;
}

interface QuizActiveAttemptProps {
  activeQuizId: string;
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
}

export function QuizActiveAttempt({
  activeQuizId,
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
}: QuizActiveAttemptProps) {
  const currentQuestion = questionsData[currentQuestionIndex];
  const isMultiSelect =
    currentQuestion.question_type === 'MULTIPLE' ||
    currentQuestion.question_type === 'MULTI_CORRECT';
  const selectedOptions = userAnswers[currentQuestion.id] || [];

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

  const handleSubmitQuiz = () => {
    const payload = Object.entries(userAnswers).flatMap(([qId, aIds]) => {
      if (aIds.length === 0) return [];
      return aIds.map((aId) => ({ question_id: qId, answer_id: aId }));
    });

    submitAttemptMutation.mutate(
      {
        id: activeQuizId,
        data: {
          answers: payload,
        },
      },
      {
        onSuccess: (res: SubmitQuizResponse) => {
          setActiveAttempt(res);
          setIsAttempting(false);
          refetchAttempts();
          refetchTree();
        },
      }
    );
  };

  return (
    <Box py="xs" px={0} style={{ width: '100%' }}>
      <Container size="md" px={0} style={{ maxWidth: '840px', width: '100%' }}>
        <Stack gap="md">
          <Box px={0}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text
                size="xs"
                fw={800}
                c="blue.6"
                style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}
              >
                কুইজ পরীক্ষা চলছে
              </Text>
              <Button
                variant="subtle"
                color="red"
                size="xs"
                onClick={() => {
                  setIsAttempting(false);
                  setUserAnswers({});
                  setCurrentQuestionIndex(0);
                }}
              >
                কুইজ বাতিল করুন
              </Button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <Title order={2} size="h3" style={{ fontWeight: 800 }}>
                প্রশ্ন {currentQuestionIndex + 1} / {questionsData.length}
              </Title>
              <Badge color={isMultiSelect ? 'violet' : 'blue'} variant="light" size="sm">
                {isMultiSelect ? 'বহুনির্বাচনী (একাধিক উত্তর)' : 'একক উত্তর'}
              </Badge>
            </div>
          </Box>

          <Divider color="#e2e8f0" />

          <Card withBorder radius="lg" p={{ base: 'sm', sm: 'lg' }} style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
            <Stack gap="md">
              <Box fw={700} style={{ fontSize: '16px', color: '#0f172a', lineHeight: 1.6 }}>
                <MathJaxContent html={parseHTMLContent(currentQuestion.content)} />
              </Box>

              <Divider color="#f1f5f9" />

              <Stack gap="xs">
                {currentQuestion.answers.map((opt) => {
                  const isSelected = selectedOptions.includes(opt.id);
                  return (
                    <UnstyledButton
                      key={opt.id}
                      onClick={() => handleOptionToggle(opt.id)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
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
                        <Text size="sm" fw={isSelected ? 700 : 500} c={isSelected ? 'blue.8' : 'gray.8'} style={{ flex: 1 }}>
                          {opt.content}
                        </Text>
                      </Group>
                    </UnstyledButton>
                  );
                })}
              </Stack>
            </Stack>
          </Card>

          {/* Full width stacked buttons for mobile view */}
          <Stack gap="xs" hiddenFrom="sm" mt="xs" style={{ width: '100%' }}>
            {currentQuestionIndex < questionsData.length - 1 ? (
              <Button
                fullWidth
                size="md"
                variant="gradient"
                gradient={{ from: 'blue', to: 'violet' }}
                onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                rightSection={<IconChevronRight size={18} />}
                style={{ fontWeight: 700 }}
              >
                পরবর্তী প্রশ্ন
              </Button>
            ) : (
              <Button
                fullWidth
                size="md"
                variant="gradient"
                gradient={{ from: 'teal', to: 'green' }}
                onClick={handleSubmitQuiz}
                loading={submitAttemptMutation.isPending}
                rightSection={<IconCheck size={18} />}
                style={{ fontWeight: 700 }}
              >
                কুইজ জমা দিন
              </Button>
            )}

            <Button
              fullWidth
              size="md"
              variant="outline"
              color="gray.7"
              onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
              disabled={currentQuestionIndex === 0}
              leftSection={<IconChevronLeft size={18} />}
              style={{ fontWeight: 600 }}
            >
              পূর্ববর্তী প্রশ্ন
            </Button>
          </Stack>

          {/* Side by side buttons for tablet & desktop view */}
          <Group justify="space-between" mt="md" visibleFrom="sm" style={{ display: 'flex', width: '100%' }}>
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

            {currentQuestionIndex < questionsData.length - 1 ? (
              <Button
                size="md"
                variant="gradient"
                gradient={{ from: 'blue', to: 'violet' }}
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
                onClick={handleSubmitQuiz}
                loading={submitAttemptMutation.isPending}
                rightSection={<IconCheck size={18} />}
                style={{ fontWeight: 700 }}
              >
                কুইজ জমা দিন
              </Button>
            )}
          </Group>
        </Stack>
      </Container>
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

