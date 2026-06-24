import React from 'react';
import { Box, Card, Divider, Stack, Text, Title, Badge, ThemeIcon, Grid, Group, Loader, Button, Container, Center } from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconAward, IconCheck, IconRefresh } from '@tabler/icons-react';
import { QuizResponse } from '@/api/model/components-schemas-assessment/quizResponse';
import { StudentQuizAttemptSummary } from '@/api/model/components-schemas-assessment/studentQuizAttemptSummary';

interface QuizDetailProps {
  quizzesData: QuizResponse[];
  activeQuizId: string;
  setActiveQuizId: (id: string | null) => void;
  attemptsData: StudentQuizAttemptSummary[] | undefined;
  isLoadingAttempts: boolean;
  selectedAttemptId: string | null;
  setSelectedAttemptId: (id: string | null) => void;
  isLoadingAttemptDetails: boolean;
  setUserAnswers: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  setCurrentQuestionIndex: (idx: number) => void;
  setIsAttempting: (val: boolean) => void;
}

export function QuizDetail({
  quizzesData,
  activeQuizId,
  setActiveQuizId,
  attemptsData,
  isLoadingAttempts,
  selectedAttemptId,
  setSelectedAttemptId,
  isLoadingAttemptDetails,
  setUserAnswers,
  setCurrentQuestionIndex,
  setIsAttempting,
}: QuizDetailProps) {
  const selectedQuiz = quizzesData.find((q) => q.id === activeQuizId);

  return (
    <Box py={{ base: 'md', md: 'xl' }} px={{ base: 'xs', sm: 'md' }} style={{ width: '100%' }}>
      <Container size="md" px={{ base: 0, sm: 'md' }} style={{ maxWidth: '840px', width: '100%' }}>
        <Stack gap="xl">
          <Box px={{ base: 'md', sm: 0 }}>
            {quizzesData.length > 1 && (
              <Button
                variant="subtle"
                color="gray"
                leftSection={<IconChevronLeft size={14} />}
                size="xs"
                onClick={() => setActiveQuizId(null)}
                styles={{ root: { paddingLeft: 0, justifyContent: 'flex-start' } }}
                mb="md"
              >
                Back to Quiz List
              </Button>
            )}
            <Text
              size="xs"
              fw={700}
              c="blue.6"
              style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}
            >
              Quiz details
            </Text>
            <Title order={1} size="h2" mt={4} style={{ fontWeight: 800 }}>
              {selectedQuiz?.title}
            </Title>
          </Box>

          <Divider />

          <Grid align="stretch" px={{ base: 'md', sm: 0 }}>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card
                withBorder
                radius="md"
                p={{ base: 'sm', sm: 'md' }}
                bg="gray.0"
                style={{ height: '100%' }}
              >
                <Stack
                  gap="sm"
                  align="center"
                  ta="center"
                  style={{ height: '100%', justifyContent: 'center' }}
                >
                  <ThemeIcon size="lg" radius="xl" color="blue">
                    <IconAward size={20} />
                  </ThemeIcon>
                  <Text fw={600} size="sm">
                    Passing Requirement
                  </Text>
                  <Text size="h3" fw={800} c="blue.7">
                    {selectedQuiz?.passing_score}%
                  </Text>
                  <Text size="xs" c="dimmed">
                    Score at least {selectedQuiz?.passing_score}% to pass
                  </Text>
                </Stack>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card
                withBorder
                radius="md"
                p={{ base: 'sm', sm: 'md' }}
                bg="gray.0"
                style={{ height: '100%' }}
              >
                <Stack
                  gap="sm"
                  align="center"
                  ta="center"
                  style={{ height: '100%', justifyContent: 'center' }}
                >
                  <ThemeIcon size="lg" radius="xl" color="green">
                    <IconCheck size={20} />
                  </ThemeIcon>
                  <Text fw={600} size="sm">
                    Attempts Taken
                  </Text>
                  <Text size="h3" fw={800} c="green.7">
                    {attemptsData ? attemptsData.length : 0}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Take the quiz as many times as needed
                  </Text>
                </Stack>
              </Card>
            </Grid.Col>
            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card
                withBorder
                radius="md"
                p={{ base: 'sm', sm: 'md' }}
                bg="gray.0"
                style={{ height: '100%' }}
              >
                <Stack
                  gap="sm"
                  align="center"
                  ta="center"
                  style={{ height: '100%', justifyContent: 'center' }}
                >
                  <ThemeIcon size="lg" radius="xl" color="orange">
                    <IconRefresh size={20} />
                  </ThemeIcon>
                  <Text fw={600} size="sm">
                    Best Score
                  </Text>
                  <Text size="h3" fw={800} c="orange.7">
                    {attemptsData && attemptsData.length > 0
                      ? `${Math.max(...attemptsData.map((a) => a.score))}%`
                      : '-'}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Highest grade across all attempts
                  </Text>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>

          {/* Attempts History List */}
          <Box mt="md" px={{ base: 'md', sm: 0 }}>
            <Title order={3} size="h4" mb="md" style={{ fontWeight: 700 }}>
              Your Attempts History
            </Title>
            {isLoadingAttempts ? (
              <Center p="md">
                <Loader size="sm" />
              </Center>
            ) : !attemptsData || attemptsData.length === 0 ? (
              <Card withBorder radius="md" p={{ base: 'md', sm: 'lg' }} ta="center">
                <Text c="dimmed" size="sm">
                  You have not attempted this quiz yet.
                </Text>
              </Card>
            ) : (
              <Stack gap="xs">
                {attemptsData.map((attempt, index) => {
                  const isPass = attempt.is_passed;
                  const dateStr = new Date(attempt.completed_at).toLocaleString();
                  return (
                    <Card key={attempt.id} withBorder radius="md" p={{ base: 'sm', sm: 'md' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '12px',
                        }}
                      >
                        <Stack gap={2}>
                          <Text fw={600} size="sm">
                            Attempt #{attemptsData.length - index}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {dateStr}
                          </Text>
                        </Stack>
                        <Group gap="md" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          <Badge color={isPass ? 'green' : 'red'} variant="light">
                            {isPass ? 'PASSED' : 'FAILED'}
                          </Badge>
                          <Text fw={800} size="md" c={isPass ? 'green.8' : 'red.8'}>
                            {attempt.score}%
                          </Text>
                          <Button
                            size="xs"
                            variant="subtle"
                            onClick={() => setSelectedAttemptId(attempt.id)}
                            loading={selectedAttemptId === attempt.id && isLoadingAttemptDetails}
                          >
                            Review
                          </Button>
                        </Group>
                      </div>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Box>

          {/* Start Button */}
          <Box px={{ base: 'md', sm: 0 }} mt="lg">
            <Button
              size="md"
              fullWidth
              hiddenFrom="sm"
              onClick={() => {
                setUserAnswers({});
                setCurrentQuestionIndex(0);
                setIsAttempting(true);
              }}
              rightSection={<IconChevronRight size={18} />}
            >
              {attemptsData && attemptsData.length > 0 ? 'Retake Quiz' : 'Start Quiz'}
            </Button>
            <Button
              size="md"
              visibleFrom="sm"
              onClick={() => {
                setUserAnswers({});
                setCurrentQuestionIndex(0);
                setIsAttempting(true);
              }}
              rightSection={<IconChevronRight size={18} />}
            >
              {attemptsData && attemptsData.length > 0 ? 'Retake Quiz' : 'Start Quiz'}
            </Button>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

