'use client';

import { DropResult } from '@hello-pangea/dnd';
import { notifications } from '@mantine/notifications';
import axios from 'axios';
import {
  usePostAdminSubjects,
  usePatchAdminSubjectsId,
  useDeleteAdminSubjectsId,
  usePostAdminChapters,
  usePatchAdminChaptersId,
  useDeleteAdminChaptersId,
  usePostAdminLessons,
  usePatchAdminLessonsId,
  useDeleteAdminLessonsId,
} from '@/api/generated/admin-curriculum/admin-curriculum';
import { CourseTreeResponse } from '@/api/model/components-schemas-curriculum/courseTreeResponse';
import { NodeType } from './TreeNode';

interface UseCurriculumActionsProps {
  courseId: string;
  tree: CourseTreeResponse[] | undefined;
  refetch: () => void;
  modalType: {
    type: NodeType;
    action: 'CREATE' | 'EDIT';
    parentId: string | null;
    nodeId: string | null;
  };
  closeModal: () => void;
}

export function useCurriculumActions({
  courseId,
  tree,
  refetch,
  modalType,
  closeModal,
}: UseCurriculumActionsProps) {
  // Mutation Hooks
  const { mutateAsync: createSubject, isPending: creatingSubject } = usePostAdminSubjects();
  const { mutateAsync: updateSubject } = usePatchAdminSubjectsId();
  const { mutateAsync: deleteSubject } = useDeleteAdminSubjectsId();

  const { mutateAsync: createChapter, isPending: creatingChapter } = usePostAdminChapters();
  const { mutateAsync: updateChapter } = usePatchAdminChaptersId();
  const { mutateAsync: deleteChapter } = useDeleteAdminChaptersId();

  const { mutateAsync: createLesson, isPending: creatingLesson } = usePostAdminLessons();
  const { mutateAsync: updateLesson } = usePatchAdminLessonsId();
  const { mutateAsync: deleteLesson } = useDeleteAdminLessonsId();

  const handleSubmit = async (values: { title: string }) => {
    try {
      const { type, action, parentId, nodeId } = modalType;

      if (action === 'CREATE') {
        const nextOrder = tree?.filter((n) => n.parent_id === parentId).length || 0;

        if (type === 'SUBJECT') {
          await createSubject({
            data: { title: values.title, parent_id: courseId, sequence_order: nextOrder },
          });
        } else if (type === 'CHAPTER') {
          await createChapter({
            data: { title: values.title, parent_id: parentId!, sequence_order: nextOrder },
          });
        } else if (type === 'LESSON') {
          await createLesson({
            data: {
              title: values.title,
              parent_id: parentId!,
              sequence_order: nextOrder,
            },
          });
        }
      } else {
        if (type === 'SUBJECT') {
          await updateSubject({ id: nodeId!, data: { title: values.title } });
        } else if (type === 'CHAPTER') {
          await updateChapter({ id: nodeId!, data: { title: values.title } });
        }
      }

      notifications.show({
        title: 'Success',
        message: `${type.toLowerCase()} ${
          action === 'CREATE' ? 'created' : 'updated'
        } successfully`,
        color: 'green',
      });
      closeModal();
      refetch();
    } catch (error) {
      let message = 'Failed to save changes';
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || message;
      }
      notifications.show({ title: 'Error', message, color: 'red' });
    }
  };

  const handleDelete = async (id: string, type: string) => {
    if (!window.confirm(`Are you sure you want to delete this ${type.toLowerCase()}?`)) return;

    try {
      if (type === 'SUBJECT') await deleteSubject({ id });
      else if (type === 'CHAPTER') await deleteChapter({ id });
      else if (type === 'LESSON') await deleteLesson({ id });

      notifications.show({
        title: 'Deleted',
        message: `${type} removed successfully`,
        color: 'blue',
      });
      refetch();
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to delete item', color: 'red' });
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index)
      return;

    // Find siblings in the same parent
    const parentId = source.droppableId === 'root' ? courseId : source.droppableId;
    const siblings =
      tree
        ?.filter((n) => n.parent_id === parentId)
        .sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0)) || [];

    const newSiblings = [...siblings];
    const [removed] = newSiblings.splice(source.index, 1);
    newSiblings.splice(destination.index, 0, removed);

    try {
      const updates = newSiblings
        .map((node, index) => {
          if (node.sequence_order !== index) {
            if (node.node_type === 'SUBJECT')
              return updateSubject({ id: node.id, data: { sequence_order: index } });
            if (node.node_type === 'CHAPTER')
              return updateChapter({ id: node.id, data: { sequence_order: index } });
            if (node.node_type === 'LESSON')
              return updateLesson({ id: node.id, data: { sequence_order: index } });
          }
          return null;
        })
        .filter(Boolean);

      if (updates.length > 0) {
        await Promise.all(updates);
        refetch();
      }
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to reorder items', color: 'red' });
      refetch();
    }
  };

  return {
    creatingSubject,
    creatingChapter,
    creatingLesson,
    handleSubmit,
    handleDelete,
    handleDragEnd,
  };
}
