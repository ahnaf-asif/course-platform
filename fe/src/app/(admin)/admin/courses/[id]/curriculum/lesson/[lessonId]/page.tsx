'use client';

import {
  Title,
  Text,
  Stack,
  Group,
  Button,
  TextInput,
  LoadingOverlay,
  Breadcrumbs,
  Anchor,
  Paper,
  Divider,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconDeviceFloppy,
  IconArrowLeft,
} from '@tabler/icons-react';
import {
  useGetAdminLessonsId,
  usePatchAdminLessonsId,
} from '@/api/generated/admin-curriculum/admin-curriculum';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import VideoUpload from './_components/VideoUpload';

const RichTextEditor = dynamic(() => import('@/components/Editor/RichTextEditor'), {
  ssr: false,
  loading: () => <LoadingOverlay visible loaderProps={{ type: 'bars' }} />,
});

export default function LessonEditPage() {
  const params = useParams();
  const router = useRouter();
  const courseSlug = params.id as string;
  const lessonId = params.lessonId as string;

  const { data: lesson, isLoading: loadingLesson, refetch } = useGetAdminLessonsId(lessonId);
  const { mutateAsync: updateLesson, isPending: isUpdating } = usePatchAdminLessonsId();

  const form = useForm({
    initialValues: {
      title: '',
      video_url: '',
      text_content: '',
    },
    validate: {
      title: (value) => (value.length < 3 ? 'Title must be at least 3 characters' : null),
    },
  });

  useEffect(() => {
    if (lesson) {
      form.setValues({
        title: lesson.title,
        video_url: lesson.video_url || '',
        text_content: lesson.text_content || '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson]);

  const handleSubmit = async (values: typeof form.values) => {
    try {
      await updateLesson({
        id: lessonId,
        data: {
          title: values.title,
          video_url: values.video_url || undefined,
          text_content: values.text_content || undefined
        }
      });

      notifications.show({
        title: 'Success',
        message: 'Lesson updated successfully',
        color: 'green',
      });
      refetch();
    } catch (error) {
      let message = 'Failed to update lesson';
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || message;
      }
      notifications.show({ title: 'Error', message, color: 'red' });
    }
  };

  if (!loadingLesson && !lesson) {
    return (
      <Stack align="center" mt={50}>
        <Text>Lesson not found</Text>
        <Button component={Link} href={`/admin/courses/${courseSlug}/curriculum`}>
          Back to Curriculum
        </Button>
      </Stack>
    );
  }

  return (
    <Stack gap="lg" pos="relative" pb={50}>
      <LoadingOverlay visible={loadingLesson} overlayProps={{ blur: 1 }} />

      <Group justify="space-between">
        <Stack gap={5}>
          <Breadcrumbs>
            <Anchor component={Link} href="/admin/courses" size="sm">
              Courses
            </Anchor>
            <Anchor component={Link} href={`/admin/courses/${courseSlug}/curriculum`} size="sm">
              Curriculum
            </Anchor>
            <Text color="dimmed" size="sm">Edit Lesson</Text>
          </Breadcrumbs>
          <Title order={2}>Edit Lesson: {lesson?.title}</Title>
        </Stack>
        <Button
          variant="light"
          leftSection={<IconArrowLeft size={18} />}
          component={Link}
          href={`/admin/courses/${courseSlug}/curriculum`}
        >
          Back to Curriculum
        </Button>
      </Group>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="xl">
          <Paper withBorder p="xl" radius="md">
            <Stack gap="md">
              <TextInput
                label="Lesson Title"
                placeholder="e.g. Introduction to React Hooks"
                required
                size="md"
                {...form.getInputProps('title')}
              />

              <VideoUpload 
                value={form.values.video_url} 
                onChange={(val) => form.setFieldValue('video_url', val)} 
              />

              <Divider my="sm" label="Lesson Content" labelPosition="center" />

              <RichTextEditor
                content={form.values.text_content}
                onChange={(val) => form.setFieldValue('text_content', val)}
                minHeight={500}
              />

              <Group justify="flex-end" mt="xl">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/admin/courses/${courseSlug}/curriculum`)}
                  color="gray"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="md"
                  loading={isUpdating}
                  leftSection={<IconDeviceFloppy size={18} />}
                >
                  Save Changes
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Stack>
      </form>
    </Stack>
  );
}
