'use client';

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { useGetCourseTreeBySlug } from '@/api/generated/course/course';
import { NodeType, ExtendedNode } from './TreeNode';
import { useCurriculumActions, CurriculumFormValues } from './useCurriculumActions';
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

  const form = useForm<CurriculumFormValues>({
    initialValues: {
      title: '',
      description: '',
      duration_minutes: 60,
      total_marks: 100,
      pass_marks: 40,
      negative_marking_rate: 0.5,
    },
    validate: {
      title: (value) => (value.length < 3 ? 'Title must be at least 3 characters' : null),
    },
  });

  const {
    creatingSubject,
    creatingChapter,
    creatingLesson,
    creatingModelTest,
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
    initialValues: Partial<CurriculumFormValues> = { title: '' }
  ) => {
    if (type === 'LESSON' && action === 'EDIT') {
      router.push(`/admin/courses/${slug}/curriculum/lesson/${nodeId}`);
      return;
    }
    setModalType({ type, action, parentId, nodeId });
    form.setValues({
      title: initialValues.title || '',
      description: initialValues.description || '',
      duration_minutes: initialValues.duration_minutes ?? 60,
      total_marks: initialValues.total_marks ?? 100,
      pass_marks: initialValues.pass_marks ?? 40,
      negative_marking_rate: initialValues.negative_marking_rate ?? 0.5,
    });
    openModal();
  };

  const handleOpenEditModal = (node: ExtendedNode) => {
    handleOpenModal(node.node_type as NodeType, 'EDIT', node.parent_id, node.id, {
      title: node.title,
      duration_minutes: node.model_test?.duration_minutes,
      total_marks: node.model_test?.total_marks,
      pass_marks: node.model_test?.pass_marks,
      negative_marking_rate: node.model_test?.negative_marking_rate,
    });
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
  };
}
