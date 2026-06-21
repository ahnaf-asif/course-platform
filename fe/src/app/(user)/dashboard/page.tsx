'use client';

import { useState } from 'react';
import {
  Container,
  Title,
  Text,
  SimpleGrid,
  Card,
  Image,
  Badge,
  Button,
  Group,
  Stack,
  Skeleton,
  Tabs,
  ThemeIcon,
  Box,
  Divider,
} from '@mantine/core';
import { useGetEnrolledCourses } from '@/api/generated/commerce/commerce';
import { useListPublishedCourses } from '@/api/generated/course/course';
import { IconBooks, IconCompass, IconBook, IconCalendar } from '@tabler/icons-react';
import Link from 'next/link';

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState<string | null>('my-courses');

  // Query enrolled courses
  const { data: enrolledCourses, isLoading: isLoadingEnrolled } = useGetEnrolledCourses();
  
  // Query all published courses
  const { data: allCourses, isLoading: isLoadingAll } = useListPublishedCourses();

  // Helper to check if user is enrolled in a course
  const isEnrolled = (courseId: string) => {
    return enrolledCourses?.some((c) => c.id === courseId) ?? false;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Container size="lg" py="xl">
      {/* Header Section */}
      <Box mb="xl" style={{ position: 'relative' }}>
        <Title order={1} mb="xs" style={{ fontFamily: 'Outfit, Inter, sans-serif', fontWeight: 800 }}>
          My Learning Center
        </Title>
        <Text c="dimmed" size="lg">
          Track your progress, access your courses, and discover new skills.
        </Text>
      </Box>

      {/* Tabs Menu */}
      <Tabs value={activeTab} onChange={setActiveTab} variant="outline" radius="md">
        <Tabs.List mb="xl">
          <Tabs.Tab 
            value="my-courses" 
            leftSection={<IconBooks size={16} />}
            style={{ fontWeight: 600, padding: '12px 20px' }}
          >
            My Courses
          </Tabs.Tab>
          <Tabs.Tab 
            value="discover" 
            leftSection={<IconCompass size={16} />}
            style={{ fontWeight: 600, padding: '12px 20px' }}
          >
            Discover Courses
          </Tabs.Tab>
        </Tabs.List>

        {/* Tab 1: My Courses */}
        <Tabs.Panel value="my-courses">
          {isLoadingEnrolled ? (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} p="md" radius="md" withBorder>
                  <Skeleton height={160} radius="md" mb="md" />
                  <Skeleton height={20} radius="sm" width="70%" mb="xs" />
                  <Skeleton height={14} radius="sm" width="90%" mb="md" />
                  <Skeleton height={36} radius="sm" />
                </Card>
              ))}
            </SimpleGrid>
          ) : !enrolledCourses || enrolledCourses.length === 0 ? (
            <Card 
              p="xl" 
              radius="md" 
              withBorder 
              style={{ 
                textAlign: 'center', 
                backgroundColor: 'var(--mantine-color-gray-0)',
                borderStyle: 'dashed',
                borderWidth: '2px'
              }}
            >
              <Stack align="center" gap="md" py="xl">
                <ThemeIcon size={60} radius="xl" color="blue" variant="light">
                  <IconBook size={30} />
                </ThemeIcon>
                <Title order={3}>No Enrolled Courses</Title>
                <Text c="dimmed" maw={460} mx="auto" size="sm">
                  You haven&apos;t enrolled in any courses yet. Explore our catalog of professional courses to start your learning journey.
                </Text>
                <Button onClick={() => setActiveTab('discover')} variant="light" size="md" radius="md" mt="xs">
                  Browse Catalog
                </Button>
              </Stack>
            </Card>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
              {enrolledCourses.map((course) => (
                <Card 
                  key={course.id} 
                  p="md" 
                  radius="md" 
                  withBorder 
                  shadow="sm"
                  style={{
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      boxShadow: 'var(--mantine-shadow-md)',
                    }
                  }}
                  component={Link}
                  href={`/courses/s/${course.slug}/learn`}
                >
                  <Card.Section>
                    <Image
                      src={course.thumbnail_url || 'https://placehold.co/600x400?text=Course+Thumbnail'}
                      height={160}
                      alt={course.title}
                    />
                  </Card.Section>

                  <Stack gap="xs" mt="md" style={{ flex: 1 }}>
                    <Title order={4} lineClamp={1}>
                      {course.title}
                    </Title>
                    <Text size="sm" c="dimmed" lineClamp={2} style={{ minHeight: 40 }}>
                      {course.description}
                    </Text>

                    <Divider my="xs" />

                    <Group gap="xs" style={{ marginTop: 'auto' }}>
                      <IconCalendar size={14} color="var(--mantine-color-dimmed)" />
                      <Text size="xs" c="dimmed">
                        Enrolled on {formatDate(course.enrolled_at)}
                      </Text>
                    </Group>

                    <Button 
                      color="green" 
                      fullWidth 
                      mt="md" 
                      radius="md"
                      leftSection={<IconBook size={16} />}
                    >
                      Resume Learning
                    </Button>
                  </Stack>
                </Card>
              ))}
            </SimpleGrid>
          )}
        </Tabs.Panel>

        {/* Tab 2: Discover Courses */}
        <Tabs.Panel value="discover">
          {isLoadingAll ? (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} p="md" radius="md" withBorder>
                  <Skeleton height={160} radius="md" mb="md" />
                  <Skeleton height={20} radius="sm" width="70%" mb="xs" />
                  <Skeleton height={14} radius="sm" width="90%" mb="md" />
                  <Skeleton height={36} radius="sm" />
                </Card>
              ))}
            </SimpleGrid>
          ) : !allCourses || allCourses.length === 0 ? (
            <Card p="xl" radius="md" withBorder style={{ textAlign: 'center' }}>
              <Text c="dimmed">No courses are currently available for enrollment.</Text>
            </Card>
          ) : (
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
              {allCourses.map((course) => {
                const enrolled = isEnrolled(course.id);
                const isPaid = course.price && course.price !== '0.00';

                return (
                  <Card 
                    key={course.id} 
                    p="md" 
                    radius="md" 
                    withBorder 
                    shadow="sm"
                    style={{
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: 'var(--mantine-shadow-md)',
                      }
                    }}
                  >
                    <Card.Section style={{ position: 'relative' }}>
                      <Image
                        src={course.thumbnail_url || 'https://placehold.co/600x400?text=Course+Thumbnail'}
                        height={160}
                        alt={course.title}
                      />
                      <Box style={{ position: 'absolute', top: 12, right: 12 }}>
                        {enrolled ? (
                          <Badge color="green" size="md" variant="filled">Enrolled</Badge>
                        ) : isPaid ? (
                          <Badge color="blue" size="md" variant="filled">
                            {course.price} {course.currency || 'BDT'}
                          </Badge>
                        ) : (
                          <Badge color="teal" size="md" variant="filled">FREE</Badge>
                        )}
                      </Box>
                    </Card.Section>

                    <Stack gap="xs" mt="md" style={{ flex: 1 }}>
                      <Title order={4} lineClamp={1}>
                        {course.title}
                      </Title>
                      <Text size="sm" c="dimmed" lineClamp={2} style={{ minHeight: 40 }}>
                        {course.description}
                      </Text>

                      <Button 
                        component={Link}
                        href={enrolled ? `/courses/s/${course.slug}/learn` : `/courses/s/${course.slug}`}
                        variant={enrolled ? 'outline' : 'filled'}
                        color={enrolled ? 'green' : 'blue'}
                        fullWidth 
                        mt="auto" 
                        radius="md"
                      >
                        {enrolled ? 'Go to Course' : 'View Course'}
                      </Button>
                    </Stack>
                  </Card>
                );
              })}
            </SimpleGrid>
          )}
        </Tabs.Panel>
      </Tabs>
    </Container>
  );
}
