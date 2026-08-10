'use client';

import {
  Container,
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
  Badge,
  ThemeIcon,
} from '@mantine/core';
import {
  IconArrowLeft,
  IconAlertCircle,
  IconMenu2,
  IconBook,
  IconBooks,
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
      <Box py="xl" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
        <Container size="xl">
          <Stack gap="xl">
            <Skeleton height={50} radius="md" />
            <Skeleton height={420} radius="xl" />
            <Skeleton height={150} radius="lg" />
          </Stack>
        </Container>
      </Box>
    );
  }

  const progressPercent = totalSlidesCount > 0 ? Math.min(100, Math.round((currentSlideProgressIndex / totalSlidesCount) * 100)) : 0;

  return (
    <Box
      style={{
        display: 'flex',
        height: 'calc(100vh - 60px)',
        backgroundColor: '#f8fafc',
        overflow: 'hidden',
      }}
    >
      {/* PC Left Fixed Navigation Sidebar */}
      <Box
        visibleFrom="md"
        style={{
          width: '300px',
          height: '100%',
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          boxShadow: '4px 0 16px rgba(0, 0, 0, 0.02)',
        }}
      >
        <Box p="md" style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#fafbfc' }}>
          <Button
            component={Link}
            href={`/courses/s/${slug}`}
            variant="subtle"
            color="gray.7"
            leftSection={<IconArrowLeft size={16} />}
            size="xs"
            styles={{ root: { paddingLeft: 0, justifyContent: 'flex-start', color: '#475569', fontWeight: 600 } }}
          >
            কোর্স ল্যান্ডিং পেজে ফিরুন
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

      {/* Mobile Syllabus Drawer (Left Side) */}
      <Drawer
        opened={mobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        size="310px"
        padding={0}
        withCloseButton={false}
        position="left"
      >
        <Box style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>
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
      </Drawer>

      {/* Main Right Workspace Area */}
      <Box
        style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#f8fafc',
        }}
      >
        {/* Top Header Bar */}
        <Box
          px="md"
          py="xs"
          style={{
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            flexShrink: 0,
          }}
        >
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <Button
                hiddenFrom="md"
                variant="subtle"
                color="gray.7"
                p={4}
                onClick={() => setMobileSidebarOpen(true)}
                leftSection={<IconMenu2 size={20} color="#2563eb" />}
                size="sm"
                style={{ fontWeight: 700 }}
              >
                সিলেবাস
              </Button>
              <Group gap="xs" visibleFrom="md">
                <ThemeIcon size={26} radius="md" variant="gradient" gradient={{ from: 'blue', to: 'violet' }}>
                  <IconBooks size={15} color="white" />
                </ThemeIcon>
                <Text size="sm" fw={800} style={{ color: '#0f172a' }} lineClamp={1}>
                  {course?.title}
                </Text>
              </Group>
            </Group>

            <Group gap="xs">
              <Badge variant="light" color="blue" size="md">
                অগ্রগতি: {currentSlideProgressIndex} / {totalSlidesCount} ({progressPercent}%)
              </Badge>
            </Group>
          </Group>
        </Box>

        {/* Content Scrollable Workspace */}
        <Box
          style={{
            flex: 1,
            overflowY: 'auto',
            backgroundColor: '#f8fafc',
          }}
          p={{ base: '8px', sm: '16px' }}
        >
          <Container size="xl" p={0} style={{ maxWidth: '1100px', width: '100%' }}>
            <Stack gap="md">
              {/* Main Content Player Container */}
              <Box style={{ width: '100%', borderRadius: '16px', overflow: 'hidden' }}>
                {selectedLessonId ? (
                  isLoadingLesson ? (
                    <Center style={{ minHeight: '360px', backgroundColor: '#ffffff', borderRadius: '16px' }}>
                      <Loader size="lg" color="blue" />
                    </Center>
                  ) : lessonDetails ? (
                    isVideoSlide ? (
                      /* Video Player Card */
                      <Card p={0} radius="lg" withBorder style={{ backgroundColor: '#000000', borderColor: '#cbd5e1', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)' }}>
                        <Box style={{ width: '100%', aspectRatio: '16/9', maxHeight: '540px' }}>
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
                              <Text c="white">এই লেকচারের ভিডিও স্ট্রিমিং ফাইল পাওয়া যায়নি।</Text>
                            </Center>
                          )}
                        </Box>
                      </Card>
                    ) : activeSlideType === 'quiz' ? (
                      /* Interactive Quiz Module View */
                      <Card p={{ base: 'md', sm: 'xl' }} radius="lg" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
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
                      </Card>
                    ) : (
                      /* MathJax Reading Notes View */
                      <Card p={0} radius="lg" withBorder style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)' }}>
                        <LessonTextView
                          lessonDetails={lessonDetails}
                          selectedLessonId={selectedLessonId}
                          currentTreeNode={currentTreeNode}
                          updateProgress={updateProgress}
                          isPendingProgress={upsertProgressMutation.isPending}
                        />
                      </Card>
                    )
                  ) : (
                    <Center p="xl" style={{ minHeight: '300px', backgroundColor: '#ffffff', borderRadius: '16px' }}>
                      <Alert title="ত্রুটি" color="red" icon={<IconAlertCircle size={16} />}>
                        লেকচার বিবরণি লোড করা সম্ভব হয়নি। সিলেবাস থেকে অন্য একটি লেকচার নির্বাচন করুন।
                      </Alert>
                    </Center>
                  )
                ) : (
                  <Center p={{ base: 'md', sm: 'xl' }} style={{ minHeight: '360px', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <Card p="xl" radius="lg" ta="center" shadow="none">
                      <Stack align="center" gap="md">
                        <ThemeIcon size={64} radius="xl" variant="light" color="blue">
                          <IconBook size={32} color="#2563eb" />
                        </ThemeIcon>
                        <Title order={3} style={{ fontWeight: 800, color: '#0f172a' }}>
                          পড়াশোনা শুরু করতে প্রস্তুত?
                        </Title>
                        <Text c="dimmed" size="sm" style={{ lineHeight: 1.6 }}>
                          বামপাশের সিলেবাস তালিকা থেকে যেকোনো একটি ভিডিও বা রিভিশন লেকচার নির্বাচন করুন।
                        </Text>
                      </Stack>
                    </Card>
                  </Center>
                )}
              </Box>
            </Stack>
          </Container>
        </Box>

        {/* Bottom Navigation Dock */}
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
