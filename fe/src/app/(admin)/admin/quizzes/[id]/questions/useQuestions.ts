'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import axios from 'axios';
import {
  useGetAdminQuizzesIdQuestions,
  usePostAdminQuizzesIdQuestions,
  useDeleteAdminQuizzesIdQuestionsQId,
  usePatchAdminQuizzesIdQuestionsQId,
  useGetAdminQuizzes,
} from '@/api/generated/admin-assessment/admin-assessment';
import { QuestionResponse } from '@/api/model/components-schemas-assessment/questionResponse';
import { EditFormValues, AddQuestionFormValues } from './types';

export function useQuestions() {
  const params = useParams();
  const router = useRouter();
  const quizId = params.id as string;
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: questions, isLoading: loadingQuestions, refetch } = useGetAdminQuizzesIdQuestions(quizId);
  const { data: allQuizzes, isLoading: loadingQuizzes } = useGetAdminQuizzes();
  const { mutateAsync: addQuestions, isPending: isAdding } = usePostAdminQuizzesIdQuestions();
  const { mutateAsync: deleteQuestion } = useDeleteAdminQuizzesIdQuestionsQId();
  const { mutateAsync: updateQuestion, isPending: isUpdating } = usePatchAdminQuizzesIdQuestionsQId();

  const currentQuiz = allQuizzes?.find((q) => q.id === quizId);
  const isLoading = loadingQuestions || loadingQuizzes;

  useEffect(() => {
    if (!isLoading && allQuizzes && !currentQuiz) {
      notifications.show({ title: 'Not Found', message: 'The requested quiz does not exist.', color: 'red' });
      router.push('/admin/quizzes');
    }
  }, [isLoading, allQuizzes, currentQuiz, router]);

  const reqVal = (value: string) => (value.trim().length < 1 ? 'Required' : null);

  const form = useForm<AddQuestionFormValues>({
    initialValues: {
      questions: [{
        content: '',
        explanation: '',
        question_type: 'SINGLE',
        answers: [
          { content: '', is_correct: false },
          { content: '', is_correct: false },
        ],
      }],
    },
    validate: {
      questions: {
        content: reqVal,
        answers: { content: reqVal },
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
    if (values.questions.some((q) => !q.answers.some((a) => a.is_correct))) {
      notifications.show({ title: 'Validation Error', message: 'Each question must have at least one correct answer.', color: 'red' });
      return;
    }

    try {
      const payload = {
        questions: values.questions.map((q, idx) => ({
          ...q,
          sequence_order: (questions?.length || 0) + idx,
          question_type: q.question_type as 'SINGLE' | 'MULTIPLE',
        })),
      };
      await addQuestions({ id: quizId, data: payload });
      notifications.show({ title: 'Success', message: 'Questions added successfully', color: 'green' });
      form.reset();
      refetch();
    } catch (error) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : 'Failed to add questions';
      notifications.show({ title: 'Error', message: message || 'Failed to add questions', color: 'red' });
    }
  };

  const editForm = useForm<EditFormValues>({
    initialValues: {
      id: '',
      content: '',
      explanation: '',
      question_type: 'SINGLE',
      sequence_order: 0,
      answers: [{ content: '', is_correct: false }],
    },
    validate: {
      content: reqVal,
      answers: { content: reqVal },
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

  const handleUpdateSubmit = async (values: EditFormValues) => {
    if (!values.answers.some((a) => a.is_correct)) {
      notifications.show({ title: 'Validation Error', message: 'Each question must have at least one correct answer.', color: 'red' });
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
          answers: values.answers.map((a) => ({ content: a.content, is_correct: a.is_correct })),
        },
      });
      notifications.show({ title: 'Success', message: 'Question updated successfully', color: 'green' });
      setEditingId(null);
      refetch();
    } catch (error) {
      const message = axios.isAxiosError(error) ? error.response?.data?.message : 'Failed to update question';
      notifications.show({ title: 'Error', message: message || 'Failed to update question', color: 'red' });
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

  return {
    quizId,
    questions,
    isLoading,
    currentQuiz,
    editingId,
    setEditingId,
    form,
    editForm,
    isAdding,
    isUpdating,
    handleAddQuestion,
    handleAddAnswer,
    handleSubmit,
    handleStartEdit,
    handleUpdateSubmit,
    handleDelete,
    refetch,
  };
}
