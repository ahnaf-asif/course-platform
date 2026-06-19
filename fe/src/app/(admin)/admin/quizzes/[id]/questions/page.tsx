'use client';

import {
  Title,
  Text,
  Stack,
  Group,
  Button,
  Card,
  Divider,
  Breadcrumbs,
  Anchor,
} from '@mantine/core';
import {
  IconChevronLeft,
  IconLoader2,
  IconUpload,
  IconChecklist,
  IconInfoCircle,
} from '@tabler/icons-react';
import Link from 'next/link';
import React from 'react';
import { useQuestions } from './useQuestions';
import { useBulkUpload } from './useBulkUpload';
import { QuestionCard } from './QuestionCard';
import { BulkUploadModal } from './BulkUploadModal';
import { AddQuestionForm } from './AddQuestionForm';

export default function QuestionManagement() {
  const {
    quizId,
    questions,
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
  } = useQuestions();

  const {
    uploadStatus,
    uploadModalOpened,
    openUploadModal,
    closeUploadModal,
    copied,
    handleDownloadSample,
    handleCopyAIPrompt,
    handleBulkUpload,
  } = useBulkUpload({ quizId, refetch });

  return (
    <Stack gap="lg" pos="relative">
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
          <Group justify="space-between" align="center">
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

            <Group>
              {uploadStatus === 'processing' ? (
                <Group gap="xs">
                  <IconLoader2 size={16} className="animate-spin" color="var(--mantine-color-blue-6)" />
                  <Text size="sm" fw={500} c="blue">Processing CSV Upload...</Text>
                </Group>
              ) : (
                <Button variant="light" color="grape" leftSection={<IconUpload size={16} />} onClick={openUploadModal}>
                  Bulk Upload CSV
                </Button>
              )}
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
      <AddQuestionForm
        form={form}
        handleAddQuestion={handleAddQuestion}
        handleAddAnswer={handleAddAnswer}
        handleSubmit={handleSubmit}
        isAdding={isAdding}
      />

      <BulkUploadModal
        opened={uploadModalOpened}
        onClose={closeUploadModal}
        handleDownloadSample={handleDownloadSample}
        handleCopyAIPrompt={handleCopyAIPrompt}
        handleBulkUpload={handleBulkUpload}
        copied={copied}
      />
    </Stack>
  );
}
