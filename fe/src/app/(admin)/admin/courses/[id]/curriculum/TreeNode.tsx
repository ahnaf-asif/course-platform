'use client';

import {
  Box,
  Stack,
  Collapse,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { Droppable, Draggable, DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';
import { CourseTreeResponse } from '@/api/model/components-schemas-curriculum/courseTreeResponse';
import { TreeNodeRow } from './TreeNodeRow';

export type NodeType = 'SUBJECT' | 'CHAPTER' | 'LESSON';

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
