'use client';

import React, { useState } from 'react';
import {
  Card,
  Center,
  Loader,
  Stack,
  Text,
  Title,
  Badge,
  Group,
  Button,
  Tabs,
  Paper,
  SimpleGrid,
  ThemeIcon,
  Alert,
} from '@mantine/core';
import {
  IconClock,
  IconTrophy,
  IconHistory,
  IconPlayerPlay,
  IconAlertTriangle,
  IconChecklist,
  IconSparkles,
  IconMinus,
} from '@tabler/icons-react';
import { ModelTestLeaderboard } from './ModelTestLeaderboard';
import { ModelTestAttemptsHistory } from './ModelTestAttemptsHistory';
import { ModelTestActiveAttempt } from './ModelTestActiveAttempt';
import { ModelTestReview } from './ModelTestReview';
import { QuizResponse } from '@/api/model/components-schemas-assessment/quizResponse';
import { SubmitQuizResponse } from '@/api/model/components-schemas-assessment/submitQuizResponse';
import { StudentQuizAttemptSummary } from '@/api/model/components-schemas-assessment/studentQuizAttemptSummary';
import { StudentQuestionResponse } from '@/api/model/components-schemas-assessment/studentQuestionResponse';
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

interface ModelTestAreaProps {
  nodeTitle?: string;
  modelTest?: ModelTestSummaryResponse | null;
  quizzesData: QuizResponse[] | undefined;
  isLoadingQuizzes: boolean;
  activeQuizId: string | null;
  setActiveQuizId: (id: string | null) => void;
  activeAttempt: SubmitQuizResponse | null;
  setActiveAttempt: (attempt: SubmitQuizResponse | null) => void;
  userAnswers: Record<string, string[]>;
  setUserAnswers: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
  isAttempting: boolean;
  setIsAttempting: (val: boolean) => void;
  currentQuestionIndex: number;
  setCurrentQuestionIndex: (idx: number) => void;
  attemptsData: StudentQuizAttemptSummary[] | undefined;
  isLoadingAttempts: boolean;
  refetchAttempts: () => void;
  questionsData: StudentQuestionResponse[] | undefined;
  isLoadingQuestions?: boolean;
  submitAttemptMutation: SubmitAttemptMutation;
  selectedAttemptId: string | null;
  setSelectedAttemptId: (id: string | null) => void;
  isLoadingAttemptDetails: boolean;
  refetchTree: () => void;
  nodeId?: string;
  updateProgress?: (nodeId: string, status: 'STARTED' | 'COMPLETED') => Promise<void>;
}

