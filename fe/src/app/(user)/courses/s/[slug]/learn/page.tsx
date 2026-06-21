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
} from '@mantine/core';
import { useGetCourseBySlug, useGetCourseTreeBySlug } from '@/api/generated/course/course';
import { useCheckAccess, useGetUserLesson } from '@/api/generated/commerce/commerce';
import { useGetMe } from '@/api/generated/user/user';
import { IconArrowLeft, IconAlertCircle, IconVideo, IconFileText, IconChevronRight } from '@tabler/icons-react';
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
      <Center h={350} bg="dark.8" style={{ borderRadius: '8px' }}>
        <Text c="red" size="sm">
          {error}
        </Text>
      </Center>
    );
  }

  return (
    <Box pos="relative" w="100%" style={{ aspectRatio: '16/9', backgroundColor: 'black', borderRadius: '8px', overflow: 'hidden' }}>
      {loading && (
        <Center pos="absolute" inset={0} bg="dark.8" style={{ zIndex: 1 }}>
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

  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);

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

  // Fetch full lesson details when selected
  const { data: lessonDetails, isLoading: isLoadingLesson } = useGetUserLesson(selectedLessonId || '', {
    query: {
      enabled: !!selectedLessonId,
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

  // Set default selected lesson
  useEffect(() => {
    if (organizedTree.length > 0 && !selectedLessonId) {
      // Find the first lesson in the tree
      for (const subject of organizedTree) {
        for (const chapter of subject.children) {
          if (chapter.children.length > 0) {
            const firstLessonId = chapter.children[0].id;
            setTimeout(() => {
              setSelectedLessonId(firstLessonId);
            }, 0);
            return;
          }
        }
      }
    }
  }, [organizedTree, selectedLessonId]);

  // Redirect if no access
  useEffect(() => {
    if (!isLoadingAccess && accessData && !accessData.has_access) {
      router.push(`/courses/s/${slug}`);
    }
  }, [isLoadingAccess, accessData, slug, router]);

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

  if (!accessData?.has_access) {
    return (
      <Container size="sm" py={100}>
        <Alert icon={<IconAlertCircle size={16} />} title="Access Denied" color="red">
          You must purchase this course to access the content. Redirecting...
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="lg">
        <Group>
          <Button component={Link} href={`/courses/s/${slug}`} variant="subtle" leftSection={<IconArrowLeft size={16} />}>
            Back to Course Landing Page
          </Button>
        </Group>

        <Grid gap="xl">
          {/* Main Content Pane */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap="lg">
              {selectedLessonId ? (
                isLoadingLesson ? (
                  <Stack gap="md">
                    <Skeleton height={350} radius="md" />
                    <Skeleton height={30} width="70%" />
                    <Skeleton height={100} />
                  </Stack>
                ) : lessonDetails ? (
                  <Stack gap="md">
                     {lessonDetails.video_url ? (
                      <Card p={0} radius="md" withBorder style={{ overflow: 'hidden' }}>
                        <LessonPlayer videoId={lessonDetails.video_url} />
                      </Card>
                    ) : (
                      <Card withBorder radius="md" p="xl" bg="var(--mantine-color-blue-0)">
                        <Group justify="center" gap="xs">
                          <IconFileText size={40} color="var(--mantine-color-blue-6)" />
                          <Text fw={500}>Text-only Lesson</Text>
                        </Group>
                      </Card>
                    )}

                    <Title order={2}>{lessonDetails.title}</Title>
                    <Divider />
                     {lessonDetails.text_content ? (
                      <MathJaxContent html={parseHTMLContent(lessonDetails.text_content)} />
                    ) : (
                      <Text c="dimmed">No written content for this lesson.</Text>
                    )}
                  </Stack>
                ) : (
                  <Alert title="Error" color="red">
                    Failed to load lesson details.
                  </Alert>
                )
              ) : (
                <Card withBorder radius="md" p="xl">
                  <Text c="dimmed" ta="center">Select a lesson from the sidebar to start learning.</Text>
                </Card>
              )}
            </Stack>
          </Grid.Col>

          {/* Navigation Sidebar */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Card withBorder radius="md" p="md">
              <Title order={3} mb="md">Syllabus</Title>
              <Divider mb="md" />
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                <Stack gap="xs">
                  {organizedTree.map((subject) => (
                    <Box key={subject.id}>
                      <Text size="sm" fw={700} c="dimmed" mb={5}>
                        {subject.title}
                      </Text>
                      <Stack gap={5} pl="xs">
                        {subject.children.map((chapter) => (
                          <Box key={chapter.id}>
                            <Text size="xs" fw={600} mb={3}>
                              {chapter.title}
                            </Text>
                            <div style={{ borderLeft: '1px solid var(--mantine-color-gray-3)', paddingLeft: '8px' }}>
                              {chapter.children.map((lesson) => (
                                <NavLink
                                  key={lesson.id}
                                  active={selectedLessonId === lesson.id}
                                  label={lesson.title}
                                  leftSection={lesson.video_url ? <IconVideo size={14} /> : <IconFileText size={14} />}
                                  rightSection={<IconChevronRight size={12} />}
                                  onClick={() => setSelectedLessonId(lesson.id)}
                                  styles={{
                                    root: {
                                      borderRadius: '4px',
                                      padding: '6px 8px',
                                      fontSize: '12px',
                                    }
                                  }}
                                />
                              ))}
                            </div>
                          </Box>
                        ))}
                      </Stack>
                      <Divider my="sm" />
                    </Box>
                  ))}
                </Stack>
              </div>
            </Card>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}
