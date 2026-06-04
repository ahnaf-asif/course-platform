'use client';

import {
  Title,
  Button,
  Group,
  Stack,
  Badge,
  ActionIcon,
  Text,
  LoadingOverlay,
  Box,
  Card,
  Image,
  SimpleGrid,
  Menu,
  Modal,
  TextInput,
  Textarea,
  Switch,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconExternalLink,
  IconPhoto,
} from '@tabler/icons-react';
import {
  useGetAdminCourses,
  usePostAdminCourses,
  useDeleteAdminCoursesId,
} from '@/api/generated/admin-course/admin-course';
import { CreateCourseRequest } from '@/api/model/components-schemas-course/createCourseRequest';
import Link from 'next/link';

export default function CoursesManagement() {
  const { data: courses, isLoading, refetch } = useGetAdminCourses();
  const { mutateAsync: createCourse, isPending: isCreating } = usePostAdminCourses();
  const { mutateAsync: deleteCourse } = useDeleteAdminCoursesId();

  const [opened, { open, close }] = useDisclosure(false);

  const form = useForm<CreateCourseRequest>({
    initialValues: {
      title: '',
      description: '',
      thumbnail_url: '',
      is_published: false,
    },
    validate: {
      title: (value: string) => (value.length < 3 ? 'Title must be at least 3 characters' : null),
      description: (value: string) => (value.length < 10 ? 'Description must be at least 10 characters' : null),
      thumbnail_url: (value: string | undefined) =>
        value && !/^(https?:\/\/)/.test(value) ? 'Must be a valid URL' : null,
    },
  });

  const handleCreate = async (values: CreateCourseRequest) => {
    try {
      const payload = {
        ...values,
        thumbnail_url: values.thumbnail_url || undefined,
      };

      await createCourse({ data: payload });
      notifications.show({
        title: 'Success',
        message: 'Course created successfully',
        color: 'green',
      });
      close();
      form.reset();
      refetch();
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: error.response?.data?.message || 'Failed to create course',
        color: 'red',
      });
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
      } catch (error: any) {
        notifications.show({
          title: 'Error',
          message: 'Failed to delete course',
          color: 'red',
        });
      }
    }
  };

  return (
    <Stack gap="lg" pos="relative">
      <LoadingOverlay visible={isLoading} />

      <Group justify="space-between" align="center">
        <Title order={2}>Courses Management</Title>
        <Button leftSection={<IconPlus size={18} />} onClick={open}>
          New Course
        </Button>
      </Group>

      {courses && courses.length > 0 ? (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
          {courses.map((course) => (
            <Card key={course.id} shadow="sm" padding="lg" radius="md" withBorder>
              <Card.Section>
                {course.thumbnail_url ? (
                  <Image
                    src={course.thumbnail_url}
                    height={160}
                    alt={course.title}
                    fallbackSrc="https://placehold.co/600x400?text=No+Thumbnail"
                  />
                ) : (
                  <Box
                    h={160}
                    bg="gray.1"
                    display="flex"
                    style={{ alignItems: 'center', justifyContent: 'center' }}
                  >
                    <IconPhoto size={48} color="gray" />
                  </Box>
                )}
              </Card.Section>

              <Group justify="space-between" mt="md" mb="xs">
                <Text fw={500} truncate="end" style={{ flex: 1 }}>
                  {course.title}
                </Text>
                <Badge color={course.is_published ? 'green' : 'gray'} variant="light">
                  {course.is_published ? 'Published' : 'Draft'}
                </Badge>
              </Group>

              <Text size="sm" c="dimmed" lineClamp={2} mb="md" h={40}>
                {course.description}
              </Text>

              <Group gap="xs" mt="auto">
                <Button
                  component={Link}
                  href={'/admin/courses/' + course.id + '/curriculum'}
                  variant="light"
                  style={{ flex: 1 }}
                  leftSection={<IconEdit size={16} />}
                >
                  Edit Content
                </Button>
                
                <Menu shadow="md" width={200} position="bottom-end">
                  <Menu.Target>
                    <ActionIcon variant="subtle" size="lg">
                      <IconDotsVertical size={20} />
                    </ActionIcon>
                  </Menu.Target>

                  <Menu.Dropdown>
                    <Menu.Label>Actions</Menu.Label>
                    <Menu.Item
                      leftSection={<IconExternalLink size={14} />}
                      component={Link}
                      href={'/courses/' + course.id}
                      target="_blank"
                    >
                      View Public Page
                    </Menu.Item>
                    <Menu.Item leftSection={<IconEdit size={14} />}>
                      Edit Settings
                    </Menu.Item>
                    <Menu.Divider />
                    <Menu.Item
                      color="red"
                      leftSection={<IconTrash size={14} />}
                      onClick={() => handleDelete(course.id)}
                    >
                      Delete Course
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      ) : !isLoading ? (
        <Card withBorder padding="xl" radius="md" bg="gray.0">
          <Stack align="center" gap="xs">
            <Text fw={500}>No courses found</Text>
            <Text size="sm" c="dimmed">
              Create your first course to get started.
            </Text>
            <Button variant="outline" mt="sm" onClick={open}>
              Create Course
            </Button>
          </Stack>
        </Card>
      ) : null}

      <Modal opened={opened} onClose={close} title="Create New Course" centered size="md">
        <form onSubmit={form.onSubmit(handleCreate)}>
          <Stack gap="md">
            <TextInput
              label="Course Title"
              placeholder="e.g. Mastering Advanced Go"
              required
              {...form.getInputProps('title')}
            />
            <Textarea
              label="Description"
              placeholder="Provide a brief overview of the course content..."
              required
              minRows={3}
              {...form.getInputProps('description')}
            />
            <TextInput
              label="Thumbnail URL"
              placeholder="https://example.com/image.png"
              {...form.getInputProps('thumbnail_url')}
            />
            <Switch
              label="Publish immediately"
              {...form.getInputProps('is_published', { type: 'checkbox' })}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={close}>
                Cancel
              </Button>
              <Button type="submit" loading={isCreating}>
                Create Course
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
