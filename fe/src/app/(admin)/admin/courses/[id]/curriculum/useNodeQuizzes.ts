'use client';

import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import axios from 'axios';
import {
  useGetAdminQuizzes,
  useGetAdminNodesIdQuizzes,
  usePostAdminNodesIdQuizzes,
  useDeleteAdminNodesIdQuizzesQuizId,
  usePostAdminQuizzes,
} from '@/api/generated/admin-assessment/admin-assessment';

export function useNodeQuizzes(nodeId: string) {
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
      const quiz = await createQuiz({
        data: {
          title: newQuizTitle.trim(),
          passing_score: 80,
        },
      });

      await attachQuiz({ id: nodeId, data: { quiz_id: quiz.id } });

      notifications.show({
        title: 'Success',
        message: 'Quiz created and linked successfully',
        color: 'green',
      });

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
    ?.filter((q) => !linkedQuizzes?.some((l) => l.id === q.id))
    ?.map((q) => ({ value: q.id, label: q.title })) || [];

  return {
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
  };
}
