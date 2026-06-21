/* eslint-disable react-hooks/set-state-in-effect */
'use client';

import { useParams, useRouter } from 'next/navigation';
import {
  Container,
  Grid,
  Title,
  Text,
  Stack,
  Group,
  Card,
  Skeleton,
  Button,
  Box,
  Divider,
  NavLink,
  Alert,
  Loader,
  Center,
  Drawer,
  ScrollArea,
  Progress,
} from '@mantine/core';
import { useGetCourseBySlug, useGetCourseTreeBySlug } from '@/api/generated/course/course';
import { useCheckAccess, useGetUserLesson } from '@/api/generated/commerce/commerce';
import { useGetMe } from '@/api/generated/user/user';
import {
  IconArrowLeft,
  IconAlertCircle,
  IconVideo,
  IconFileText,
  IconChevronRight,
  IconChevronLeft,
  IconMenu2,
  IconBook,
  IconCheck,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useEffect, useMemo, useState, useRef } from 'react';
import Hls from 'hls.js';
import { CourseTreeResponse } from '@/api/model/components-schemas-curriculum/courseTreeResponse';
import { axiosInstance } from '@/lib/axios';
import { MathJaxContent } from '@/components/MathJaxContent';

interface ExtendedNode extends CourseTreeResponse {
  children: ExtendedNode[];
}

function LessonPlayer({ videoId }: { videoId: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let hls: Hls | null = null;
    setLoading(true);
    setError(null);

    const initPlayer = async () => {
      if (!videoRef.current) return;

      try {
        const res = await axiosInstance<{ token: string }>({
          url: `/media/token/${videoId}`,
          method: 'GET',
        });

        const token = res.token;
        const manifestUrl = `/media-api/stream/${videoId}/index.m3u8?token=${token}`;

        if (Hls.isSupported()) {
          hls = new Hls({
            xhrSetup: (xhr) => {
              xhr.withCredentials = true;
            }
          });
          hls.loadSource(manifestUrl);
          hls.attachMedia(videoRef.current);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setLoading(false);
          });
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              setError("Failed to load video stream");
            }
          });
        } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = manifestUrl;
          videoRef.current.addEventListener('loadedmetadata', () => {
            setLoading(false);
          });
          videoRef.current.addEventListener('error', () => {
            setError("Failed to load video stream");
          });
        } else {
          setError("Your browser does not support HLS streaming");
        }
      } catch (err) {
        console.error('Failed to init video:', err);
        setError("Could not acquire secure playback token");
      }
    };

    initPlayer();

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [videoId]);

  if (error) {
    return (
      <Center w="100%" h="100%" bg="dark.9" p="md">
        <Text c="red" size="sm" ta="center">
          {error}
        </Text>
      </Center>
    );
  }

  return (
    <Box pos="relative" w="100%" h="100%" style={{ backgroundColor: 'black', overflow: 'hidden' }}>
      {loading && (
        <Center pos="absolute" inset={0} bg="dark.9" style={{ zIndex: 1 }}>
          <Loader size="md" color="blue" />
        </Center>
      )}
      <video 
        ref={videoRef} 
        controls 
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
      />
    </Box>
  );
}

function parseHTMLContent(content: string): string {
  if (typeof window === 'undefined') return content;
  if (content.includes('&lt;') || content.includes('&gt;') || content.includes('&quot;') || content.includes('&#39;')) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    return doc.documentElement.textContent || content;
  }
  return content;
}

