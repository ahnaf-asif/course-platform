'use client';

import {
  Group,
  Text,
  Box,
  Paper,
  ActionIcon,
  Menu,
  Tooltip,
  Badge,
  Stack,
} from '@mantine/core';
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
  IconClock,
} from '@tabler/icons-react';
import { DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';
import { ExtendedNode, NodeType } from './TreeNode';

interface TreeNodeRowProps {
  node: ExtendedNode;
  opened: boolean;
  toggle: () => void;
  hasChildren: boolean;
  dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
  onAddChild: (type: NodeType, parentId: string) => void;
  onEdit: (node: ExtendedNode) => void;
  onDelete: (id: string, type: string) => void;
  onManageQuizzes: (id: string, title: string) => void;
}

export function TreeNodeRow({
  node,
  opened,
  toggle,
  hasChildren,
  dragHandleProps,
  onAddChild,
  onEdit,
  onDelete,
  onManageQuizzes,
}: TreeNodeRowProps) {
  const typeConfig = {
    SUBJECT: { icon: IconBooks, color: 'blue', label: 'Subject' },
    CHAPTER: { icon: IconFolder, color: 'orange', label: 'Chapter' },
    LESSON: { icon: IconFileText, color: 'teal', label: 'Lesson' },
    MODEL_TEST: { icon: IconClock, color: 'indigo', label: 'Model Test' },
  }[node.node_type as NodeType] || { icon: IconFileText, color: 'gray', label: 'Unknown' };

  const Icon = typeConfig.icon;
  const mainColor = typeConfig.color;
  const isLeafNode = node.node_type === 'LESSON' || node.node_type === 'MODEL_TEST';

  return (
    <Paper
      withBorder
      p={0}
      radius="md"
      shadow="xs"
      style={{
        backgroundColor: node.node_type === 'SUBJECT' ? '#f8fafc' : '#ffffff',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
      }}
    >
      <Group justify="space-between" wrap="nowrap" gap={0}>
        <Group gap="sm" wrap="nowrap" style={{ flex: 1 }} py="xs" px="sm">
          <Tooltip label="Drag to reorder" openDelay={500}>
            <Box
              {...dragHandleProps}
              style={{ cursor: 'grab', color: 'var(--mantine-color-gray-4)', display: 'flex' }}
            >
              <IconGripVertical size={20} />
            </Box>
          </Tooltip>

          {!isLeafNode && (
            <ActionIcon
              variant="subtle"
              size="sm"
              onClick={toggle}
              color={opened ? mainColor : 'gray'}
              aria-label={opened ? 'Collapse' : 'Expand'}
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
                {node.model_test && (
                  <Badge size="xs" variant="outline" color="indigo" radius="sm">
                    ⏱️ {node.model_test.duration_minutes}m • {node.model_test.total_marks} Marks (Neg: -{node.model_test.negative_marking_rate})
                  </Badge>
                )}
                {node.has_quizzes && node.node_type !== 'MODEL_TEST' && (
                  <Badge
                    size="xs"
                    variant="filled"
                    color="grape"
                    radius="sm"
                    leftSection={<IconQuestionMark size={10} />}
                  >
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
                <>
                  <Menu.Item
                    leftSection={<IconPlus size={16} color="var(--mantine-color-orange-6)" />}
                    onClick={() => onAddChild('CHAPTER', node.id)}
                  >
                    Add Chapter
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconClock size={16} color="var(--mantine-color-indigo-6)" />}
                    onClick={() => onAddChild('MODEL_TEST', node.id)}
                  >
                    Add Model Test
                  </Menu.Item>
                </>
              )}
              {node.node_type === 'CHAPTER' && (
                <Menu.Item
                  leftSection={<IconPlus size={16} color="var(--mantine-color-teal-6)" />}
                  onClick={() => onAddChild('LESSON', node.id)}
                >
                  Add Lesson
                </Menu.Item>
              )}

              <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => onEdit(node)}>
                Edit Details
              </Menu.Item>
              <Menu.Item
                leftSection={<IconQuestionMark size={16} />}
                onClick={() => onManageQuizzes(node.id, node.title)}
                color="grape"
              >
                Manage Questions / Quiz
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
  );
}
