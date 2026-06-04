'use client';

import {
  Title,
  SimpleGrid,
  Paper,
  Text,
  Group,
  Stack,
  ThemeIcon,
  Card,
  Button,
} from '@mantine/core';
import {
  IconBook,
  IconUsers,
  IconHelpCircle,
  IconShoppingCart,
  IconPlus,
} from '@tabler/icons-react';
import { useGetAdminCourses } from '@/api/generated/admin-course/admin-course';
import Link from 'next/link';

export default function AdminDashboard() {
  const { data: courses } = useGetAdminCourses();

  const stats = [
    { title: 'Total Courses', value: courses?.length || 0, icon: IconBook, color: 'blue' },
    { title: 'Total Users', value: '1,234', icon: IconUsers, color: 'green' },
    { title: 'Assessments', value: '42', icon: IconHelpCircle, color: 'orange' },
    { title: 'Revenue', value: '$12,450', icon: IconShoppingCart, color: 'indigo' },
  ];

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <Title order={2}>Admin Dashboard</Title>
        <Button
          component={Link}
          href="/admin/courses"
          leftSection={<IconPlus size={18} />}
        >
          New Course
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
        {stats.map((stat) => (
          <Paper key={stat.title} withBorder p="md" radius="md">
            <Group>
              <ThemeIcon
                size="xl"
                radius="md"
                variant="light"
                color={stat.color}
              >
                <stat.icon size={24} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">
                  {stat.title}
                </Text>
                <Text fw={700} size="xl">
                  {stat.value}
                </Text>
              </div>
            </Group>
          </Paper>
        ))}
      </SimpleGrid>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Card withBorder radius="md" p="xl">
          <Title order={4} mb="md">Quick Actions</Title>
          <SimpleGrid cols={2} spacing="sm">
            <Button variant="light" component={Link} href="/admin/courses" h={80}>
              <Stack gap={4} align="center">
                <IconBook size={20} />
                <Text size="xs">Manage Courses</Text>
              </Stack>
            </Button>
            <Button variant="light" color="orange" component={Link} href="/admin/quizzes" h={80}>
              <Stack gap={4} align="center">
                <IconHelpCircle size={20} />
                <Text size="xs">Assessments</Text>
              </Stack>
            </Button>
          </SimpleGrid>
        </Card>

        <Card withBorder radius="md" p="xl">
          <Title order={4} mb="md">Recent Courses</Title>
          <Stack gap="xs">
            {courses?.slice(0, 3).map((course) => (
              <Group key={course.id} justify="space-between">
                <Text size="sm" fw={500}>{course.title}</Text>
                <Button variant="subtle" size="compact-xs" component={Link} href={'/admin/courses/' + course.id + '/curriculum'}>
                  Edit
                </Button>
              </Group>
            ))}
            {(!courses || courses.length === 0) && (
              <Text size="sm" c="dimmed">No courses yet.</Text>
            )}
          </Stack>
        </Card>
      </SimpleGrid>
    </Stack>
  );
}
