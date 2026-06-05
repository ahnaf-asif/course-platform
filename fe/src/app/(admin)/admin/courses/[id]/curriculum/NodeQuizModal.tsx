'use client';

import {
  Modal,
  Stack,
  Text,
  Group,
  Button,
  Select,
  Table,
  ActionIcon,
  LoadingOverlay,
  Divider,
} from '@mantine/core';
import {
  useGetAdminQuizzes,
  useGetAdminNodesIdQuizzes,
  usePostAdminNodesIdQuizzes,
  useDeleteAdminNodesIdQuizzesQuizId,
} from '@/api/generated/admin-assessment/admin-assessment';
import { IconPlus, IconTrash, IconLink, IconAlertCircle } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import axios from 'axios';

interface NodeQuizModalProps {
  opened: boolean;
  onClose: () => void;
  nodeId: string;
  nodeTitle: string;
}

export function NodeQuizModal({ opened, onClose, nodeId, nodeTitle }: NodeQuizModalProps) {
  const { data: allQuizzes, isLoading: loadingAll } = useGetAdminQuizzes();
  const { data: linkedQuizzes, isLoading: loadingLinked, refetch } = useGetAdminNodesIdQuizzes(nodeId);
  const { mutateAsync: attachQuiz, isPending: isAttaching } = usePostAdminNodesIdQuizzes();
  const { mutateAsync: detachQuiz, isPending: isDetaching } = useDeleteAdminNodesIdQuizzesQuizId();

  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);

  const handleAttach = async () => {
    if (!selectedQuizId) return;

    try {
      await attachQuiz({ id: nodeId, data: { quiz_id: selectedQuizId } });
      notifications.show({ title: 'Success', message: 'Quiz linked successfully', color: 'green' });
      setSelectedQuizId(null);
      refetch();
    } catch (error) {
      let message = 'Failed to link quiz';
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || message;
      }
      notifications.show({ title: 'Error', message, color: 'red' });
    }
  };

  const handleDetach = async (quizId: string) => {
    try {
      await detachQuiz({ id: nodeId, quizId });
      notifications.show({ title: 'Success', message: 'Quiz unlinked successfully', color: 'blue' });
      refetch();
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to unlink quiz', color: 'red' });
    }
  };

  const quizOptions = allQuizzes
    ?.filter(q => !linkedQuizzes?.some(l => l.id === q.id))
    ?.map(q => ({ value: q.id, label: q.title })) || [];

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={`Manage Quizzes: ${nodeTitle}`}
      size="md"
      centered
    >
      <Stack gap="md" pos="relative">
        <LoadingOverlay visible={loadingAll || loadingLinked} />

        <Text size="sm" c="dimmed">
          Link quizzes from your library to this curriculum node.
        </Text>

        <Group align="flex-end">
          <Select
            label="Select Quiz"
            placeholder="Search quizzes..."
            data={quizOptions}
            searchable
            style={{ flex: 1 }}
            value={selectedQuizId}
            onChange={setSelectedQuizId}
            nothingFoundMessage="No quizzes found in library"
          />
          <Button 
            onClick={handleAttach} 
            loading={isAttaching} 
            disabled={!selectedQuizId}
            leftSection={<IconPlus size={16} />}
          >
            Link
          </Button>
        </Group>

        <Divider my="sm" label="Linked Quizzes" labelPosition="center" />

        {linkedQuizzes && linkedQuizzes.length > 0 ? (
          <Table verticalSpacing="xs">
            <Table.Tbody>
              {linkedQuizzes.map((quiz) => (
                <Table.Tr key={quiz.id}>
                  <Table.Td>
                    <Group gap="xs">
                      <IconLink size={14} color="blue" />
                      <Text size="sm" fw={500}>{quiz.title}</Text>
                    </Group>
                  </Table.Td>
                  <Table.Td align="right">
                    <ActionIcon 
                      color="red" 
                      variant="subtle" 
                      onClick={() => handleDetach(quiz.id)}
                      loading={isDetaching}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        ) : (
          <Group gap="xs" justify="center" py="md">
            <IconAlertCircle size={16} color="gray" />
            <Text size="sm" c="dimmed">No quizzes linked to this node.</Text>
          </Group>
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>Close</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
