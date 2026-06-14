'use client';

import {
  Title,
  Text,
  Stack,
  Group,
  Button,
  Card,
  ActionIcon,
  LoadingOverlay,
  TextInput,
  Select,
  Checkbox,
  Divider,
  Breadcrumbs,
  Anchor,
  Paper,
  Badge,
  Box,
  Collapse,
  UnstyledButton,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconPlus,
  IconTrash,
  IconChevronLeft,
  IconCheck,
  IconAlertCircle,
  IconInfoCircle,
  IconChecklist,
  IconPencil,
  IconX,
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react';
import {
  useGetAdminQuizzesIdQuestions,
  usePostAdminQuizzesIdQuestions,
  useDeleteAdminQuizzesIdQuestionsQId,
  usePatchAdminQuizzesIdQuestionsQId,
  useGetAdminQuizzes,
} from '@/api/generated/admin-assessment/admin-assessment';
import { QuestionResponse } from '@/api/model/components-schemas-assessment/questionResponse';
import { AnswerOption } from '@/api/model/components-schemas-assessment/answerOption';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { useEffect, useState } from 'react';
import CustomRichTextEditor from '@/components/Editor/RichTextEditor';
import { MathJaxContent } from '@/components/MathJaxContent';
import { UseFormReturnType } from '@mantine/form';

interface EditFormValues {
  id: string;
  content: string;
  explanation: string;
  question_type: string;
  sequence_order: number;
  answers: {
    content: string;
    is_correct: boolean;
  }[];
}

function QuestionCard({
  q,
  index,
  onEdit,
  onDelete,
  editingId,
  editForm,
  handleUpdateSubmit,
  setEditingId,
  isUpdating
}: {
  q: QuestionResponse;
  index: number;
  onEdit: (q: QuestionResponse) => void;
  onDelete: (id: string) => void;
  editingId: string | null;
  editForm: UseFormReturnType<EditFormValues>;
  handleUpdateSubmit: (values: EditFormValues) => Promise<void>;
  setEditingId: (id: string | null) => void;
  isUpdating: boolean;
}) {
  const [explanationOpened, setExplanationOpened] = useState(false);
  const [cardExpanded, setCardExpanded] = useState(false);

  return (
    <Card withBorder shadow="sm" radius="md" p={0}>
      {editingId === q.id ? (
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
                align-self="flex-start"
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
                    {cardExpanded ? <IconChevronUp size={18} color="var(--mantine-color-gray-6)" /> : <IconChevronDown size={18} color="var(--mantine-color-gray-6)" />}
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
                      {explanationOpened ? <IconChevronUp size={14} color="var(--mantine-color-blue-7)" /> : <IconChevronDown size={14} color="var(--mantine-color-blue-7)" />}
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

export default function QuestionManagement() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: questions, isLoading: loadingQuestions, refetch } = useGetAdminQuizzesIdQuestions(quizId);
  const { data: allQuizzes, isLoading: loadingQuizzes } = useGetAdminQuizzes();
  const { mutateAsync: addQuestions, isPending: isAdding } = usePostAdminQuizzesIdQuestions();
  const { mutateAsync: deleteQuestion } = useDeleteAdminQuizzesIdQuestionsQId();
  const { mutateAsync: updateQuestion, isPending: isUpdating } = usePatchAdminQuizzesIdQuestionsQId();

  const currentQuiz = allQuizzes?.find(q => q.id === quizId);
  const isLoading = loadingQuestions || loadingQuizzes;

  useEffect(() => {
    if (!isLoading && allQuizzes && !currentQuiz) {
      notifications.show({
        title: 'Not Found',
        message: 'The requested quiz does not exist.',
        color: 'red',
      });
      router.push('/admin/quizzes');
    }
  }, [isLoading, allQuizzes, currentQuiz, router]);

  const form = useForm({
    initialValues: {
      questions: [
        {
          content: '',
          explanation: '',
          question_type: 'SINGLE',
          answers: [
            { content: '', is_correct: false },
            { content: '', is_correct: false },
          ],
        },
      ],
    },
    validate: {
      questions: {
        content: (value) => (value.length < 1 ? 'Question content is required' : null),
        answers: {
          content: (value) => (value.length < 1 ? 'Answer content is required' : null),
        },
      },
    },
  });

  const handleAddQuestion = () => {
    form.insertListItem('questions', {
      content: '',
      explanation: '',
      question_type: 'SINGLE',
      answers: [
        { content: '', is_correct: false },
        { content: '', is_correct: false },
      ],
    });
  };

  const handleAddAnswer = (qIndex: number) => {
    form.insertListItem(`questions.${qIndex}.answers`, { content: '', is_correct: false });
  };

  const handleSubmit = async (values: typeof form.values) => {
    // Validation: At least one correct answer per question
    const invalidQuestion = values.questions.find(q => !q.answers.some(a => a.is_correct));
    if (invalidQuestion) {
      notifications.show({
        title: 'Validation Error',
        message: 'Each question must have at least one correct answer.',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }

    try {
      const payload = {
        questions: values.questions.map((q, index) => ({
          ...q,
          sequence_order: (questions?.length || 0) + index,
          question_type: q.question_type as 'SINGLE' | 'MULTIPLE',
        })),
      };

      await addQuestions({ id: quizId, data: payload });
      notifications.show({ title: 'Success', message: 'Questions added successfully', color: 'green' });
      form.reset();
      refetch();
    } catch (error) {
      let message = 'Failed to add questions';
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || message;
      }
      notifications.show({ title: 'Error', message, color: 'red' });
    }
  };

  const editForm = useForm({
    initialValues: {
      id: '',
      content: '',
      explanation: '',
      question_type: 'SINGLE',
      sequence_order: 0,
      answers: [
        { content: '', is_correct: false },
      ],
    },
    validate: {
      content: (value) => (value.length < 1 ? 'Question content is required' : null),
      answers: {
        content: (value) => (value.length < 1 ? 'Answer content is required' : null),
      },
    },
  });

  const handleStartEdit = (q: QuestionResponse) => {
    editForm.setValues({
      id: q.id,
      content: q.content,
      explanation: q.explanation || '',
      question_type: q.question_type,
      sequence_order: q.sequence_order,
      answers: q.answers.map((a) => ({ content: a.content, is_correct: a.is_correct })),
    });
    setEditingId(q.id);
  };

  const handleUpdateSubmit = async (values: typeof editForm.values) => {
    const invalidQuestion = !values.answers.some(a => a.is_correct);
    if (invalidQuestion) {
      notifications.show({
        title: 'Validation Error',
        message: 'Each question must have at least one correct answer.',
        color: 'red',
        icon: <IconAlertCircle size={16} />,
      });
      return;
    }

    try {
      await updateQuestion({
        id: quizId,
        qId: values.id,
        data: {
          content: values.content,
          explanation: values.explanation || null,
          question_type: values.question_type as 'SINGLE' | 'MULTIPLE',
          sequence_order: values.sequence_order,
          answers: values.answers.map(a => ({ content: a.content, is_correct: a.is_correct })),
        }
      });
      notifications.show({ title: 'Success', message: 'Question updated successfully', color: 'green' });
      setEditingId(null);
      refetch();
    } catch (error) {
      let message = 'Failed to update question';
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || message;
      }
      notifications.show({ title: 'Error', message, color: 'red' });
    }
  };

  const handleDelete = async (qId: string) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;

    try {
      await deleteQuestion({ id: quizId, qId });
      notifications.show({ title: 'Deleted', message: 'Question removed successfully', color: 'blue' });
      refetch();
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to delete question', color: 'red' });
    }
  };

  return (
    <Stack gap="lg" pos="relative">
      <LoadingOverlay visible={isLoading} />

      <Breadcrumbs>
        <Anchor component={Link} href="/admin/quizzes">
          Quizzes
        </Anchor>
        <Text color="dimmed">{currentQuiz ? currentQuiz.title : 'Manage Questions'}</Text>
      </Breadcrumbs>

      <Group justify="space-between">
        <Stack gap={0}>
          <Title order={2}>Manage Questions</Title>
          {currentQuiz && (
            <Text c="dimmed" size="sm" fw={500}>
              Quiz: {currentQuiz.title}
            </Text>
          )}
        </Stack>
        <Button
          variant="light"
          leftSection={<IconChevronLeft size={16} />}
          component={Link}
          href="/admin/quizzes"
        >
          Back to Library
        </Button>
      </Group>

      {currentQuiz && (
        <Card withBorder radius="md" p="md">
          <Group gap="xl">
            <Group gap="xs">
              <IconChecklist size={20} color="var(--mantine-color-blue-6)" />
              <div>
                <Text size="xs" c="dimmed" lh={1}>Passing Score</Text>
                <Text fw={600}>{currentQuiz.passing_score}%</Text>
              </div>
            </Group>
            <Group gap="xs">
              <IconInfoCircle size={20} color="var(--mantine-color-blue-6)" />
              <div>
                <Text size="xs" c="dimmed" lh={1}>Questions Count</Text>
                <Text fw={600}>{questions?.length || 0}</Text>
              </div>
            </Group>
          </Group>
        </Card>
      )}

      {/* Existing Questions List */}
      {questions && questions.length > 0 && (
        <Stack gap="md">
          <Title order={4}>Existing Questions ({questions.length})</Title>
          {questions.map((q, index) => (
            <QuestionCard
              key={q.id}
              q={q}
              index={index}
              onEdit={handleStartEdit}
              onDelete={handleDelete}
              editingId={editingId}
              editForm={editForm}
              handleUpdateSubmit={handleUpdateSubmit}
              setEditingId={setEditingId}
              isUpdating={isUpdating}
            />
          ))}
        </Stack>
      )}

      <Divider my="lg" label="Add New Questions" labelPosition="center" />

      {/* Add New Questions Form */}
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="xl">
          {form.values.questions.map((_, qIndex) => (
            <Paper key={qIndex} withBorder p="md" radius="md" bg="gray.0">
              <Group justify="space-between" mb="md">
                <Text fw={600}>New Question #{qIndex + 1}</Text>
                {form.values.questions.length > 1 && (
                  <ActionIcon color="red" variant="subtle" onClick={() => form.removeListItem('questions', qIndex)}>
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
                  align-self="flex-start"
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
    </Stack>
  );
}
