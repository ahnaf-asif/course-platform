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
  ActionIcon,
  Menu,
  Box,
  LoadingOverlay,
  Modal,
  TextInput,
  Collapse,
  Paper,
  Tooltip,
  Badge,
  Alert,
} from '@mantine/core';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  IconPlus,
  IconDotsVertical,
  IconEdit,
  IconTrash,
  IconChevronRight,
  IconChevronDown,
  IconBooks,
  IconFolder,
  IconFileText,
  IconGripVertical,
  IconQuestionMark,
  IconLayoutGrid,
  IconAlertCircle,
} from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useState, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult, DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';
import { useGetCourseTreeBySlug } from '@/api/generated/course/course';
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
import axios from 'axios';
import { CourseTreeResponse } from '@/api/model/components-schemas-curriculum/courseTreeResponse';
import { NodeQuizModal } from './NodeQuizModal';

type NodeType = 'SUBJECT' | 'CHAPTER' | 'LESSON';

interface ExtendedNode extends CourseTreeResponse {
  children: ExtendedNode[];
}

export default function CourseCurriculumPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.id as string;

  const { data: tree, isLoading, isError, refetch } = useGetCourseTreeBySlug(slug);

  // Get course ID from the tree (it should be the root node)
  const courseId = useMemo(() => {
    return tree?.find(n => n.node_type === 'COURSE')?.id || '';
  }, [tree]);

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

  const handleSubmit = async (values: typeof form.values) => {
    try {
      const { type, action, parentId, nodeId } = modalType;

      if (action === 'CREATE') {
        const nextOrder = (tree?.filter(n => n.parent_id === parentId).length || 0);
        
        if (type === 'SUBJECT') {
          await createSubject({ data: { title: values.title, parent_id: courseId, sequence_order: nextOrder } });
        } else if (type === 'CHAPTER') {
          await createChapter({ data: { title: values.title, parent_id: parentId!, sequence_order: nextOrder } });
        } else if (type === 'LESSON') {
          await createLesson({ 
            data: { 
              title: values.title, 
              parent_id: parentId!, 
              sequence_order: nextOrder,
            } 
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
        message: `${type.toLowerCase()} ${action === 'CREATE' ? 'created' : 'updated'} successfully`,
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

      notifications.show({ title: 'Deleted', message: `${type} removed successfully`, color: 'blue' });
      refetch();
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to delete item', color: 'red' });
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Find siblings in the same parent
    const parentId = source.droppableId === 'root' ? courseId : source.droppableId;
    const siblings = tree?.filter(n => n.parent_id === parentId)
      .sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0)) || [];

    const newSiblings = [...siblings];
    const [removed] = newSiblings.splice(source.index, 1);
    newSiblings.splice(destination.index, 0, removed);

    try {
      const updates = newSiblings.map((node, index) => {
        if (node.sequence_order !== index) {
          if (node.node_type === 'SUBJECT') return updateSubject({ id: node.id, data: { sequence_order: index } });
          if (node.node_type === 'CHAPTER') return updateChapter({ id: node.id, data: { sequence_order: index } });
          if (node.node_type === 'LESSON') return updateLesson({ id: node.id, data: { sequence_order: index } });
        }
        return null;
      }).filter(Boolean);

      if (updates.length > 0) {
        await Promise.all(updates);
        refetch();
      }
    } catch {
      notifications.show({ title: 'Error', message: 'Failed to reorder items', color: 'red' });
      refetch();
    }
  };

  const organizedTree = useMemo(() => {
    if (!tree) return [];
    
    const map: Record<string, ExtendedNode> = {};
    const roots: ExtendedNode[] = [];

    // First pass: create all nodes and put them in the map
    tree.forEach((node) => {
      map[node.id] = { ...node, children: [] };
    });

    // Second pass: build the hierarchy
    tree.forEach((node) => {
      const mappedNode = map[node.id];
      if (node.level === 1) {
        roots.push(mappedNode);
      }
      if (node.parent_id && map[node.parent_id]) {
        map[node.parent_id].children.push(mappedNode);
      }
    });

    const sortNodes = (nodes: ExtendedNode[]) => {
      nodes.sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0));
      nodes.forEach(n => sortNodes(n.children));
    };
    sortNodes(roots);

    return roots;
  }, [tree]);

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

// Helper component to filter out internal transition props from reaching the DOM
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const SafeCollapseContent = ({ children, in: _in, opened: _opened, ...props }: { children: React.ReactNode; in?: boolean; opened?: boolean; [key: string]: unknown }) => {
  return <div {...(props as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
};

function TreeNode({ 
  node, 
  dragHandleProps,
  onAddChild, 
  onEdit, 
  onDelete,
  onManageQuizzes
}: { 
  node: ExtendedNode; 
  dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
  onAddChild: (type: NodeType, parentId: string) => void;
  onEdit: (node: ExtendedNode) => void;
  onDelete: (id: string, type: string) => void;
  onManageQuizzes: (id: string, title: string) => void;
}) {
  const [opened, { toggle }] = useDisclosure(true);
  const hasChildren = node.children && node.children.length > 0;

  const typeConfig = {
    SUBJECT: { icon: IconBooks, color: 'blue', label: 'Subject' },
    CHAPTER: { icon: IconFolder, color: 'orange', label: 'Chapter' },
    LESSON: { icon: IconFileText, color: 'teal', label: 'Lesson' },
  }[node.node_type as NodeType] || { icon: IconFileText, color: 'gray', label: 'Unknown' };

  const Icon = typeConfig.icon;
  const mainColor = typeConfig.color;

  return (
    <Box>
      <Paper 
        withBorder 
        p={0} 
        radius="md" 
        shadow="xs"
        style={(theme) => ({ 
          backgroundColor: node.node_type === 'SUBJECT' ? theme.colors.gray[0] : 'white',
          overflow: 'hidden',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: theme.colors[mainColor][4],
            transform: 'translateY(-1px)',
          }
        })}
      >
        <Group justify="space-between" wrap="nowrap" gap={0}>
          <Group gap="sm" wrap="nowrap" style={{ flex: 1 }} py="xs" px="sm">
            <Tooltip label="Drag to reorder" openDelay={500}>
              <Box {...dragHandleProps} style={{ cursor: 'grab', color: 'var(--mantine-color-gray-4)', display: 'flex' }}>
                <IconGripVertical size={20} />
              </Box>
            </Tooltip>
            
            {node.node_type !== 'LESSON' && (
              <ActionIcon 
                variant="subtle" 
                size="sm" 
                onClick={toggle} 
                color={hasChildren ? mainColor : 'gray'}
                disabled={!hasChildren}
              >
                {opened ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
              </ActionIcon>
            )}

            <Group gap="xs" wrap="nowrap">
              <Icon size={20} color={`var(--mantine-color-${mainColor}-6)`} />
              <Stack gap={0}>
                <Text fw={node.node_type === 'SUBJECT' ? 700 : 600} size="sm" truncate>
                  {node.title}
                </Text>
                <Group gap={6}>
                  <Badge size="xs" variant="light" color={mainColor} radius="sm">
                    {typeConfig.label}
                  </Badge>
                  {node.has_quizzes && (
                    <Badge size="xs" variant="filled" color="grape" radius="sm" leftSection={<IconQuestionMark size={10} />}>
                      Quiz
                    </Badge>
                  )}
                </Group>
              </Stack>
            </Group>
          </Group>

          <Group gap={8} py="xs" px="sm" wrap="nowrap">
            <Menu shadow="md" width={200} position="bottom-end" withArrow>
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray" size="lg">
                  <IconDotsVertical size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label>Actions</Menu.Label>
                {node.node_type === 'SUBJECT' && (
                  <Menu.Item 
                    leftSection={<IconPlus size={16} color="var(--mantine-color-orange-6)" />} 
                    onClick={() => onAddChild('CHAPTER', node.id)}
                  >
                    Add Chapter
                  </Menu.Item>
                )}
                {node.node_type === 'CHAPTER' && (
                  <Menu.Item 
                    leftSection={<IconPlus size={16} color="var(--mantine-color-teal-6)" />} 
                    onClick={() => onAddChild('LESSON', node.id)}
                  >
                    Add Lesson
                  </Menu.Item>
                )}
                
                <Menu.Item 
                  leftSection={<IconEdit size={16} />} 
                  onClick={() => onEdit(node)}
                >
                  Edit Details
                </Menu.Item>
                <Menu.Item 
                  leftSection={<IconQuestionMark size={16} />} 
                  onClick={() => onManageQuizzes(node.id, node.title)}
                  color="grape"
                >
                  Manage Quizzes
                </Menu.Item>
                
                <Menu.Divider />
                
                <Menu.Label>Danger Zone</Menu.Label>
                <Menu.Item 
                  leftSection={<IconTrash size={16} />} 
                  color="red" 
                  onClick={() => onDelete(node.id, node.node_type)}
                >
                  Delete {typeConfig.label}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </Paper>

      {node.node_type !== 'LESSON' && (
        <Collapse expanded={opened}>
          <SafeCollapseContent>
            <Box style={{ position: 'relative' }}>
              {/* Visual Nesting Line */}
              {hasChildren && (
                <Box
                  style={{
                    position: 'absolute',
                    left: 20,
                    top: 0,
                    bottom: 10,
                    width: 2,
                    backgroundColor: 'var(--mantine-color-gray-1)',
                    borderRadius: 2,
                  }}
                />
              )}
              
              <Droppable droppableId={node.id} type={node.node_type === 'SUBJECT' ? 'CHAPTER' : 'LESSON'}>
                {(provided) => (
                  <Stack gap={10} pl={35} mt={10} {...provided.droppableProps} ref={provided.innerRef}>
                    {node.children.map((child, index) => (
                      <Draggable key={child.id} draggableId={child.id} index={index}>
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
                              node={child} 
                              dragHandleProps={provided.dragHandleProps}
                              onAddChild={onAddChild}
                              onEdit={onEdit}
                              onDelete={onDelete}
                              onManageQuizzes={onManageQuizzes}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </Stack>
                )}
              </Droppable>
            </Box>
          </SafeCollapseContent>
        </Collapse>
      )}
    </Box>
  );
}
