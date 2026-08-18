import React from 'react';
import { Box, Card, Divider, Stack, Text, Title, Badge, ThemeIcon, Alert, Group, Button, Container } from '@mantine/core';
import { IconAward, IconCheck, IconX, IconAlertCircle } from '@tabler/icons-react';
import { MathJaxContent } from '@/components/MathJaxContent';
import { WatermarkOverlay } from '@/components/WatermarkOverlay';
import { parseHTMLContent } from './utils';
import { SubmitQuizResponse } from '@/api/model/components-schemas-assessment/submitQuizResponse';
import { AttemptDetailQuestion } from '@/api/model/components-schemas-assessment/attemptDetailQuestion';
import { AttemptAnswerOption } from '@/api/model/components-schemas-assessment/attemptAnswerOption';

interface QuizReviewProps {
  activeAttempt: SubmitQuizResponse;
  setActiveAttempt: (attempt: SubmitQuizResponse | null) => void;
}

export function QuizReview({ activeAttempt, setActiveAttempt }: QuizReviewProps) {
  const isPassed = activeAttempt.is_passed;

  return (
    <Box
      py={{ base: 'md', md: 'xl' }}
      px={{ base: 'xs', sm: 'md' }}
      style={{
        width: '100%',
        position: 'relative',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
      }}
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      data-testid="quiz-review-container"
    >
      <WatermarkOverlay variant="reading" />
      <Container size="md" px={{ base: 0, sm: 'md' }} style={{ maxWidth: '840px', width: '100%' }}>
        <Stack gap="xl">
          <Card
            withBorder
            radius="lg"
            p={{ base: 'md', sm: 'xl' }}
            style={{
              backgroundColor: isPassed
                ? 'var(--mantine-color-green-light)'
                : 'var(--mantine-color-red-light)',
              border: `1px solid ${
                isPassed ? 'var(--mantine-color-green-outline)' : 'var(--mantine-color-red-outline)'
              }`,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
              <Group gap="md" style={{ display: 'flex', gap: '16px' }}>
                <ThemeIcon size={48} radius="xl" color={isPassed ? 'green' : 'red'}>
                  {isPassed ? <IconAward size={28} /> : <IconX size={28} />}
                </ThemeIcon>
                <Box>
                  <Title
                    order={2}
                    size="h3"
                    c={isPassed ? 'green.9' : 'red.9'}
                    style={{ fontWeight: 800 }}
                  >
                    {isPassed ? 'Quiz Passed!' : 'Quiz Failed'}
                  </Title>
                  <Text c={isPassed ? 'green.8' : 'red.8'} size="sm" mt={2}>
                    {isPassed
                      ? 'Great job! You have successfully mastered this material.'
                      : 'Try reviewing the reading material and take the quiz again.'}
                  </Text>
                </Box>
              </Group>
              <Stack gap={0} align="flex-end">
                <Text size="xs" c="dimmed" style={{ textTransform: 'uppercase', fontWeight: 700 }}>
                  Score
                </Text>
                <Text size="h2" fw={800} c={isPassed ? 'green.9' : 'red.9'}>
                  {activeAttempt.score}%
                </Text>
                <Text size="xs" c="dimmed">
                  Passing requirement: {activeAttempt.passing_score}%
                </Text>
              </Stack>
            </div>
          </Card>

          <Title order={2} size="h3" px={{ base: 'md', sm: 0 }} style={{ fontWeight: 700 }}>
            Question Review
          </Title>

          <Stack gap="lg" px={{ base: 'md', sm: 0 }}>
            {activeAttempt.questions.map((q: AttemptDetailQuestion, idx: number) => {
              return (
                <Card key={q.id} withBorder radius="md" p={{ base: 'sm', sm: 'lg' }}>
                  <Stack gap="md">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Group gap="xs" style={{ display: 'flex', gap: '8px' }}>
                        <Badge color="gray" variant="filled">
                          Q{idx + 1}
                        </Badge>
                        <Badge color={q.is_correct ? 'green' : 'red'} variant="light">
                          {q.is_correct ? 'Correct' : 'Incorrect'}
                        </Badge>
                      </Group>
                      {q.is_correct ? (
                        <IconCheck size={20} color="var(--mantine-color-green-filled)" />
                      ) : (
                        <IconX size={20} color="var(--mantine-color-red-filled)" />
                      )}
                    </div>

                    <Box fw={600} style={{ fontSize: '15px' }}>
                      <MathJaxContent html={parseHTMLContent(q.content)} />
                    </Box>

                    <Divider />

                    <Stack gap="xs">
                      {q.answer_options.map((opt: AttemptAnswerOption) => {
                        const isUserSelected = q.user_answers.includes(opt.id);
                        const isOptionCorrect = opt.is_correct;

                        let optionBg = 'transparent';
                        let optionBorder = 'var(--mantine-color-default-border)';

                        if (isOptionCorrect) {
                          optionBg = 'var(--mantine-color-green-light)';
                          optionBorder = 'var(--mantine-color-green-filled)';
                        } else if (isUserSelected && !isOptionCorrect) {
                          optionBg = 'var(--mantine-color-red-light)';
                          optionBorder = 'var(--mantine-color-red-filled)';
                        }

                        return (
                          <div
                            key={opt.id}
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '12px',
                              border: `1px solid ${optionBorder}`,
                              borderRadius: '6px',
                              backgroundColor: optionBg,
                            }}
                          >
                            <Text size="sm">{opt.content}</Text>
                            <Group gap="xs" style={{ display: 'flex', gap: '8px' }}>
                              {isUserSelected && !isOptionCorrect && (
                                <Badge size="xs" color="red">
                                  Your Answer
                                </Badge>
                              )}
                              {isUserSelected && isOptionCorrect && (
                                <Badge size="xs" color="green">
                                  Your Correct Answer
                                </Badge>
                              )}
                              {!isUserSelected && isOptionCorrect && (
                                <Badge size="xs" color="gray" variant="outline">
                                  Correct Answer
                                </Badge>
                              )}
                            </Group>
                          </div>
                        );
                      })}
                    </Stack>

                    {q.explanation && (
                      <Alert
                        color="blue"
                        title="Explanation"
                        icon={<IconAlertCircle size={16} />}
                        radius="md"
                        mt="xs"
                      >
                        <MathJaxContent html={parseHTMLContent(q.explanation)} />
                      </Alert>
                    )}
                  </Stack>
                </Card>
              );
            })}
          </Stack>

          <Group gap="md" mt="xl" px={{ base: 'md', sm: 0 }} style={{ display: 'flex', gap: '16px' }}>
            <Button
              onClick={() => {
                setActiveAttempt(null);
              }}
            >
              Close Review
            </Button>
          </Group>
        </Stack>
      </Container>
    </Box>
  );
}


