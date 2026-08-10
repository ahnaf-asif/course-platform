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
    if (type === 'video') return 'ভিডিও';
    if (type === 'text') return 'রিভিশন শিট';
    if (type === 'quiz') return 'মডেল কুইজ';
    return '';
  };

  const progressPercent = totalSlidesCount > 0 && currentSlideProgressIndex >= 0
    ? Math.round((currentSlideProgressIndex / totalSlidesCount) * 100)
    : 0;

  return (
    <Box
      style={{
        borderTop: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        height: '60px',
        zIndex: 10,
        flexShrink: 0,
        display: 'flex',
        alignItems: 'stretch',
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.03)',
      }}
    >
      {/* Left Side: Previous Slide Button */}
      <Box style={{ flex: 1, maxWidth: '240px', display: 'flex', alignItems: 'stretch' }}>
        {currentSubSlideIndex > 0 || currentLessonIndex > 0 ? (
          <Button
            variant="subtle"
            color="gray.7"
            onClick={handlePrev}
            leftSection={<IconChevronLeft size={18} />}
            justify="flex-start"
            style={{
              height: '100%',
              width: '100%',
              borderRadius: 0,
              paddingLeft: '20px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Box ta="left" visibleFrom="xs">
              <Text size="xs" c="dimmed" style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: 700 }}>
                পূর্ববর্তী
              </Text>
              <Text size="xs" fw={700} c="gray.8" lineClamp={1} style={{ maxWidth: '160px' }}>
                {currentSubSlideIndex > 0
                  ? `${lessonDetails?.title || ''} - ${getSlideLabel(activeSubSlides[currentSubSlideIndex - 1])}`
                  : prevLesson?.title || ''}
              </Text>
            </Box>
            <Text hiddenFrom="xs" size="xs" fw={700}>
              পূর্ববর্তী
            </Text>
          </Button>
        ) : (
          <Button
            variant="subtle"
            disabled
            leftSection={<IconChevronLeft size={18} />}
            justify="flex-start"
            style={{
              height: '100%',
              width: '100%',
              borderRadius: 0,
              paddingLeft: '20px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Text size="xs" fw={600}>শুরু</Text>
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
          borderLeft: '1px solid #e2e8f0',
          borderRight: '1px solid #e2e8f0',
          padding: '0 16px',
          backgroundColor: '#fafbfc',
        }}
      >
        <Text size="xs" fw={800} c="gray.9" lineClamp={1}>
          {lessonDetails ? lessonDetails.title : ''}
        </Text>
        <Text size="xs" c="dimmed" fw={600}>
          {totalSlidesCount > 0 && currentSlideProgressIndex >= 0
            ? `লেকচার ${currentSlideProgressIndex} / ${totalSlidesCount} (${progressPercent}%)`
            : '০%'}
        </Text>
      </Box>

      {/* Right Side: Next Slide Button */}
      <Box style={{ flex: 1, maxWidth: '240px', display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end' }}>
        {currentSubSlideIndex < activeSubSlides.length - 1 || currentLessonIndex < flatLessons.length - 1 ? (
          <Button
            variant="gradient"
            gradient={{ from: 'blue', to: 'violet' }}
            onClick={handleNext}
            rightSection={<IconChevronRight size={18} />}
            justify="flex-end"
            style={{
              height: '100%',
              width: '100%',
              borderRadius: 0,
              paddingRight: '20px',
              display: 'flex',
              alignItems: 'center',
              fontWeight: 700,
            }}
          >
            <Box ta="right" visibleFrom="xs">
              <Text size="xs" c="blue.1" style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: 700 }}>
                পরবর্তী
              </Text>
              <Text size="xs" fw={700} c="white" lineClamp={1} style={{ maxWidth: '160px' }}>
                {currentSubSlideIndex < activeSubSlides.length - 1
                  ? `${lessonDetails?.title || ''} - ${getSlideLabel(activeSubSlides[currentSubSlideIndex + 1])}`
                  : nextLesson?.title || ''}
              </Text>
            </Box>
            <Text hiddenFrom="xs" size="xs" fw={700}>
              পরবর্তী
            </Text>
          </Button>
        ) : (
          <Button
            variant="subtle"
            disabled
            rightSection={<IconChevronRight size={18} />}
            justify="flex-end"
            style={{
              height: '100%',
              width: '100%',
              borderRadius: 0,
              paddingRight: '20px',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Text size="xs" fw={600}>শেষ</Text>
          </Button>
        )}
      </Box>
    </Box>
  );
}
