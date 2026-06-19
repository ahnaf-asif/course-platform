'use client';

import { useState } from 'react';
import {
  Card,
  Box,
  Stack,
  Group,
  Text,
  ActionIcon,
  Badge,
  Divider,
  Collapse,
  UnstyledButton,
} from '@mantine/core';
import {
  IconTrash,
  IconChevronUp,
  IconChevronDown,
  IconPencil,
  IconCheck,
} from '@tabler/icons-react';
import { UseFormReturnType } from '@mantine/form';
import { MathJaxContent } from '@/components/MathJaxContent';
import { QuestionResponse } from '@/api/model/components-schemas-assessment/questionResponse';
import { AnswerOption } from '@/api/model/components-schemas-assessment/answerOption';
import { EditFormValues } from './types';
import { QuestionEditForm } from './QuestionEditForm';

interface QuestionCardProps {
  q: QuestionResponse;
  index: number;
  onEdit: (q: QuestionResponse) => void;
  onDelete: (id: string) => void;
  editingId: string | null;
  editForm: UseFormReturnType<EditFormValues>;
  handleUpdateSubmit: (values: EditFormValues) => Promise<void>;
  setEditingId: (id: string | null) => void;
  isUpdating: boolean;
}

export function QuestionCard({
  q,
  index,
  onEdit,
  onDelete,
  editingId,
  editForm,
  handleUpdateSubmit,
  setEditingId,
  isUpdating,
}: QuestionCardProps) {
  const [explanationOpened, setExplanationOpened] = useState(false);
  const [cardExpanded, setCardExpanded] = useState(false);

  return (
    <Card withBorder shadow="sm" radius="md" p={0}>
      {editingId === q.id ? (
        <QuestionEditForm
          index={index}
          editForm={editForm}
          handleUpdateSubmit={handleUpdateSubmit}
          setEditingId={setEditingId}
          isUpdating={isUpdating}
        />
      ) : (
        <>
          <Box
            onClick={() => setCardExpanded((e) => !e)}
            style={{ width: '100%', cursor: 'pointer' }}
          >
            <Box p="md">
              <Group justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap" style={{ flex: 1 }}>
                  <Box style={{ display: 'flex', alignItems: 'center' }}>
                    {cardExpanded ? (
                      <IconChevronUp size={18} color="var(--mantine-color-gray-6)" />
                    ) : (
                      <IconChevronDown size={18} color="var(--mantine-color-gray-6)" />
                    )}
                  </Box>
                  <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                    <Group gap="xs">
                      <Badge variant="outline" size="sm">{index + 1}</Badge>
                      <Badge color={q.question_type === 'SINGLE' ? 'blue' : 'purple'} variant="light" size="sm">
                        {q.question_type}
                      </Badge>
                    </Group>
                    <Text fw={500} size="sm" truncate="end" lineClamp={1}>{q.content}</Text>
                  </Stack>
                </Group>
                <Group gap={5}>
                  <ActionIcon
                    color="blue"
                    variant="subtle"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(q);
                    }}
                  >
                    <IconPencil size={18} />
                  </ActionIcon>
                  <ActionIcon
                    color="red"
                    variant="subtle"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(q.id);
                    }}
                  >
                    <IconTrash size={18} />
                  </ActionIcon>
                </Group>
              </Group>
            </Box>
          </Box>

          <Collapse expanded={cardExpanded}>
            <Box px="md" pb="md">
              <Divider mb="md" variant="dotted" />
              <Text fw={600} size="sm" mb="xs">Question:</Text>
              <Text size="sm" mb="md">{q.content}</Text>

              <Text fw={600} size="sm" mb="xs">Answer Options:</Text>
              <Stack gap={5}>
                {q.answers.map((a: AnswerOption, i: number) => (
                  <Group key={i} gap="xs">
                    {a.is_correct ? <IconCheck size={14} color="green" /> : <Box w={14} />}
                    <Text size="sm" c={a.is_correct ? 'green' : 'dimmed'}>
                      {a.content}
                    </Text>
                  </Group>
                ))}
              </Stack>

              {q.explanation && (
                <Box mt="md">
                  <UnstyledButton
                    onClick={() => setExplanationOpened((o) => !o)}
                    style={{ width: '100%' }}
                  >
                    <Group gap={4} py={4}>
                      <Text size="xs" fw={700} c="blue.7" tt="uppercase">Explanation</Text>
                      {explanationOpened ? (
                        <IconChevronUp size={14} color="var(--mantine-color-blue-7)" />
                      ) : (
                        <IconChevronDown size={14} color="var(--mantine-color-blue-7)" />
                      )}
                    </Group>
                  </UnstyledButton>
                  <Collapse expanded={explanationOpened}>
                    <Box p="xs" bg="blue.0" style={{ borderRadius: '4px', borderLeft: '3px solid var(--mantine-color-blue-4)' }}>
                      <MathJaxContent html={q.explanation} />
                    </Box>
                  </Collapse>
                </Box>
              )}
            </Box>
          </Collapse>
        </>
      )}
    </Card>
  );
}
