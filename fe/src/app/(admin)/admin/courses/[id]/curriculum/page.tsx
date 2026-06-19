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
import { TreeNode, NodeType } from './TreeNode';
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
    modalOpened,
    closeModal,
    modalType,
    quizModalOpened,
    closeQuizModal,
    activeNode,
    form,
    handleOpenModal,
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
                          onEdit={(node) => handleOpenModal(node.node_type as NodeType, 'EDIT', node.parent_id, node.id, {
                            title: node.title,
                          })}
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
              <Text size="sm" color="dimmed">Organize your course into subjects, chapters, and lessons.</Text>
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
        title={`${modalType.action === 'CREATE' ? 'Create' : 'Edit'} ${modalType.type.toLowerCase()}`}
        centered
        overlayProps={{ blur: 3 }}
        radius="md"
        size="lg"
      >
        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              label="Display Title"
              placeholder={`e.g. ${modalType.type === 'SUBJECT' ? 'Introduction to Web Development' : modalType.type === 'CHAPTER' ? 'Getting Started with HTML' : 'Building Your First Page'}`}
              required
              {...form.getInputProps('title')}
            />

            <Group justify="flex-end" mt="xl">
              <Button variant="subtle" onClick={closeModal} color="gray">Cancel</Button>
              <Button type="submit" loading={creatingSubject || creatingChapter || creatingLesson}>
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
