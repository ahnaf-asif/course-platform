'use client';

import { useParams } from 'next/navigation';
import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  Badge,
  Card,
  Image,
  Skeleton,
  Button,
  Box,
  Divider,
} from '@mantine/core';
import { useGetCourseBySlug, useGetCourseTreeBySlug } from '@/api/generated/course/course';
import { IconClock, IconUsers, IconCertificate, IconArrowLeft, IconBooks, IconFolder, IconFileText } from '@tabler/icons-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { CourseTreeResponse } from '@/api/model/components-schemas-curriculum/courseTreeResponse';

interface ExtendedNode extends CourseTreeResponse {
  children: ExtendedNode[];
}

export default function PublicCoursePage() {
  const params = useParams();
  const slug = params.slug as string;

  const { data: course, isLoading: isLoadingCourse, isError: isCourseError } = useGetCourseBySlug(slug);
  
  // Only fetch tree if course is loaded
  const { data: tree } = useGetCourseTreeBySlug(slug, {
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

  if (isLoadingCourse) {
    return (
      <Container size="lg" py="xl">
        <Stack gap="xl">
          <Skeleton height={300} radius="md" />
          <Skeleton height={40} width="60%" />
          <Skeleton height={20} mt="md" />
          <Skeleton height={20} />
          <Skeleton height={20} width="80%" />
        </Stack>
      </Container>
    );
  }

  if (isCourseError || !course) {
    return (
      <Container size="lg" py="xl">
        <Stack align="center" py={100}>
          <Title order={2}>Course not found</Title>
          <Text c="dimmed">The course you are looking for might have been removed or renamed.</Text>
          <Button component={Link} href="/" variant="light" leftSection={<IconArrowLeft size={16} />}>
            Back to Home
          </Button>
        </Stack>
      </Container>
    );
  }

  return (
    <Container size="lg" py="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start">
          <Stack gap="xs" style={{ flex: 1 }}>
            <Title order={1}>{course.title}</Title>
            <Text size="lg" c="dimmed">{course.description}</Text>
            
            <Group gap="lg" mt="md">
              <Group gap={5}>
                <IconUsers size={18} color="var(--mantine-color-blue-6)" />
                <Text size="sm">2.5k Students</Text>
              </Group>
              <Group gap={5}>
                <IconClock size={18} color="var(--mantine-color-orange-6)" />
                <Text size="sm">12 Hours of content</Text>
              </Group>
              <Group gap={5}>
                <IconCertificate size={18} color="var(--mantine-color-teal-6)" />
                <Text size="sm">Certificate of completion</Text>
              </Group>
            </Group>

            <Button size="lg" mt="xl" radius="md" style={{ width: 'fit-content' }}>
              Enroll in Course
            </Button>
          </Stack>

          <Card shadow="md" p={0} radius="md" style={{ width: 400 }} visibleFrom="md">
            <Image
              src={course.thumbnail_url || 'https://placehold.co/600x400?text=No+Thumbnail'}
              alt={course.title}
              height={220}
            />
          </Card>
        </Group>

        <Divider my="xl" label="Course Curriculum" labelPosition="center" />

        <Stack gap="md">
          {organizedTree.map((subject) => (
            <Card key={subject.id} withBorder radius="md" p="md" shadow="xs">
              <Group justify="space-between" mb="md">
                <Group gap="xs">
                  <IconBooks size={22} color="var(--mantine-color-blue-6)" />
                  <Text fw={700} size="lg">{subject.title}</Text>
                </Group>
                <Badge variant="light" color="blue">{subject.children.length} Chapters</Badge>
              </Group>
              
              <Stack gap="sm">
                {subject.children.map((chapter: ExtendedNode) => (
                  <Box key={chapter.id} pl="md" style={{ borderLeft: '2px solid var(--mantine-color-gray-1)' }}>
                    <Group gap="xs" py={4}>
                      <IconFolder size={16} color="var(--mantine-color-orange-6)" />
                      <Text size="sm" fw={600}>{chapter.title}</Text>
                      <Badge size="xs" variant="outline" color="gray">{chapter.children.length} Lessons</Badge>
                    </Group>
                    
                    <Stack gap={2} pl="lg" mt={5}>
                      {chapter.children.map((lesson: ExtendedNode) => (
                        <Group key={lesson.id} gap="xs" py={4}>
                          <IconFileText size={14} color="var(--mantine-color-teal-6)" />
                          <Text size="xs" fw={500}>{lesson.title}</Text>
                          {lesson.has_quizzes && (
                            <Badge size="xs" color="grape" variant="dot">Quiz</Badge>
                          )}
                        </Group>
                      ))}
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </Card>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}
