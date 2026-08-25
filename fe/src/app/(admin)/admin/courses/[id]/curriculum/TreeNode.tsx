'use client';

import {
  Box,
  Stack,
  Collapse,
  Paper,
  Text,
  Button,
  Group,
} from '@mantine/core';
import { IconPlus, IconClock } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { Droppable, Draggable, DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';
import { CourseTreeResponse } from '@/api/model/components-schemas-curriculum/courseTreeResponse';
import { TreeNodeRow } from './TreeNodeRow';

export type NodeType = 'SUBJECT' | 'CHAPTER' | 'LESSON' | 'MODEL_TEST';

export interface ExtendedNode extends CourseTreeResponse {
  children: ExtendedNode[];
}

// Helper component to filter out internal transition props from reaching the DOM
/* eslint-disable @typescript-eslint/no-unused-vars */
const SafeCollapseContent = ({
  children,
  in: _in,
  opened: _opened,
  ...props
}: {
  children: React.ReactNode;
  in?: boolean;
  opened?: boolean;
  [key: string]: unknown;
}) => {
  return <div {...(props as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
};
/* eslint-enable @typescript-eslint/no-unused-vars */

interface TreeNodeProps {
  node: ExtendedNode;
  dragHandleProps: DraggableProvidedDragHandleProps | null | undefined;
  onAddChild: (type: NodeType, parentId: string) => void;
  onEdit: (node: ExtendedNode) => void;
  onDelete: (id: string, type: string) => void;
  onManageQuizzes: (id: string, title: string) => void;
}

export function TreeNode({
  node,
  dragHandleProps,
  onAddChild,
  onEdit,
  onDelete,
  onManageQuizzes,
}: TreeNodeProps) {
  const [opened, { toggle }] = useDisclosure(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <Box>
      <TreeNodeRow
        node={node}
        opened={opened}
        toggle={toggle}
        hasChildren={hasChildren}
        dragHandleProps={dragHandleProps}
        onAddChild={onAddChild}
        onEdit={onEdit}
        onDelete={onDelete}
        onManageQuizzes={onManageQuizzes}
      />

      {node.node_type !== 'LESSON' && node.node_type !== 'MODEL_TEST' && (
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

              <Droppable
                droppableId={node.id}
                type={node.node_type === 'SUBJECT' ? 'CHAPTER' : 'LESSON'}
              >
                {(provided) => (
                  <Stack
                    gap={10}
                    pl={35}
                    mt={10}
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {!hasChildren && (
                      <Paper
                        withBorder
                        p="sm"
                        radius="md"
                        style={{
                          borderStyle: 'dashed',
                          borderColor: 'var(--mantine-color-gray-3)',
                          backgroundColor: 'rgba(248, 250, 252, 0.6)',
                        }}
                      >
                        <Group justify="space-between" align="center" wrap="wrap" gap="xs">
                          <Text size="xs" c="dimmed">
                            {node.node_type === 'SUBJECT'
                              ? 'এই বিষয়ের আওতায় কোনো অধ্যায় বা মডেল টেস্ট নেই।'
                              : 'এই অধ্যায়ের আওতায় কোনো লেকচার নেই।'}
                          </Text>
                          <Group gap={6}>
                            {node.node_type === 'SUBJECT' ? (
                              <>
                                <Button
                                  size="xs"
                                  variant="light"
                                  color="orange"
                                  leftSection={<IconPlus size={14} />}
                                  onClick={() => onAddChild('CHAPTER', node.id)}
                                >
                                  Add Chapter
                                </Button>
                                <Button
                                  size="xs"
                                  variant="light"
                                  color="indigo"
                                  leftSection={<IconClock size={14} />}
                                  onClick={() => onAddChild('MODEL_TEST', node.id)}
                                >
                                  Add Model Test
                                </Button>
                              </>
                            ) : node.node_type === 'CHAPTER' ? (
                              <Button
                                size="xs"
                                variant="light"
                                color="teal"
                                leftSection={<IconPlus size={14} />}
                                onClick={() => onAddChild('LESSON', node.id)}
                              >
                                Add Lesson
                              </Button>
                            ) : null}
                          </Group>
                        </Group>
                      </Paper>
                    )}

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
