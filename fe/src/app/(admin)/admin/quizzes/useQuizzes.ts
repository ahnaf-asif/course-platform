'use client';

import { useState } from 'react';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import axios from 'axios';
import {
  useGetAdminQuizzes,
  usePostAdminQuizzes,
  usePatchAdminQuizzesId,
  useDeleteAdminQuizzesId,
} from '@/api/generated/admin-assessment/admin-assessment';
import { CreateQuizRequest } from '@/api/model/components-schemas-assessment/createQuizRequest';
import { QuizResponse } from '@/api/model/components-schemas-assessment/quizResponse';

export function useQuizzes() {
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

  return {
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
  };
}