export function ModelTestArea({
  nodeTitle,
  modelTest,
  quizzesData,
  isLoadingQuizzes,
  activeQuizId,
  setActiveQuizId,
  activeAttempt,
  setActiveAttempt,
  userAnswers,
  setUserAnswers,
  isAttempting,
  setIsAttempting,
  currentQuestionIndex,
  setCurrentQuestionIndex,
  attemptsData,
  isLoadingAttempts,
  refetchAttempts,
  questionsData,
  isLoadingQuestions,
  submitAttemptMutation,
  selectedAttemptId,
  setSelectedAttemptId,
  isLoadingAttemptDetails,
  refetchTree,
  nodeId,
  updateProgress,
}: ModelTestAreaProps) {
  const [activeTab, setActiveTab] = useState<string | null>('overview');

  const linkedQuiz = quizzesData?.[0];
  const targetQuizId = linkedQuiz?.id || activeQuizId || '';

  const durationMinutes = modelTest?.duration_minutes ?? 60;
  const totalMarks = modelTest?.total_marks ?? 100;
  const passMarks = modelTest?.pass_marks ?? 40;
  const negativeMarkRate = modelTest?.negative_marking_rate ?? 0.50;

  // Best score and attempts count
  const attemptsCount = attemptsData?.length || 0;
  const firstAttempt = attemptsData?.find((a) => a.is_first_attempt);

  const handleStartExam = () => {
    const qId = linkedQuiz?.id || targetQuizId;
    if (qId) {
      setActiveQuizId(qId);
    }
    setUserAnswers({});
    setCurrentQuestionIndex(0);
    setActiveAttempt(null);
    setIsAttempting(true);
  };

  if (isLoadingQuizzes) {
    return (
      <Center py={80}>
        <Stack align="center" gap="sm">
          <Loader size="lg" color="indigo" />
          <Text size="sm" c="dimmed">
            মডেল টেস্ট লোড হচ্ছে...
          </Text>
        </Stack>
      </Center>
    );
  }

  // 1. If currently taking the timed test
  if (isAttempting) {
    if (isLoadingQuestions) {
      return (
        <Center py={100}>
          <Stack align="center" gap="md">
            <Loader size="xl" color="indigo" />
            <Text size="md" fw={600} c="indigo.8">
              পরীক্ষার প্রশ্নপত্র লোড করা হচ্ছে...
            </Text>
            <Text size="xs" c="dimmed">
              কাউন্টডাউন টাইমার স্বয়ংক্রিয়ভাবে সক্রিয় হবে
            </Text>
          </Stack>
        </Center>
      );
    }

    if (!questionsData || questionsData.length === 0) {
      return (
        <Center py={80}>
          <Paper withBorder p="xl" radius="lg" maw={500} ta="center">
            <Stack align="center" gap="md">
              <ThemeIcon size={50} radius="xl" color="yellow" variant="light">
                <IconAlertTriangle size={28} />
              </ThemeIcon>
              <Title order={4}>প্রশ্নপত্র পাওয়া যায়নি</Title>
              <Text size="sm" c="dimmed">
                এই মডেল টেস্টে এখনও কোনো প্রশ্ন যুক্ত করা হয়নি। অনুগ্রহ করে পরবর্তীতে আবার চেষ্টা করুন।
              </Text>
              <Button
                variant="light"
                color="indigo"
                onClick={() => setIsAttempting(false)}
              >
                ড্যাশবোর্ডে ফিরে যান
              </Button>
            </Stack>
          </Paper>
        </Center>
      );
    }

    return (
      <ModelTestActiveAttempt
        activeQuizId={targetQuizId}
        modelTest={modelTest}
        modelTestTitle={nodeTitle}
        questionsData={questionsData}
        currentQuestionIndex={currentQuestionIndex}
        setCurrentQuestionIndex={setCurrentQuestionIndex}
        userAnswers={userAnswers}
        setUserAnswers={setUserAnswers}
        setIsAttempting={setIsAttempting}
        submitAttemptMutation={submitAttemptMutation}
        setActiveAttempt={setActiveAttempt}
        refetchAttempts={refetchAttempts}
        refetchTree={refetchTree}
        nodeId={nodeId}
        updateProgress={updateProgress}
      />
    );
  }

  // 2. If viewing graded results/review
  if (activeAttempt) {
    return (
      <ModelTestReview
        activeAttempt={activeAttempt}
        setActiveAttempt={setActiveAttempt}
        onRetake={handleStartExam}
        onViewLeaderboard={() => {
          setActiveAttempt(null);
          setActiveTab('leaderboard');
        }}
      />
    );
  }

  // 3. Model Test Hub
  return (
    <Stack gap="xl" py="xs" data-testid="model-test-hub">
      {/* Exam Header Hero Card */}
      <Paper
        withBorder
        p={{ base: 'md', sm: 'xl' }}
        radius="lg"
        style={{
          backgroundColor: '#ffffff',
          borderColor: '#e2e8f0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
        }}
      >
        <Stack gap="lg">
          <Group justify="space-between" align="flex-start" wrap="wrap">
            <div>
              <Badge size="lg" color="indigo" variant="gradient" gradient={{ from: 'indigo.7', to: 'violet.7' }}>
                অফিশিয়াল মডেল টেস্ট
              </Badge>
              <Title order={2} size="h3" style={{ fontWeight: 800, marginTop: '8px', color: '#0f172a' }}>
                {nodeTitle || 'বিসিএস প্রিলিমিনারি লাইভ মডেল টেস্ট'}
              </Title>
              <Text size="xs" c="dimmed" mt={4}>
                সময়সীমাবদ্ধ পরীক্ষা ও রিয়েল-টাইম মেধা তালিকা
              </Text>
            </div>

            <Button
              size="md"
              color="indigo"
              variant="gradient"
              gradient={{ from: 'indigo.6', to: 'violet.6' }}
              leftSection={<IconPlayerPlay size={20} />}
              onClick={handleStartExam}
              disabled={!targetQuizId}
              style={{ fontWeight: 700, minWidth: '180px' }}
              data-testid="start-model-test-btn"
            >
              {attemptsCount > 0 ? 'পুনরায় পরীক্ষা দিন' : 'পরীক্ষা শুরু করুন'}
            </Button>
          </Group>

          {/* Quick Specifications Grid */}
          <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
            <Paper withBorder p="sm" radius="md" bg="gray.0">
              <Group gap="xs">
                <ThemeIcon size={32} radius="md" color="indigo" variant="light">
                  <IconClock size={18} />
                </ThemeIcon>
                <div>
                  <Text size="11px" c="dimmed" fw={600}>
                    সময়সীমা
                  </Text>
                  <Text size="sm" fw={800} c="gray.8">
                    {durationMinutes} মিনিট
                  </Text>
                </div>
              </Group>
            </Paper>

            <Paper withBorder p="sm" radius="md" bg="gray.0">
              <Group gap="xs">
                <ThemeIcon size={32} radius="md" color="blue" variant="light">
                  <IconChecklist size={18} />
                </ThemeIcon>
                <div>
                  <Text size="11px" c="dimmed" fw={600}>
                    পূর্ণমান (Marks)
                  </Text>
                  <Text size="sm" fw={800} c="gray.8">
                    {totalMarks} নম্বর
                  </Text>
                </div>
              </Group>
            </Paper>

            <Paper withBorder p="sm" radius="md" bg="gray.0">
              <Group gap="xs">
                <ThemeIcon size={32} radius="md" color="teal" variant="light">
                  <IconSparkles size={18} />
                </ThemeIcon>
                <div>
                  <Text size="11px" c="dimmed" fw={600}>
                    পাস মার্কস
                  </Text>
                  <Text size="sm" fw={800} c="green.7">
                    {passMarks} নম্বর
                  </Text>
                </div>
              </Group>
            </Paper>

            <Paper withBorder p="sm" radius="md" bg="gray.0">
              <Group gap="xs">
                <ThemeIcon size={32} radius="md" color="red" variant="light">
                  <IconMinus size={18} />
                </ThemeIcon>
                <div>
                  <Text size="11px" c="dimmed" fw={600}>
                    নেগেটিভ মার্ক
                  </Text>
                  <Text size="sm" fw={800} c="red.6">
                    -{negativeMarkRate.toFixed(2)} / ভুল
                  </Text>
                </div>
              </Group>
            </Paper>
          </SimpleGrid>
        </Stack>
      </Paper>

      {/* Tabs Layout */}
      <Tabs value={activeTab} onChange={setActiveTab} color="indigo" radius="md">
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconChecklist size={16} />}>
            নির্দেশনাবলী ও প্রস্তুতি
          </Tabs.Tab>
          <Tabs.Tab value="leaderboard" leftSection={<IconTrophy size={16} />}>
            লিডারবোর্ড (র‍্যাংক লিস্ট)
          </Tabs.Tab>
          <Tabs.Tab
            value="history"
            leftSection={<IconHistory size={16} />}
            rightSection={
              attemptsCount > 0 ? (
                <Badge size="xs" color="indigo" variant="filled">
                  {attemptsCount}
                </Badge>
              ) : null
            }
          >
            ফলাফল ইতিহাস
          </Tabs.Tab>
        </Tabs.List>

        {/* Tab 1: Overview & Guidelines */}
        <Tabs.Panel value="overview" pt="lg">
          <Stack gap="lg">
            {/* Student's Current Standing if attempted */}
            {firstAttempt && (
              <Paper withBorder p="md" radius="md" bg="blue.0">
                <Group justify="space-between" align="center" wrap="wrap">
                  <Group gap="sm">
                    <ThemeIcon size={36} radius="md" color="blue">
                      <IconTrophy size={20} />
                    </ThemeIcon>
                    <div>
                      <Text size="xs" fw={700} c="blue.9">
                        আপনার অফিশিয়াল মেধা স্কোর (১ম প্রচেষ্টা)
                      </Text>
                      <Text size="sm" fw={800} c="blue.9">
                        প্রাপ্ত নম্বর: {firstAttempt.score.toFixed(2)} • অবস্থা: {firstAttempt.is_passed ? 'উত্তীর্ণ' : 'অনুত্তীর্ণ'}
                      </Text>
                    </div>
                  </Group>
                  <Button
                    size="xs"
                    variant="light"
                    color="blue"
                    onClick={() => setActiveTab('leaderboard')}
                  >
                    র‍্যাংক লিস্ট দেখুন
                  </Button>
                </Group>
              </Paper>
            )}

            <Card withBorder radius="md" p="lg" style={{ backgroundColor: '#ffffff' }}>
              <Stack gap="md">
                <Title order={4} size="h5" style={{ fontWeight: 700 }}>
                  পরীক্ষার নিয়মাবলী ও গুরুত্বপূর্ণ তথ্য:
                </Title>
                <Stack gap="xs">
                  <Text size="sm" c="gray.7">
                    • পরীক্ষা শুরু করার সাথে সাথে কাউন্টডাউন টাইমার সক্রিয় হবে এবং সময় সমাপ্ত হলে স্বয়ংক্রিয়ভাবে পরীক্ষা জমা হয়ে যাবে।
                  </Text>
                  <Text size="sm" c="gray.7">
                    • প্রতিটি সঠিক উত্তরের জন্য নম্বর বরাদ্দ থাকবে এবং ভুল উত্তরের জন্য <strong>{negativeMarkRate} নম্বর</strong> কর্তন করা হবে।
                  </Text>
                  <Text size="sm" c="gray.7">
                    • অফিশিয়াল মেধা তালিকা (Leaderboard): কেবল আপনার <strong>প্রথম প্রচেষ্টার (First Attempt)</strong> প্রাপ্ত নম্বর ও ব্যয়িত সময় অনুযায়ী অফিশিয়াল র‍্যাংক নির্ধারণ করা হবে।
                  </Text>
                  <Text size="sm" c="gray.7">
                    • অনুশীলনের উদ্দেশ্যে আপনি যতবার খুশি এই মডেল টেস্টটি পুনরায় দিতে পারবেন এবং বিস্তারিত সমাধান ও ব্যাখ্যা দেখতে পারবেন।
                  </Text>
                </Stack>

                <Group mt="md">
                  <Button
                    size="md"
                    color="indigo"
                    variant="filled"
                    leftSection={<IconPlayerPlay size={18} />}
                    onClick={handleStartExam}
                    disabled={!targetQuizId}
                    style={{ fontWeight: 700 }}
                  >
                    {attemptsCount > 0 ? 'পুনরায় পরীক্ষা দিন' : 'পরীক্ষা শুরু করুন'}
                  </Button>
                </Group>
              </Stack>
            </Card>
          </Stack>
        </Tabs.Panel>

        {/* Tab 2: Leaderboard */}
        <Tabs.Panel value="leaderboard" pt="lg">
          {targetQuizId ? (
            <ModelTestLeaderboard quizId={targetQuizId} />
          ) : (
            <Alert color="yellow" icon={<IconAlertTriangle size={16} />}>
              এই মডেল টেস্টের জন্য কোনো কুইজ আইডি পাওয়া যায়নি।
            </Alert>
          )}
        </Tabs.Panel>

        {/* Tab 3: History */}
        <Tabs.Panel value="history" pt="lg">
          <ModelTestAttemptsHistory
            attemptsData={attemptsData}
            isLoadingAttempts={isLoadingAttempts}
            selectedAttemptId={selectedAttemptId}
            setSelectedAttemptId={setSelectedAttemptId}
            isLoadingAttemptDetails={isLoadingAttemptDetails}
          />
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
