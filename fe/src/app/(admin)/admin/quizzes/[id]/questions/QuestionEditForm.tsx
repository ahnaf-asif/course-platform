'use client';

import React from 'react';
import {
  Box,
  Stack,
  Group,
  Text,
  ActionIcon,
  TextInput,
  Select,
  Checkbox,
  Button,
} from '@mantine/core';
import { IconTrash, IconPlus, IconX } from '@tabler/icons-react';
import { UseFormReturnType } from '@mantine/form';
import CustomRichTextEditor from '@/components/Editor/RichTextEditor';
import { EditFormValues } from './types';

interface QuestionEditFormProps {
  index: number;
  editForm: UseFormReturnType<EditFormValues>;
  handleUpdateSubmit: (values: EditFormValues) => Promise<void>;
  setEditingId: (id: string | null) => void;
  isUpdating: boolean;
}

export function QuestionEditForm({
  index,
  editForm,
  handleUpdateSubmit,
  setEditingId,
  isUpdating,
}: QuestionEditFormProps) {
  return (
    <Box p="md">
      <form onSubmit={editForm.onSubmit(handleUpdateSubmit)}>
        <Stack gap="md">
          <Group justify="space-between">
            <Text fw={600}>Editing Question #{index + 1}</Text>
            <ActionIcon color="gray" variant="subtle" onClick={() => setEditingId(null)}>
              <IconX size={18} />
            </ActionIcon>
          </Group>

          <TextInput
            label="Question Content"
            required
            {...editForm.getInputProps('content')}
          />

          <Select
            label="Question Type"
            data={[
              { value: 'SINGLE', label: 'Single Choice' },
              { value: 'MULTIPLE', label: 'Multiple Choice' },
            ]}
            {...editForm.getInputProps('question_type')}
          />

          <CustomRichTextEditor
            label="Explanation (Optional)"
            content={editForm.values.explanation}
            onChange={(content) => editForm.setFieldValue('explanation', content)}
            minHeight={150}
            compact
          />

          <Text size="sm" fw={500} mt="xs">Answer Options</Text>
          {editForm.values.answers.map((_, aIndex) => (
            <Group key={aIndex} align="flex-end">
              <TextInput
                style={{ flex: 1 }}
                placeholder={`Option ${aIndex + 1}`}
                required
                {...editForm.getInputProps(`answers.${aIndex}.content`)}
              />
              <Checkbox
                label="Correct"
                mb={10}
                {...editForm.getInputProps(`answers.${aIndex}.is_correct`, { type: 'checkbox' })}
              />
              {editForm.values.answers.length > 2 && (
                <ActionIcon
                  color="red"
                  variant="subtle"
                  mb={8}
                  onClick={() => editForm.removeListItem('answers', aIndex)}
                >
                  <IconTrash size={16} />
                </ActionIcon>
              )}
            </Group>
          ))}

          <Button
            variant="subtle"
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={() => editForm.insertListItem('answers', { content: '', is_correct: false })}
            w="fit-content"
          >
            Add Option
          </Button>

          <Group justify="flex-end" gap="sm">
            <Button variant="light" color="gray" onClick={() => setEditingId(null)}>
              Cancel
            </Button>
            <Button type="submit" loading={isUpdating}>
              Save Changes
            </Button>
          </Group>
        </Stack>
      </form>
    </Box>
  );
}
