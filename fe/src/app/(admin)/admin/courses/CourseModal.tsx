'use client';

import { useEffect } from 'react';
import { Modal, Stack, TextInput, Textarea, Switch, Group, Button } from '@mantine/core';
import { useForm } from '@mantine/form';
import ImageUpload from '@/components/ImageUpload';
import { CreateCourseRequest } from '@/api/model/components-schemas-course/createCourseRequest';
import { CourseResponse } from '@/api/model/components-schemas-course/courseResponse';

interface CourseModalProps {
  opened: boolean;
  onClose: () => void;
  course: CourseResponse | null;
  onSubmit: (values: CreateCourseRequest & { slug?: string }) => Promise<void>;
  loading: boolean;
}

export function CourseModal({ opened, onClose, course, onSubmit, loading }: CourseModalProps) {
  const form = useForm<CreateCourseRequest & { slug?: string }>({
    initialValues: {
      title: '',
      slug: '',
      description: '',
      thumbnail_url: '',
      is_published: false,
    },
    validate: {
      title: (value: string) => (value.length < 3 ? 'Title must be at least 3 characters' : null),
      slug: (value: string | undefined) =>
        value && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? 'Invalid slug format (lowercase, numbers and hyphens only)' : null,
      description: (value: string) => (value.length < 10 ? 'Description must be at least 10 characters' : null),
      thumbnail_url: (value: string | undefined) =>
        value && !/^(https?:\/\/|\/media-api\/)/.test(value) ? 'Must be a valid URL or media path' : null,
    },
  });

  useEffect(() => {
    if (opened) {
      if (course) {
        form.setValues({
          title: course.title,
          slug: course.slug || '',
          description: course.description,
          thumbnail_url: course.thumbnail_url || '',
          is_published: course.is_published,
        });
      } else {
        form.reset();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, course]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={course ? 'Edit Course Settings' : 'Create New Course'}
      centered
      size="md"
    >
      <form onSubmit={form.onSubmit(onSubmit)}>
        <Stack gap="md">
          <TextInput
            label="Course Title"
            placeholder="e.g. Mastering Advanced Go"
            required
            {...form.getInputProps('title')}
          />
          <TextInput
            label="Course Slug"
            placeholder="e.g. mastering-advanced-go"
            description="URL-friendly name. Leave empty to auto-generate."
            {...form.getInputProps('slug')}
          />
          <Textarea
            label="Description"
            placeholder="Provide a brief overview of the course content..."
            required
            minRows={3}
            {...form.getInputProps('description')}
          />

          <ImageUpload
            label="Course Thumbnail"
            description="A preview image for your course. Recommended size 1200x800."
            value={form.values.thumbnail_url || ''}
            onChange={(val) => form.setFieldValue('thumbnail_url', val)}
          />

          <Switch
            label="Publish immediately"
            {...form.getInputProps('is_published', { type: 'checkbox' })}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="subtle" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {course ? 'Save Changes' : 'Create Course'}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
