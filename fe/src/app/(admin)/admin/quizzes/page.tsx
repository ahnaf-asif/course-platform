'use client';

import {
  Title,
  Text,
  Stack,
  Group,
  Button,
  Card,
  Table,
  ActionIcon,
  Menu,
  LoadingOverlay,
  Modal,
  TextInput,
  NumberInput,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconQuestionMark,
  IconCalendar,
} from '@tabler/icons-react';
import {
  useGetAdminQuizzes,
  usePostAdminQuizzes,
  usePatchAdminQuizzesId,
  useDeleteAdminQuizzesId,
} from '@/api/generated/admin-assessment/admin-assessment';
import { CreateQuizRequest } from '@/api/model/components-schemas-assessment/createQuizRequest';
import { QuizResponse } from '@/api/model/components-schemas-assessment/quizResponse';
import Link from 'next/link';
import axios from 'axios';
import { useState } from 'react';

export default function QuizzesManagement() {
  const { data: quizzes, isLoading, refetch } = useGetAdminQuizzes();
  const { mutateAsync: createQuiz, isPending: isCreating } = usePostAdminQuizzes();
  const { mutateAsync: updateQuiz } = usePatchAdminQuizzesId();
  const { mutateAsync: deleteQuiz } = useDeleteAdminQuizzesId();

  const [opened, { open, close }] = useDisclosure(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<CreateQuizRequest>({
    initialValues: {
      title: '',
      passing_score: 70,
    },
    validate: {
      title: (value) => (value.length < 3 ? 'Title must be at least 3 characters' : null),
      passing_score: (value) => (value >= 0 && value <= 100 ? null : 'Score must be between 0 and 100'),
    },
  });

  const handleOpenModal = (quiz?: QuizResponse) => {
    if (quiz) {
      setEditingId(quiz.id);
      form.setValues({
        title: quiz.title,
        passing_score: quiz.passing_score,
      });
    } else {
      setEditingId(null);
      form.reset();
    }
    open();
  };

  const handleSubmit = async (values: CreateQuizRequest) => {
    try {
      if (editingId) {
        await updateQuiz({ id: editingId, data: values });
        notifications.show({ title: 'Success', message: 'Quiz updated successfully', color: 'green' });
      } else {
        await createQuiz({ data: values });
        notifications.show({ title: 'Success', message: 'Quiz created successfully', color: 'green' });
      }
      close();
      refetch();
    } catch (error) {
      let message = 'Failed to save quiz';
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || message;
      }
      notifications.show({ title: 'Error', message, color: 'red' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this quiz?')) return;

    try {
      await deleteQuiz({ id });
      notifications.show({ title: 'Deleted', message: 'Quiz removed successfully', color: 'blue' });
      refetch();
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to delete quiz', color: 'red' });
    }
  };

  const rows = quizzes?.map((quiz) => (
    <Table.Tr key={quiz.id}>
      <Table.Td>
        <Text fw={500}>{quiz.title}</Text>
      </Table.Td>
      <Table.Td>{quiz.passing_score}%</Table.Td>
      <Table.Td>
        <Group gap="xs">
          <IconCalendar size={14} color="gray" />
          <Text size="xs" c="dimmed">
            {new Date(quiz.created_at).toLocaleDateString()}
          </Text>
        </Group>
      </Table.Td>
      <Table.Td>
        <Group justify="flex-end">
          <Button
            size="compact-xs"
            variant="light"
            leftSection={<IconQuestionMark size={14} />}
            component={Link}
            href={`/admin/quizzes/${quiz.id}/questions`}
          >
            Questions
          </Button>

          <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray">
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Quiz Actions</Menu.Label>
              <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => handleOpenModal(quiz)}>
                Edit Details
              </Menu.Item>
              <Menu.Divider />
              <Menu.Item
                color="red"
                leftSection={<IconTrash size={14} />}
                onClick={() => handleDelete(quiz.id)}
              >
                Delete Quiz
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Stack gap="lg" pos="relative">
      <LoadingOverlay visible={isLoading} />

      <Group justify="space-between" align="center">
        <div>
          <Title order={2}>Assessment Library</Title>
          <Text color="dimmed" size="sm">Manage quizzes and assessments across the platform</Text>
        </div>
        <Button leftSection={<IconPlus size={18} />} onClick={() => handleOpenModal()}>
          New Quiz
        </Button>
      </Group>

      {quizzes && quizzes.length > 0 ? (
        <Card withBorder padding={0} radius="md">
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead bg="gray.0">
              <Table.Tr>
                <Table.Th>Title</Table.Th>
                <Table.Th>Passing Score</Table.Th>
                <Table.Th>Created At</Table.Th>
                <Table.Th />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>{rows}</Table.Tbody>
          </Table>
        </Card>
      ) : !isLoading ? (
        <Card withBorder padding="xl" radius="md" bg="gray.0">
          <Stack align="center" gap="xs">
            <Text fw={500}>No quizzes found</Text>
            <Text size="sm" c="dimmed">Create your first assessment to get started.</Text>
            <Button variant="outline" mt="sm" onClick={() => handleOpenModal()}>
              Create Quiz
            </Button>
          </Stack>
        </Card>
      ) : null}

      <Modal
        opened={opened}
        onClose={close}
        title={editingId ? 'Edit Quiz' : 'Create New Quiz'}
        centered
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Quiz Title"
              placeholder="e.g. Mid-term Examination"
              required
              {...form.getInputProps('title')}
            />
            <NumberInput
              label="Passing Score (%)"
              placeholder="70"
              min={0}
              max={100}
              required
              {...form.getInputProps('passing_score')}
            />
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" onClick={close}>Cancel</Button>
              <Button type="submit" loading={isCreating}>
                {editingId ? 'Save Changes' : 'Create Quiz'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>
    </Stack>
  );
}
