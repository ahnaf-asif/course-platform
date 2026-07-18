import React from 'react';
import { Box, Card, Divider, Stack, Text, Title, Badge, Group, Button, Container } from '@mantine/core';
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
  const selectedOptions = userAnswers[currentQuestion.id] || [];

  const handleOptionToggle = (optionId: string) => {
    const isMultiCorrect = currentQuestion.question_type === 'MULTI_CORRECT';
    if (!isMultiCorrect) {
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
    <Box py={{ base: 'md', md: 'xl' }} px={{ base: 'xs', sm: 'md' }} style={{ width: '100%' }}>
      <Container size="md" px={{ base: 0, sm: 'md' }} style={{ maxWidth: '840px', width: '100%' }}>
        <Stack gap="lg">
          <Box px={{ base: 'md', sm: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text
                size="xs"
                fw={700}
                c="blue.6"
                style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}
              >
                Active Attempt
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
                Cancel Quiz
              </Button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
              <Title order={2} size="h3" style={{ fontWeight: 700 }}>
                Question {currentQuestionIndex + 1} of {questionsData.length}
              </Title>
              <Badge color="blue" variant="light">
                {currentQuestion.question_type === 'SINGLE_CORRECT' ? 'Single Choice' : 'Multiple Choice'}
              </Badge>
            </div>
          </Box>

          <Divider />

          <Card withBorder radius="md" p={{ base: 'md', sm: 'lg' }} mx={{ base: 'md', sm: 0 }}>
            <Stack gap="md">
              <Box fw={600} style={{ fontSize: '16px' }}>
                <MathJaxContent html={parseHTMLContent(currentQuestion.content)} />
              </Box>

              <Divider />

              <Stack gap="sm">
                {currentQuestion.answers.map((opt) => {
                  const isSelected = selectedOptions.includes(opt.id);
                  return (
                    <UnstyledButton
                      key={opt.id}
                      onClick={() => handleOptionToggle(opt.id)}
                      style={{
                        width: '100%',
                        padding: '16px',
                        border: `2px solid ${
                          isSelected ? 'var(--mantine-color-blue-filled)' : 'var(--mantine-color-default-border)'
                        }`,
                        borderRadius: '8px',
                        backgroundColor: isSelected
                          ? 'var(--mantine-color-blue-light)'
                          : 'var(--mantine-color-default)',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                        display: 'block',
                      }}
                    >
                      <Text size="sm" fw={isSelected ? 600 : 400}>
                        {opt.content}
                      </Text>
                    </UnstyledButton>
                  );
                })}
              </Stack>
            </Stack>
          </Card>

          <Group justify="space-between" mt="md" px={{ base: 'md', sm: 0 }} style={{ display: 'flex', width: '100%' }}>
            <Button
              variant="outline"
              onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
              disabled={currentQuestionIndex === 0}
              leftSection={<IconChevronLeft size={16} />}
            >
              Previous Question
            </Button>

            {currentQuestionIndex < questionsData.length - 1 ? (
              <Button
                onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                rightSection={<IconChevronRight size={16} />}
              >
                Next Question
              </Button>
            ) : (
              <Button
                color="green"
                onClick={handleSubmitQuiz}
                loading={submitAttemptMutation.isPending}
                rightSection={<IconCheck size={16} />}
              >
                Submit Quiz
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

// Inline helper UnstyledButton to avoid custom styles layout issues
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

