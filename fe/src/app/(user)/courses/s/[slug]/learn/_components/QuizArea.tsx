import React from 'react';
import { Card, Center, Loader, Stack, Text } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { QuizList } from './QuizList';
import { QuizReview } from './QuizReview';
import { QuizActiveAttempt } from './QuizActiveAttempt';
import { QuizDetail } from './QuizDetail';
import { QuizResponse } from '@/api/model/components-schemas-assessment/quizResponse';
import { SubmitQuizResponse } from '@/api/model/components-schemas-assessment/submitQuizResponse';
import { StudentQuizAttemptSummary } from '@/api/model/components-schemas-assessment/studentQuizAttemptSummary';
import { StudentQuestionResponse } from '@/api/model/components-schemas-assessment/studentQuestionResponse';

interface SubmitAttemptMutation {
  mutate: (
    variables: { id: string; data: { answers: { question_id: string; answer_id: string }[] } },
    options?: { onSuccess?: (data: SubmitQuizResponse) => void }
  ) => void;
  isPending: boolean;
}

interface QuizAreaProps {
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
  submitAttemptMutation: SubmitAttemptMutation;
  selectedAttemptId: string | null;
  setSelectedAttemptId: (id: string | null) => void;
  isLoadingAttemptDetails: boolean;
  refetchTree: () => void;
}

export function QuizArea({
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
  submitAttemptMutation,
  selectedAttemptId,
  setSelectedAttemptId,
  isLoadingAttemptDetails,
  refetchTree,
}: QuizAreaProps) {
  if (isLoadingQuizzes) {
    return (
      <Center style={{ flex: 1 }} p="xl">
        <Loader size="lg" />
      </Center>
    );
  }

  if (!quizzesData || quizzesData.length === 0) {
    return (
      <Center style={{ flex: 1 }} p={{ base: 'md', sm: 'xl' }}>
        <Card
          withBorder
          radius="lg"
          p={{ base: 'md', sm: 'xl' }}
          ta="center"
          shadow="sm"
          style={{ maxWidth: '400px' }}
        >
          <Stack align="center" gap="md">
            <IconAlertCircle size={48} color="var(--mantine-color-yellow-filled)" />
            <Text fw={600} size="lg">
              No Quizzes
            </Text>
            <Text c="dimmed">There are no quizzes linked to this lesson node.</Text>
          </Stack>
        </Card>
      </Center>
    );
  }

  // 1. Quizzes List view
  if (!activeQuizId) {
    return <QuizList quizzesData={quizzesData} setActiveQuizId={setActiveQuizId} />;
  }

  // 2. Attempt Review view
  if (activeAttempt) {
    return <QuizReview activeAttempt={activeAttempt} setActiveAttempt={setActiveAttempt} />;
  }

  // 3. Active Attempt view
  if (isAttempting && questionsData && questionsData.length > 0) {
    return (
      <QuizActiveAttempt
        activeQuizId={activeQuizId}
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
      />
    );
  }

  // 4. Quiz Intro / Detail & History page
  return (
    <QuizDetail
      quizzesData={quizzesData}
      activeQuizId={activeQuizId}
      setActiveQuizId={setActiveQuizId}
      attemptsData={attemptsData}
      isLoadingAttempts={isLoadingAttempts}
      selectedAttemptId={selectedAttemptId}
      setSelectedAttemptId={setSelectedAttemptId}
      isLoadingAttemptDetails={isLoadingAttemptDetails}
      setUserAnswers={setUserAnswers}
      setCurrentQuestionIndex={setCurrentQuestionIndex}
      setIsAttempting={setIsAttempting}
    />
  );
}
