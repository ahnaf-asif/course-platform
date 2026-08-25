'use client';

import {
  Title,
  Button,
  Group,
  Stack,
  LoadingOverlay,
  SimpleGrid,
  Alert,
  Anchor,
  Card,
  Text,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconAlertCircle } from '@tabler/icons-react';
import {
  useGetAdminCourses,
  usePostAdminCourses,
  usePatchAdminCoursesId,
  useDeleteAdminCoursesId,
} from '@/api/generated/admin-course/admin-course';
import { CreateCourseRequest } from '@/api/model/components-schemas-course/createCourseRequest';
import { CourseResponse } from '@/api/model/components-schemas-course/courseResponse';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useState } from 'react';
import { CourseCard } from './CourseCard';
import { CourseModal } from './CourseModal';

export default function CoursesManagement() {
  const queryClient = useQueryClient();
  const { data: courses, isPending, isError, refetch } = useGetAdminCourses();
  const { mutateAsync: createCourse, isPending: isCreating } = usePostAdminCourses();
  const { mutateAsync: updateCourse, isPending: isUpdating } = usePatchAdminCoursesId();
  const { mutateAsync: deleteCourse } = useDeleteAdminCoursesId();

  const [opened, { open, close }] = useDisclosure(false);
  const [editingCourse, setEditingCourse] = useState<CourseResponse | null>(null);

  const handleOpenModal = (course: CourseResponse | null = null) => {
    setEditingCourse(course);
    open();
  };

  const handleCreateOrUpdate = async (values: CreateCourseRequest & { slug?: string }) => {
    try {
      const payload: CreateCourseRequest = {
        title: values.title,
        description: values.description || '',
        slug: values.slug || undefined,
        thumbnail_url: values.thumbnail_url || undefined,
        is_published: values.is_published,
        price: values.price || undefined,
        currency: values.currency || undefined,
      };

      if (editingCourse) {
        await updateCourse({ id: editingCourse.id, data: payload });
        notifications.show({ title: 'Success', message: 'Course updated successfully', color: 'green' });
      } else {
        await createCourse({ data: payload });
        notifications.show({ title: 'Success', message: 'Course created successfully', color: 'green' });
      }
      close();
      refetch();
      queryClient.invalidateQueries({ queryKey: ['/admin/courses'] });
      queryClient.invalidateQueries({ queryKey: ['/courses'] });
      queryClient.invalidateQueries({ queryKey: ['/admin/dashboard'] });
    } catch (error) {
      let message = 'Failed to save course';
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || message;
      }
      notifications.show({ title: 'Error', message, color: 'red' });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this course? All subjects and lessons will be lost.')) {
      try {
        await deleteCourse({ id });
        notifications.show({
          title: 'Deleted',
          message: 'Course removed successfully',
          color: 'blue',
        });
        refetch();
        queryClient.invalidateQueries({ queryKey: ['courses'] });
        queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
        queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
      } catch (error) {
        let message = 'Failed to delete course';
        if (axios.isAxiosError(error)) {
          message = error.response?.data?.message || message;
        }
        notifications.show({
          title: 'Error',
          message,
          color: 'red',
        });
      }
    }
  };

  return (
    <Stack gap="lg" pos="relative">
      <LoadingOverlay
        visible={isPending}
        overlayProps={{ blur: 1 }}
        loaderProps={{ size: 'lg', type: 'bars' }}
        zIndex={1000}
      />

      <Group justify="space-between" align="center">
        <Title order={2}>Courses Management</Title>
        <Button leftSection={<IconPlus size={18} />} onClick={() => handleOpenModal()}>
          New Course
        </Button>
      </Group>

      {courses && courses.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onEditSettings={handleOpenModal}
              onDelete={handleDelete}
            />
          ))}
        </SimpleGrid>
      ) : isError ? (
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" variant="light">
          Failed to load courses. Please <Anchor fw={700} onClick={() => refetch()}>try again</Anchor> or refresh the page.
        </Alert>
      ) : !isPending ? (
        <Card withBorder padding="xl" radius="md" bg="gray.0">
          <Stack align="center" gap="xs">
            <Text fw={500}>No courses found</Text>
            <Text size="sm" c="dimmed">
              Create your first course to get started.
            </Text>
            <Button variant="outline" mt="sm" onClick={() => handleOpenModal()}>
              Create Course
            </Button>
          </Stack>
        </Card>
      ) : null}

      <CourseModal
        opened={opened}
        onClose={close}
        course={editingCourse}
        onSubmit={handleCreateOrUpdate}
        loading={isCreating || isUpdating}
      />
    </Stack>
  );
}

