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
  TextInput,
  Collapse,
} from '@mantine/core';
import {
  useGetAdminQuizzes,
  useGetAdminNodesIdQuizzes,
  usePostAdminNodesIdQuizzes,
  useDeleteAdminNodesIdQuizzesQuizId,
  usePostAdminQuizzes,
} from '@/api/generated/admin-assessment/admin-assessment';
import { IconPlus, IconTrash, IconLink, IconAlertCircle, IconChevronDown, IconChevronUp, IconEdit } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import axios from 'axios';
import Link from 'next/link';

interface NodeQuizModalProps {
  opened: boolean;
  onClose: () => void;
  nodeId: string;
  nodeTitle: string;
}

export function NodeQuizModal({ opened, onClose, nodeId, nodeTitle }: NodeQuizModalProps) {
  const { data: allQuizzes, isLoading: loadingAll, refetch: refetchAll } = useGetAdminQuizzes();
  const { data: linkedQuizzes, isLoading: loadingLinked, refetch: refetchLinked } = useGetAdminNodesIdQuizzes(nodeId);
  const { mutateAsync: attachQuiz, isPending: isAttaching } = usePostAdminNodesIdQuizzes();
  const { mutateAsync: detachQuiz, isPending: isDetaching } = useDeleteAdminNodesIdQuizzesQuizId();
  const { mutateAsync: createQuiz, isPending: isCreating } = usePostAdminQuizzes();

  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newQuizTitle, setNewQuizTitle] = useState('');

  const handleAttach = async () => {
    if (!selectedQuizId) return;

    try {
      await attachQuiz({ id: nodeId, data: { quiz_id: selectedQuizId } });
      notifications.show({ title: 'Success', message: 'Quiz linked successfully', color: 'green' });
      setSelectedQuizId(null);
      refetchLinked();
    } catch (error) {
      let message = 'Failed to link quiz';
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || message;
      }
      notifications.show({ title: 'Error', message, color: 'red' });
    }
  };

  const handleCreateAndAttach = async () => {
    if (!newQuizTitle.trim()) return;

    try {
      // 1. Create the quiz
      const quiz = await createQuiz({ 
        data: { 
          title: newQuizTitle.trim(),
          passing_score: 80 // Default passing score
        } 
      });

      // 2. Attach it to the node
      await attachQuiz({ id: nodeId, data: { quiz_id: quiz.id } });
      
      notifications.show({ 
        title: 'Success', 
        message: 'Quiz created and linked successfully', 
        color: 'green' 
      });

      // Cleanup
      setNewQuizTitle('');
      setShowCreate(false);
      refetchAll();
      refetchLinked();
    } catch (error) {
      let message = 'Failed to create and link quiz';
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
      refetchLinked();
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
          Link quizzes from your library or create a new one for this curriculum node.
        </Text>

        <Stack gap="xs">
          <Group align="flex-end">
            <Select
              label="Select Existing Quiz"
              placeholder="Search quizzes..."
              data={quizOptions}
              searchable
              style={{ flex: 1 }}
              value={selectedQuizId}
              onChange={setSelectedQuizId}
              nothingFoundMessage="No quizzes found in library"
              disabled={showCreate}
            />
            <Button 
              onClick={handleAttach} 
              loading={isAttaching} 
              disabled={!selectedQuizId || showCreate}
              leftSection={<IconPlus size={16} />}
            >
              Link
            </Button>
          </Group>

          <Button 
            variant="subtle" 
            size="xs" 
            onClick={() => setShowCreate(!showCreate)}
            leftSection={showCreate ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
            w="fit-content"
          >
            {showCreate ? 'Cancel New Quiz' : 'Create New Quiz'}
          </Button>

          <Collapse expanded={showCreate}>
            <Stack gap="sm" p="sm" style={{ border: '1px dashed var(--mantine-color-blue-4)', borderRadius: 'var(--mantine-radius-sm)' }}>
              <TextInput
                label="New Quiz Title"
                placeholder="Enter quiz title..."
                value={newQuizTitle}
                onChange={(e) => setNewQuizTitle(e.currentTarget.value)}
                required
              />
              <Button 
                onClick={handleCreateAndAttach} 
                loading={isCreating || isAttaching}
                disabled={!newQuizTitle.trim()}
                variant="light"
                fullWidth
              >
                Create and Link
              </Button>
            </Stack>
          </Collapse>
        </Stack>

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
                    <Group gap="xs" justify="flex-end">
                      <ActionIcon 
                        variant="subtle" 
                        color="blue" 
                        component={Link}
                        href={`/admin/quizzes/${quiz.id}/questions`}
                        title="Edit questions"
                      >
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon 
                        color="red" 
                        variant="subtle" 
                        onClick={() => handleDetach(quiz.id)}
                        loading={isDetaching}
                        title="Unlink quiz"
                      >
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
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
