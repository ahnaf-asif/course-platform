'use client';

import {
  Title,
  Text,
  Breadcrumbs,
  Anchor,
  Stack,
  Button,
  Group,
  Card,
  LoadingOverlay,
  Modal,
  TextInput,
  NumberInput,
  Textarea,
  SimpleGrid,
  Alert,
} from '@mantine/core';
import Link from 'next/link';
import {
  IconPlus,
  IconBooks,
  IconLayoutGrid,
  IconAlertCircle,
} from '@tabler/icons-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useCurriculum } from './useCurriculum';
import { TreeNode } from './TreeNode';
import { NodeQuizModal } from './NodeQuizModal';

export default function CourseCurriculumPage() {
  const {
    slug,
    isLoading,
    isError,
    refetch,
    courseId,
    creatingSubject,
    creatingChapter,
    creatingLesson,
    creatingModelTest,
    modalOpened,
    closeModal,
    modalType,
    quizModalOpened,
    closeQuizModal,
    activeNode,
    form,
    handleOpenModal,
    handleOpenEditModal,
    handleOpenQuizModal,
    handleSubmit,
    handleDelete,
    handleDragEnd,
    organizedTree,
  } = useCurriculum();

  return (
    <Stack gap="xl" pos="relative" pb={50}>
      <LoadingOverlay visible={isLoading} overlayProps={{ blur: 1 }} loaderProps={{ type: 'bars' }} />

      <Group justify="space-between" align="center">
        <Stack gap={5}>
          <Breadcrumbs>
            <Anchor component={Link} href="/admin/courses" size="sm">
              Courses
            </Anchor>
            <Text color="dimmed" size="sm">Curriculum Editor</Text>
          </Breadcrumbs>
          <Title order={2}>Manage Content</Title>
        </Stack>
        <Group>
          <Button 
            variant="outline"
            leftSection={<IconLayoutGrid size={18} />}
            component={Link}
            href={`/courses/s/${slug}`}
            target="_blank"
            disabled={!slug}
          >
            Preview Course
          </Button>
          <Button 
            leftSection={<IconPlus size={18} />} 
            onClick={() => handleOpenModal('SUBJECT', 'CREATE', courseId)}
            disabled={!courseId}
          >
            Add New Subject
          </Button>
        </Group>
      </Group>

      {isError ? (
        <Alert icon={<IconAlertCircle size={16} />} title="Error" color="red" variant="light">
          Failed to load curriculum. The course might have been renamed or removed.
          <Group mt="md">
            <Button variant="outline" size="xs" onClick={() => refetch()}>Try Again</Button>
            <Button variant="subtle" size="xs" component={Link} href="/admin/courses">Back to Courses</Button>
          </Group>
        </Alert>
      ) : organizedTree.length > 0 ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="root" type="SUBJECT">
            {(provided) => (
              <Stack gap="lg" {...provided.droppableProps} ref={provided.innerRef}>
                {organizedTree.map((subject, index) => (
                  <Draggable key={subject.id} draggableId={subject.id} index={index}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef} 
                        {...provided.draggableProps}
                        style={{
                          ...provided.draggableProps.style,
                          opacity: snapshot.isDragging ? 0.8 : 1,
                        }}
                      >
                        <TreeNode 
                          node={subject} 
                          dragHandleProps={provided.dragHandleProps}
                          onAddChild={(type, parentId) => handleOpenModal(type, 'CREATE', parentId)}
                          onEdit={handleOpenEditModal}
                          onDelete={handleDelete}
                          onManageQuizzes={handleOpenQuizModal}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </Stack>
            )}
          </Droppable>
        </DragDropContext>
      ) : !isLoading ? (
        <Card withBorder padding="xl" radius="md" style={{ borderStyle: 'dashed', borderWidth: 2 }}>
          <Stack align="center" gap="md" py={40}>
            <IconBooks size={48} color="var(--mantine-color-gray-4)" />
            <div style={{ textAlign: 'center' }}>
              <Text fw={600} size="lg">Your curriculum is empty</Text>
              <Text size="sm" color="dimmed">Organize your course into subjects, chapters, lessons, and model tests.</Text>
            </div>
            <Button size="md" onClick={() => handleOpenModal('SUBJECT', 'CREATE', courseId)} disabled={!courseId}>
              Add Your First Subject
            </Button>
          </Stack>
        </Card>
      ) : null}

      <Modal 
        opened={modalOpened} 
        onClose={closeModal} 
        title={`${modalType.action === 'CREATE' ? 'Create' : 'Edit'} ${modalType.type.replace('_', ' ').toLowerCase()}`}
        centered
        overlayProps={{ blur: 3 }}
        radius="md"
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Display Title"
              placeholder={`e.g. ${
                modalType.type === 'SUBJECT'
                  ? 'Introduction to Web Development'
                  : modalType.type === 'CHAPTER'
                  ? 'Getting Started with HTML'
                  : modalType.type === 'MODEL_TEST'
                  ? 'BCS Preliminary Live Model Test 01'
                  : 'Building Your First Page'
              }`}
              required
              {...form.getInputProps('title')}
            />

            {modalType.type === 'MODEL_TEST' && (
              <>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <NumberInput
                    label="Duration (Minutes)"
                    description="Countdown clock limit"
                    min={1}
                    max={300}
                    required
                    {...form.getInputProps('duration_minutes')}
                  />
                  <NumberInput
                    label="Total Marks"
                    description="Maximum possible score"
                    min={1}
                    required
                    {...form.getInputProps('total_marks')}
                  />
                  <NumberInput
                    label="Pass Marks"
                    description="Score required to pass"
                    min={0}
                    required
                    {...form.getInputProps('pass_marks')}
                  />
                  <NumberInput
                    label="Negative Mark per Wrong MCQ"
                    description="Penalty per incorrect answer (e.g. 0.50)"
                    min={0}
                    step={0.25}
                    decimalScale={2}
                    required
                    {...form.getInputProps('negative_marking_rate')}
                  />
                </SimpleGrid>
                <Textarea
                  label="Instructions / Description (Optional)"
                  placeholder="Exam instructions for students..."
                  rows={3}
                  {...form.getInputProps('description')}
                />
              </>
            )}

            <Group justify="flex-end" mt="xl">
              <Button variant="subtle" onClick={closeModal} color="gray">Cancel</Button>
              <Button type="submit" loading={creatingSubject || creatingChapter || creatingLesson || creatingModelTest}>
                {modalType.action === 'CREATE' ? 'Create' : 'Save Changes'}
              </Button>
            </Group>
          </Stack>
        </form>
      </Modal>

      {activeNode && (
        <NodeQuizModal
          opened={quizModalOpened}
          onClose={closeQuizModal}
          nodeId={activeNode.id}
          nodeTitle={activeNode.title}
        />
      )}
    </Stack>
  );
}