export default function CoursePlayerPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const { data: user, isLoading: isLoadingUser } = useGetMe();
  const { data: course, isLoading: isLoadingCourse } = useGetCourseBySlug(slug);
  const { data: accessData, isLoading: isLoadingAccess } = useCheckAccess(slug, {
    query: {
      enabled: !!user && !!course?.id,
    }
  });

  const { data: tree, isLoading: isLoadingTree } = useGetCourseTreeBySlug(slug, {
    query: {
      enabled: !!course?.slug
    }
  });

  const organizedTree = useMemo(() => {
    if (!tree) return [];
    const map: Record<string, ExtendedNode> = {};
    const roots: ExtendedNode[] = [];
    tree.forEach((node) => { map[node.id] = { ...node, children: [] }; });
    tree.forEach((node) => {
      const mappedNode = map[node.id];
      if (node.level === 1) roots.push(mappedNode);
      if (node.parent_id && map[node.parent_id]) map[node.parent_id].children.push(mappedNode);
    });
    return roots.sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0));
  }, [tree]);

  // Flatten lessons into slides. If a lesson has both video and text content, it creates two slides!
  const flatSlides = useMemo(() => {
    const list: {
      id: string;
      title: string;
      type: 'video' | 'text';
      video_url?: string | null;
      text_content?: string | null;
    }[] = [];

    const traverse = (nodes: ExtendedNode[]) => {
      const sorted = [...nodes].sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0));
      for (const node of sorted) {
        if (node.node_type === 'LESSON') {
          const hasVideo = !!node.video_url;
          const hasText = !!node.text_content;

          if (hasVideo && hasText) {
            list.push({
              id: node.id,
              title: `${node.title} - Video`,
              type: 'video',
              video_url: node.video_url,
              text_content: node.text_content,
            });
            list.push({
              id: node.id,
              title: `${node.title} - Reading`,
              type: 'text',
              video_url: node.video_url,
              text_content: node.text_content,
            });
          } else if (hasVideo) {
            list.push({
              id: node.id,
              title: node.title,
              type: 'video',
              video_url: node.video_url,
              text_content: node.text_content,
            });
          } else {
            list.push({
              id: node.id,
              title: node.title,
              type: 'text',
              video_url: node.video_url,
              text_content: node.text_content,
            });
          }
        }
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      }
    };
    traverse(organizedTree);
    return list;
  }, [organizedTree]);

  const activeSlide = useMemo(() => {
    return flatSlides[currentSlideIndex] || null;
  }, [flatSlides, currentSlideIndex]);

  const selectedLessonId = activeSlide?.id || null;

  // Fetch full lesson details when selected
  const { data: lessonDetails, isLoading: isLoadingLesson } = useGetUserLesson(selectedLessonId || '', {
    query: {
      enabled: !!selectedLessonId,
    }
  });

  const prevSlide = currentSlideIndex > 0 ? flatSlides[currentSlideIndex - 1] : null;
  const nextSlide = currentSlideIndex < flatSlides.length - 1 ? flatSlides[currentSlideIndex + 1] : null;

  const handlePrev = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentSlideIndex < flatSlides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  const handleSelectLesson = (lessonId: string) => {
    const idx = flatSlides.findIndex((s) => s.id === lessonId);
    if (idx !== -1) {
      setCurrentSlideIndex(idx);
    }
  };

  // Redirect if no access
  useEffect(() => {
    if (!isLoadingAccess && accessData && !accessData.has_access) {
      router.push(`/courses/s/${slug}`);
    }
  }, [isLoadingAccess, accessData, slug, router]);

  const isVideoSlide = activeSlide?.type === 'video';

  const renderSyllabusContent = () => (
    <Stack gap="md">
      {organizedTree.map((subject) => (
        <Box key={subject.id}>
          <Text size="xs" fw={700} c="blue.6" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }} mb={8}>
            {subject.title}
          </Text>
          <Stack gap="xs">
            {subject.children.map((chapter) => (
              <Box key={chapter.id}>
                <Text size="xs" fw={600} c="dimmed" mb={6}>
                  {chapter.title}
                </Text>
                <div style={{ borderLeft: '1px solid var(--mantine-color-default-border)', paddingLeft: '8px', marginLeft: '4px' }}>
                  <Stack gap={4}>
                    {chapter.children.map((lesson) => {
                      const isActive = selectedLessonId === lesson.id;
                      return (
                        <NavLink
                          key={lesson.id}
                          active={isActive}
                          label={lesson.title}
                          leftSection={lesson.video_url ? <IconVideo size={14} /> : <IconFileText size={14} />}
                          rightSection={isActive ? <IconChevronRight size={12} /> : null}
                          onClick={() => {
                            handleSelectLesson(lesson.id);
                            setMobileSidebarOpen(false);
                          }}
                          styles={{
                            root: {
                              borderRadius: '6px',
                              padding: '8px 10px',
                              fontSize: '13px',
                              transition: 'all 0.2s ease',
                              backgroundColor: isActive ? 'var(--mantine-color-blue-light)' : 'transparent',
                              color: isActive ? 'var(--mantine-color-blue-filled)' : 'inherit',
                              fontWeight: isActive ? 600 : 400,
                            },
                            label: {
                              whiteSpace: 'normal',
                              wordBreak: 'break-word',
                            }
                          }}
                        />
                      );
                    })}
                  </Stack>
                </div>
              </Box>
            ))}
          </Stack>
          <Divider my="sm" />
        </Box>
      ))}
    </Stack>
  );

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
    <Box style={{
      display: 'flex',
      height: 'calc(100vh - 60px)',
      margin: 'calc(-1 * var(--mantine-spacing-md))',
      overflow: 'hidden',
      backgroundColor: 'var(--mantine-color-body)',
    }}>
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
          <Stack gap="xs">
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
            
            <Group justify="space-between" align="center" mt="xs">
              <Title order={4} size="h5" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IconBook size={18} color="var(--mantine-color-blue-filled)" />
                Syllabus
              </Title>
              <Text size="xs" c="dimmed" fw={500}>
                {currentSlideIndex >= 0 ? `${currentSlideIndex + 1} / ${flatSlides.length}` : `0 / ${flatSlides.length}`}
              </Text>
            </Group>

            {/* Course Title */}
            <Text size="sm" fw={600} lineClamp={1}>
              {course?.title}
            </Text>

            {/* Progress Bar */}
            <Progress
              value={flatSlides.length > 0 ? ((currentSlideIndex + 1) / flatSlides.length) * 100 : 0}
              size="xs"
              radius="xl"
              color="blue"
              animated
            />
          </Stack>
        </Box>

        <ScrollArea style={{ flex: 1 }} p="md">
          {renderSyllabusContent()}
        </ScrollArea>
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
                Curriculum
              </Title>
              <Button variant="subtle" color="gray" size="xs" onClick={() => setMobileSidebarOpen(false)}>
                Close
              </Button>
            </Group>
            
            <Group justify="space-between" mb={6}>
              <Text size="xs" fw={500} c="dimmed">
                Course Progress
              </Text>
              <Text size="xs" c="dimmed" fw={500}>
                {currentSlideIndex >= 0 ? `${currentSlideIndex + 1} / ${flatSlides.length}` : `0 / ${flatSlides.length}`}
              </Text>
            </Group>
            <Progress
              value={flatSlides.length > 0 ? ((currentSlideIndex + 1) / flatSlides.length) * 100 : 0}
              size="xs"
              radius="xl"
              color="blue"
              animated
            />
          </Box>

          <ScrollArea style={{ flex: 1 }} p="md">
            {renderSyllabusContent()}
          </ScrollArea>
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
            <Group gap="xs">
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
            </Group>
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
        <Box style={{
          flex: 1,
          overflowY: isVideoSlide ? 'hidden' : 'auto',
          backgroundColor: isVideoSlide ? '#000' : 'var(--mantine-color-body)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
        }}>
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
                    <LessonPlayer videoId={lessonDetails.video_url} />
                  ) : (
                    <Center h="100%" bg="dark.9">
                      <Text c="white">No video file available for streaming.</Text>
                    </Center>
                  )}
                </Box>
              ) : (
                /* Premium MathJax Text/Reading content slide */
                <Box style={{ padding: '32px 16px 40px 16px', width: '100%' }}>
                  <Container size="md" style={{ maxWidth: '840px', width: '100%' }}>
                    <Stack gap="xl">
                      <Box>
                        <Text size="xs" fw={700} c="blue.6" style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
                          Reading Material
                        </Text>
                        <Title order={1} size="h2" mt={4} style={{ fontWeight: 800 }}>
                          {lessonDetails.title}
                        </Title>
                      </Box>
                      
                      <Divider />

                      <Box style={{ minHeight: '250px' }}>
                        {lessonDetails.text_content ? (
                          <MathJaxContent html={parseHTMLContent(lessonDetails.text_content)} />
                        ) : (
                          <Text c="dimmed" style={{ fontStyle: 'italic' }}>No written content for this lesson.</Text>
                        )}
                      </Box>
                    </Stack>
                  </Container>
                </Box>
              )
            ) : (
              <Center style={{ flex: 1 }} p="xl">
                <Alert title="Error" color="red" icon={<IconAlertCircle size={16} />}>
                  Failed to load lesson details. Please select another item from the syllabus.
                </Alert>
              </Center>
            )
          ) : (
            <Center style={{ flex: 1 }} p="xl">
              <Card withBorder radius="lg" p="xl" ta="center" shadow="sm" style={{ maxWidth: '400px' }}>
                <Stack align="center" gap="md">
                  <IconBook size={48} color="var(--mantine-color-blue-filled)" />
                  <Text fw={600} size="lg">Ready to start learning?</Text>
                  <Text c="dimmed">Select a lesson from the syllabus sidebar to begin.</Text>
                </Stack>
              </Card>
            </Center>
          )}
        </Box>

        {/* Attached & Immovable Bottom Footer Navigation Bar */}
        <Box
          style={{
            borderTop: '1px solid var(--mantine-color-default-border)',
            backgroundColor: 'var(--mantine-color-default)',
            padding: '12px 16px',
            zIndex: 10,
            flexShrink: 0,
          }}
        >
          <Group justify="space-between" align="center" gap="xs">
            {/* Left Side: Previous Slide Button */}
            <Box style={{ flex: 1 }}>
              {prevSlide ? (
                <Button
                  variant="light"
                  onClick={handlePrev}
                  leftSection={<IconChevronLeft size={16} />}
                  size="sm"
                  styles={{
                    root: {
                      transition: 'transform 0.2s ease',
                      '&:hover': {
                        transform: 'translateX(-4px)',
                      }
                    }
                  }}
                >
                  <Box ta="left" visibleFrom="xs">
                    <Text size="xs" c="dimmed" style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: 700 }}>
                      Previous
                    </Text>
                    <Text size="sm" fw={600} lineClamp={1} style={{ maxWidth: '150px' }}>
                      {prevSlide.title}
                    </Text>
                  </Box>
                  <Text hiddenFrom="xs" size="sm">Prev</Text>
                </Button>
              ) : (
                <Button variant="light" disabled size="sm" leftSection={<IconChevronLeft size={16} />}>
                  <Text size="sm">Start</Text>
                </Button>
              )}
            </Box>

            {/* Center: Slide Count and Info */}
            <Box style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flex: 1, maxWidth: '320px' }}>
              <Text size="sm" fw={700} lineClamp={1}>
                {lessonDetails ? lessonDetails.title : (activeSlide?.title || '')}
              </Text>
              <Text size="xs" c="dimmed">
                {flatSlides.length > 0 && currentSlideIndex >= 0 
                  ? `Slide ${currentSlideIndex + 1} of ${flatSlides.length} (${Math.round(((currentSlideIndex + 1) / flatSlides.length) * 100)}%)` 
                  : '0%'}
              </Text>
            </Box>

            {/* Right Side: Next Slide Button */}
            <Box style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
              {nextSlide ? (
                <Button
                  variant="filled"
                  onClick={handleNext}
                  rightSection={<IconChevronRight size={16} />}
                  size="sm"
                  styles={{
                    root: {
                      transition: 'transform 0.2s ease',
                      '&:hover': {
                        transform: 'translateX(4px)',
                      }
                    }
                  }}
                >
                  <Box ta="right" visibleFrom="xs">
                    <Text size="xs" style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
                      Next
                    </Text>
                    <Text size="sm" fw={600} lineClamp={1} style={{ maxWidth: '150px' }}>
                      {nextSlide.title}
                    </Text>
                  </Box>
                  <Text hiddenFrom="xs" size="sm">Next</Text>
                </Button>
              ) : (
                <Button
                  variant="filled"
                  color="green"
                  component={Link}
                  href={`/courses/s/${slug}`}
                  rightSection={<IconCheck size={16} />}
                  size="sm"
                >
                  <Box ta="right" visibleFrom="xs">
                    <Text size="xs" style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>
                      Course
                    </Text>
                    <Text size="sm" fw={600}>
                      Finish
                    </Text>
                  </Box>
                  <Text hiddenFrom="xs" size="sm">Finish</Text>
                </Button>
              )}
            </Box>
          </Group>
        </Box>
      </Box>
    </Box>
  );
}
