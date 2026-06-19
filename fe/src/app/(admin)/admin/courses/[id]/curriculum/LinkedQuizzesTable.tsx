'use client';

import { Table, Group, ActionIcon, Text } from '@mantine/core';
import { IconLink, IconEdit, IconTrash } from '@tabler/icons-react';
import Link from 'next/link';
import { QuizResponse } from '@/api/model/components-schemas-assessment/quizResponse';

interface LinkedQuizzesTableProps {
  quizzes: QuizResponse[];
  onDetach: (quizId: string) => Promise<void>;
  isDetaching: boolean;
}

export function LinkedQuizzesTable({ quizzes, onDetach, isDetaching }: LinkedQuizzesTableProps) {
  return (
    <Table verticalSpacing="xs">
      <Table.Tbody>
        {quizzes.map((quiz) => (
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
                  aria-label={`Edit questions for ${quiz.title}`}
                >
                  <IconEdit size={16} />
                </ActionIcon>
                <ActionIcon 
                  color="red" 
                  variant="subtle" 
                  onClick={() => onDetach(quiz.id)}
                  loading={isDetaching}
                  title="Unlink quiz"
                  aria-label={`Unlink ${quiz.title}`}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Table.Td>
          </Table.Tr>
        ))}
      </Table.Tbody>
    </Table>
  );
}
