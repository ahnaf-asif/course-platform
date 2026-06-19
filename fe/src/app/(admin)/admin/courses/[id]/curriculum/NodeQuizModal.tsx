'use client';

import {
  Modal,
  Stack,
  Text,
  Group,
  Button,
  Select,
  LoadingOverlay,
  Divider,
  TextInput,
  Collapse,
} from '@mantine/core';
import { IconPlus, IconAlertCircle, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { LinkedQuizzesTable } from './LinkedQuizzesTable';
import { useNodeQuizzes } from './useNodeQuizzes';

interface NodeQuizModalProps {
  opened: boolean;
  onClose: () => void;
  nodeId: string;
  nodeTitle: string;
}

export function NodeQuizModal({ opened, onClose, nodeId, nodeTitle }: NodeQuizModalProps) {
  const {
    linkedQuizzes,
    loadingAll,
    loadingLinked,
    isAttaching,
    isDetaching,
    isCreating,
    selectedQuizId,
    setSelectedQuizId,
    showCreate,
    setShowCreate,
    newQuizTitle,
    setNewQuizTitle,
    handleAttach,
    handleCreateAndAttach,
    handleDetach,
    quizOptions,
  } = useNodeQuizzes(nodeId);

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
              aria-label="Select Existing Quiz"
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
          <LinkedQuizzesTable
            quizzes={linkedQuizzes}
            onDetach={handleDetach}
            isDetaching={isDetaching}
          />
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
