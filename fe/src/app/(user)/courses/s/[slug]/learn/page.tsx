'use client';

import {
  Container,
  Grid,
  Text,
  Stack,
  Group,
  Card,
  Skeleton,
  Button,
  Box,
  Drawer,
  Center,
  Alert,
  Loader,
  Title,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconAlertCircle,
  IconMenu2,
  IconBook,
} from '@tabler/icons-react';
import Link from 'next/link';

// Refactored Sub-Components & Hooks
import { LessonPlayer } from './_components/LessonPlayer';
import { LessonTextView } from './_components/LessonTextView';
import { SyllabusSidebar } from './_components/SyllabusSidebar';
import { FooterNavBar } from './_components/FooterNavBar';
import { QuizArea } from './_components/QuizArea';
import { useCoursePlayer } from './_components/useCoursePlayer';

export default function CoursePlayerPage() {
  const {
    slug,
    selectedLessonId,
    currentSubSlideIndex,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    isLoadingUser,
    course,
    isLoadingCourse,
    isLoadingAccess,
    isLoadingTree,
    refetchTree,
    lessonDetails,
    isLoadingLesson,
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
    upsertProgressMutation,
    currentTreeNode,
    updateProgress,
    organizedTree,
    flatLessons,
    currentLessonIndex,
    prevLesson,
    nextLesson,
    activeSubSlides,
    activeSlideType,
    isVideoSlide,
    totalSlidesCount,
    currentSlideProgressIndex,
    handlePrev,
    handleNext,
    handleSelectLesson,
    handleSelectQuiz,
  } = useCoursePlayer();

  if (isLoadingUser || isLoadingCourse || isLoadingAccess || isLoadingTree) {
    return (
      <Container size="xl" py="xl">
        <Grid gap="md">
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap="md">
              <Skeleton height={400} radius="md" />
              <Skeleton height={30} width="60%" />
              <Skeleton height={20} />
              <Skeleton height={20} width="80%" />
            </Stack>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Skeleton height={500} radius="md" />
          </Grid.Col>
        </Grid>
      </Container>
    );
  }

  return (
    <Box
      style={{
        display: 'flex',
        height: 'calc(100vh - 60px)',
        margin: 'calc(-1 * var(--mantine-spacing-md))',
        overflow: 'hidden',
        backgroundColor: 'var(--mantine-color-body)',
      }}
    >
      {/* Desktop Navigation Sidebar */}
      <Box
        visibleFrom="md"
        style={{
          width: '320px',
          height: '100%',
          backgroundColor: 'var(--mantine-color-default)',
          borderRight: '1px solid var(--mantine-color-default-border)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        <Box p="md" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
          <Button
            component={Link}
            href={`/courses/s/${slug}`}
            variant="subtle"
            color="gray"
            leftSection={<IconArrowLeft size={16} />}
            size="xs"
            styles={{ root: { paddingLeft: 0, justifyContent: 'flex-start' } }}
          >
            Back to Course Landing Page
          </Button>
        </Box>

        <Box style={{ flex: 1, minHeight: 0 }}>
          <SyllabusSidebar
            organizedTree={organizedTree}
            selectedLessonId={selectedLessonId}
            activeQuizId={activeQuizId}
            handleSelectLesson={handleSelectLesson}
            handleSelectQuiz={handleSelectQuiz}
            totalSlidesCount={totalSlidesCount}
            currentSlideProgressIndex={currentSlideProgressIndex}
          />
        </Box>
      </Box>

      {/* Mobile Syllabus Drawer */}
      <Drawer
        opened={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        size="320px"
        padding={0}
        withCloseButton={false}
      >
        <Box style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box p="md" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
            <Group justify="space-between" align="center" mb="xs">
              <Title order={4} size="h5" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconBook size={18} color="var(--mantine-color-blue-filled)" />
                Syllabus
              </Title>
              <Button variant="subtle" color="gray" size="xs" onClick={() => setMobileSidebarOpen(false)}>
                Close
              </Button>
            </Group>
          </Box>
          <Box style={{ flex: 1, minHeight: 0 }}>
            <SyllabusSidebar
              organizedTree={organizedTree}
              selectedLessonId={selectedLessonId}
              activeQuizId={activeQuizId}
              handleSelectLesson={handleSelectLesson}
              handleSelectQuiz={handleSelectQuiz}
              setMobileSidebarOpen={setMobileSidebarOpen}
              totalSlidesCount={totalSlidesCount}
              currentSlideProgressIndex={currentSlideProgressIndex}
            />
          </Box>
        </Box>
      </Drawer>

      {/* Main Content Area */}
      <Box
        style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: 'var(--mantine-color-body)',
        }}
      >
        {/* Mobile Header */}
        <Box
          hiddenFrom="md"
          p="xs"
          style={{
            borderBottom: '1px solid var(--mantine-color-default-border)',
            backgroundColor: 'var(--mantine-color-default)',
            flexShrink: 0,
          }}
        >
          <Group justify="space-between" align="center">
            <Button
              variant="subtle"
              color="gray"
              p={4}
              onClick={() => setMobileSidebarOpen(true)}
              leftSection={<IconMenu2 size={20} />}
              size="sm"
            >
              Menu
            </Button>
            <Text size="xs" fw={600} lineClamp={1} style={{ maxWidth: '160px' }}>
              {course?.title}
            </Text>
            <Button
              component={Link}
              href={`/courses/s/${slug}`}
              variant="subtle"
              size="xs"
              leftSection={<IconArrowLeft size={14} />}
            >
              Back
            </Button>
          </Group>
        </Box>

        {/* Upper Content Pane */}
        <Box
          style={{
            flex: 1,
            overflowY: isVideoSlide ? 'hidden' : 'auto',
            backgroundColor: isVideoSlide ? '#000' : 'var(--mantine-color-body)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          {selectedLessonId ? (
            isLoadingLesson ? (
              <Center style={{ flex: 1 }}>
                <Loader size="lg" />
              </Center>
            ) : lessonDetails ? (
              isVideoSlide ? (
                /* Immersive Full Bleed Video Player */
                <Box style={{ width: '100%', height: '100%', minHeight: 0, flex: 1 }}>
                  {lessonDetails.video_url ? (
                    <LessonPlayer
                      videoId={lessonDetails.video_url}
                      onEnded={() => {
                        if (selectedLessonId) {
                          updateProgress(selectedLessonId, 'COMPLETED');
                        }
                      }}
                    />
                  ) : (
                    <Center h="100%" bg="dark.9">
                      <Text c="white">No video file available for streaming.</Text>
                    </Center>
                  )}
                </Box>
              ) : activeSlideType === 'quiz' ? (
                /* Interactive Quiz Module View */
                <QuizArea
                  quizzesData={quizzesData}
                  isLoadingQuizzes={isLoadingQuizzes}
                  activeQuizId={activeQuizId}
                  setActiveQuizId={setActiveQuizId}
                  activeAttempt={activeAttempt}
                  setActiveAttempt={setActiveAttempt}
                  userAnswers={userAnswers}
                  setUserAnswers={setUserAnswers}
                  isAttempting={isAttempting}
                  setIsAttempting={setIsAttempting}
                  currentQuestionIndex={currentQuestionIndex}
                  setCurrentQuestionIndex={setCurrentQuestionIndex}
                  attemptsData={attemptsData}
                  isLoadingAttempts={isLoadingAttempts}
                  refetchAttempts={refetchAttempts}
                  questionsData={questionsData}
                  submitAttemptMutation={submitAttemptMutation}
                  selectedAttemptId={selectedAttemptId}
                  setSelectedAttemptId={setSelectedAttemptId}
                  isLoadingAttemptDetails={isLoadingAttemptDetails}
                  refetchTree={refetchTree}
                />
              ) : (
                /* Premium MathJax Text/Reading content slide */
                <LessonTextView
                  lessonDetails={lessonDetails}
                  selectedLessonId={selectedLessonId}
                  currentTreeNode={currentTreeNode}
                  updateProgress={updateProgress}
                  isPendingProgress={upsertProgressMutation.isPending}
                />
              )
            ) : (
              <Center style={{ flex: 1 }} p="xl">
                <Alert title="Error" color="red" icon={<IconAlertCircle size={16} />}>
                  Failed to load lesson details. Please select another item from the syllabus.
                </Alert>
              </Center>
            )
          ) : (
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
                  <IconBook size={48} color="var(--mantine-color-blue-filled)" />
                  <Text fw={600} size="lg">
                    Ready to start learning?
                  </Text>
                  <Text c="dimmed">Select a lesson from the syllabus sidebar to begin.</Text>
                </Stack>
              </Card>
            </Center>
          )}
        </Box>

        {/* Attached & Immovable Bottom Footer Navigation Bar */}
        {!isAttempting && (
          <FooterNavBar
            currentSubSlideIndex={currentSubSlideIndex}
            currentLessonIndex={currentLessonIndex}
            flatLessons={flatLessons}
            activeSubSlides={activeSubSlides}
            lessonDetails={lessonDetails}
            prevLesson={prevLesson}
            nextLesson={nextLesson}
            handlePrev={handlePrev}
            handleNext={handleNext}
            totalSlidesCount={totalSlidesCount}
            currentSlideProgressIndex={currentSlideProgressIndex}
          />
        )}
      </Box>
    </Box>
  );
}
