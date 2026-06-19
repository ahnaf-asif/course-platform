'use client';

import React from 'react';
import {
  Paper,
  Group,
  Text,
  ActionIcon,
  Stack,
  TextInput,
  Select,
  Checkbox,
  Button,
} from '@mantine/core';
import { IconTrash, IconPlus } from '@tabler/icons-react';
import { UseFormReturnType } from '@mantine/form';
import CustomRichTextEditor from '@/components/Editor/RichTextEditor';
import { AddQuestionFormValues } from './types';

interface AddQuestionFormProps {
  form: UseFormReturnType<AddQuestionFormValues>;
  handleAddQuestion: () => void;
  handleAddAnswer: (qIndex: number) => void;
  handleSubmit: (values: AddQuestionFormValues) => Promise<void>;
  isAdding: boolean;
}

export function AddQuestionForm({
  form,
  handleAddQuestion,
  handleAddAnswer,
  handleSubmit,
  isAdding,
}: AddQuestionFormProps) {
  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="xl">
        {form.values.questions.map((_, qIndex) => (
          <Paper key={qIndex} withBorder p="md" radius="md" bg="gray.0">
            <Group justify="space-between" mb="md">
              <Text fw={600}>New Question #{qIndex + 1}</Text>
              {form.values.questions.length > 1 && (
                <ActionIcon
                  color="red"
                  variant="subtle"
                  onClick={() => form.removeListItem('questions', qIndex)}
                >
                  <IconTrash size={18} />
                </ActionIcon>
              )}
            </Group>

            <Stack gap="md">
              <TextInput
                label="Question Content"
                placeholder="e.g. What is the capital of France?"
                required
                {...form.getInputProps(`questions.${qIndex}.content`)}
              />

              <Select
                label="Question Type"
                data={[
                  { value: 'SINGLE', label: 'Single Choice' },
                  { value: 'MULTIPLE', label: 'Multiple Choice' },
                ]}
                {...form.getInputProps(`questions.${qIndex}.question_type`)}
              />

              <CustomRichTextEditor
                label="Explanation (Optional)"
                content={form.values.questions[qIndex].explanation}
                onChange={(content) => form.setFieldValue(`questions.${qIndex}.explanation`, content)}
                minHeight={150}
                compact
              />

              <Text size="sm" fw={500} mt="xs">Answer Options</Text>
              {form.values.questions[qIndex].answers.map((__, aIndex) => (
                <Group key={aIndex} align="flex-end">
                  <TextInput
                    style={{ flex: 1 }}
                    placeholder={`Option ${aIndex + 1}`}
                    required
                    {...form.getInputProps(`questions.${qIndex}.answers.${aIndex}.content`)}
                  />
                  <Checkbox
                    label="Correct"
                    mb={10}
                    {...form.getInputProps(`questions.${qIndex}.answers.${aIndex}.is_correct`, { type: 'checkbox' })}
                  />
                  {form.values.questions[qIndex].answers.length > 2 && (
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      mb={8}
                      onClick={() => form.removeListItem(`questions.${qIndex}.answers`, aIndex)}
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
                onClick={() => handleAddAnswer(qIndex)}
                w="fit-content"
              >
                Add Option
              </Button>
            </Stack>
          </Paper>
        ))}

        <Group justify="space-between">
          <Button
            variant="outline"
            leftSection={<IconPlus size={18} />}
            onClick={handleAddQuestion}
          >
            Add Another Question
          </Button>
          <Button type="submit" size="md" loading={isAdding}>
            Add Questions to Quiz
          </Button>
        </Group>
      </Stack>
    </form>
  );
}
