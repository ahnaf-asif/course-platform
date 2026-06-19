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
import {
  IconPlus,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconQuestionMark,
  IconCalendar,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useQuizzes } from './useQuizzes';

export default function QuizzesManagement() {
  const {
    quizzes,
    isLoading,
    opened,
    close,
    editingId,
    form,
    handleOpenModal,
    handleSubmit,
    handleDelete,
    isCreating,
  } = useQuizzes();

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
              <ActionIcon variant="subtle" color="gray" aria-label="Quiz Options">
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
