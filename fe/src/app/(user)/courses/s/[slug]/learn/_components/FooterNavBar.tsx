import { Box, Button, Text } from '@mantine/core';
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react';

interface FlatLesson {
  id: string;
  title: string;
  video_url?: string | null;
  text_content?: string | null;
  has_quizzes?: boolean;
}

interface FooterNavBarProps {
  currentSubSlideIndex: number;
  currentLessonIndex: number;
  flatLessons: FlatLesson[];
  activeSubSlides: ('video' | 'text' | 'quiz')[];
  lessonDetails: {
    title: string;
  } | null | undefined;
  prevLesson: {
    title: string;
  } | null;
  nextLesson: {
    title: string;
  } | null;
  handlePrev: () => void;
  handleNext: () => void;
  totalSlidesCount: number;
  currentSlideProgressIndex: number;
}

export function FooterNavBar({
  currentSubSlideIndex,
  currentLessonIndex,
  flatLessons,
  activeSubSlides,
  lessonDetails,
  prevLesson,
  nextLesson,
  handlePrev,
  handleNext,
  totalSlidesCount,
  currentSlideProgressIndex,
}: FooterNavBarProps) {
  const getSlideLabel = (type: 'video' | 'text' | 'quiz') => {
    if (type === 'video') return 'Video';
    if (type === 'text') return 'Reading';
    if (type === 'quiz') return 'Quiz';
    return '';
  };

  const progressPercent = totalSlidesCount > 0 && currentSlideProgressIndex >= 0
    ? Math.round((currentSlideProgressIndex / totalSlidesCount) * 100)
    : 0;

  return (
    <Box
      style={{
        borderTop: '1px solid var(--mantine-color-default-border)',
        backgroundColor: 'var(--mantine-color-default)',
        height: '64px',
        zIndex: 10,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'stretch',
      }}
    >
      {/* Left Side: Previous Slide Button */}
      <Box style={{ flex: 1, maxWidth: '220px', display: 'flex', alignItems: 'stretch' }}>
        {currentSubSlideIndex > 0 || currentLessonIndex > 0 ? (
          <Button
            variant="subtle"
            color="gray"
            onClick={handlePrev}
            leftSection={<IconChevronLeft size={16} />}
            justify="flex-start"
            style={{
              height: '100%',
              width: '100%',
              borderRadius: 0,
              paddingLeft: '24px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Box ta="left" visibleFrom="xs">
              <Text size="xs" c="dimmed" style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: 700 }}>
                Previous
              </Text>
              <Text size="sm" fw={600} lineClamp={1} style={{ maxWidth: '140px' }}>
                {currentSubSlideIndex > 0
                  ? `${lessonDetails?.title || ''} - ${getSlideLabel(activeSubSlides[currentSubSlideIndex - 1])}`
                  : prevLesson?.title || ''}
              </Text>
            </Box>
            <Text hiddenFrom="xs" size="sm">
              Prev
            </Text>
          </Button>
        ) : (
          <Button
            variant="subtle"
            disabled
            leftSection={<IconChevronLeft size={16} />}
            justify="flex-start"
            style={{
              height: '100%',
              width: '100%',
              borderRadius: 0,
              paddingLeft: '24px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Text size="sm">Start</Text>
          </Button>
        )}
      </Box>

      {/* Center: Slide Count and Info */}
      <Box
        style={{
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
          flex: 1,
          borderLeft: '1px solid var(--mantine-color-default-border)',
          borderRight: '1px solid var(--mantine-color-default-border)',
          padding: '0 16px',
          backgroundColor: 'var(--mantine-color-body)',
        }}
      >
        <Text size="sm" fw={700} lineClamp={1}>
          {lessonDetails ? lessonDetails.title : ''}
        </Text>
        <Text size="xs" c="dimmed">
          {totalSlidesCount > 0 && currentSlideProgressIndex >= 0
            ? `Slide ${currentSlideProgressIndex} of ${totalSlidesCount} (${progressPercent}%)`
            : '0%'}
        </Text>
      </Box>

      {/* Right Side: Next Slide Button */}
      <Box style={{ flex: 1, maxWidth: '220px', display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end' }}>
        {currentSubSlideIndex < activeSubSlides.length - 1 || currentLessonIndex < flatLessons.length - 1 ? (
          <Button
            variant="subtle"
            onClick={handleNext}
            rightSection={<IconChevronRight size={16} />}
            justify="flex-end"
            style={{
              height: '100%',
              width: '100%',
              borderRadius: 0,
              paddingRight: '24px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Box ta="right" visibleFrom="xs">
              <Text size="xs" c="dimmed" style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: 700 }}>
                Next
              </Text>
              <Text size="sm" fw={600} lineClamp={1} style={{ maxWidth: '140px' }}>
                {currentSubSlideIndex < activeSubSlides.length - 1
                  ? `${lessonDetails?.title || ''} - ${getSlideLabel(activeSubSlides[currentSubSlideIndex + 1])}`
                  : nextLesson?.title || ''}
              </Text>
            </Box>
            <Text hiddenFrom="xs" size="sm">
              Next
            </Text>
          </Button>
        ) : (
          <Button
            variant="subtle"
            disabled
            rightSection={<IconChevronRight size={16} />}
            justify="flex-end"
            style={{
              height: '100%',
              width: '100%',
              borderRadius: 0,
              paddingRight: '24px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Text size="sm">Finish</Text>
          </Button>
        )}
      </Box>
    </Box>
  );
}
