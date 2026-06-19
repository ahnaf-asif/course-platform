'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { useGetCourseTreeBySlug } from '@/api/generated/course/course';
import { NodeType } from './TreeNode';
import { useCurriculumActions } from './useCurriculumActions';
import { organizeTree } from './curriculumUtils';

export function useCurriculum() {
  const params = useParams();
  const router = useRouter();
  const slug = params.id as string;

  const { data: tree, isLoading, isError, refetch } = useGetCourseTreeBySlug(slug);

  // Get course ID from the tree (it should be the root node)
  const courseId = useMemo(() => {
    return tree?.find((n) => n.node_type === 'COURSE')?.id || '';
  }, [tree]);

  // Modal States
  const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
  const [modalType, setModalType] = useState<{
    type: NodeType;
    action: 'CREATE' | 'EDIT';
    parentId: string | null;
    nodeId: string | null;
  }>({ type: 'SUBJECT', action: 'CREATE', parentId: null, nodeId: null });

  // Quiz Modal State
  const [quizModalOpened, { open: openQuizModal, close: closeQuizModal }] = useDisclosure(false);
  const [activeNode, setActiveNode] = useState<{ id: string; title: string } | null>(null);

  const form = useForm({
    initialValues: {
      title: '',
    },
    validate: {
      title: (value) => (value.length < 3 ? 'Title must be at least 3 characters' : null),
    },
  });

  const {
    creatingSubject,
    creatingChapter,
    creatingLesson,
    handleSubmit,
    handleDelete,
    handleDragEnd,
  } = useCurriculumActions({
    courseId,
    tree,
    refetch,
    modalType,
    closeModal,
  });

  const handleOpenModal = (
    type: NodeType,
    action: 'CREATE' | 'EDIT',
    parentId: string | null = null,
    nodeId: string | null = null,
    initialValues = { title: '' }
  ) => {
    if (type === 'LESSON' && action === 'EDIT') {
      router.push(`/admin/courses/${slug}/curriculum/lesson/${nodeId}`);
      return;
    }
    setModalType({ type, action, parentId, nodeId });
    form.setValues(initialValues);
    openModal();
  };

  const handleOpenQuizModal = (id: string, title: string) => {
    setActiveNode({ id, title });
    openQuizModal();
  };

  const organizedTree = useMemo(() => {
    return organizeTree(tree);
  }, [tree]);

  return {
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
  };
}
