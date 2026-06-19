import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { TreeNode, ExtendedNode } from '../TreeNode';
import { DragDropContext, Droppable } from '@hello-pangea/dnd';
import React from 'react';

const mockSubject: ExtendedNode = {
  id: 'sub-1',
  title: 'React Fundamentals',
  node_type: 'SUBJECT',
  level: 1,
  parent_id: 'course-1',
  sequence_order: 0,
  has_quizzes: false,
  children: [
    {
      id: 'chap-1',
      title: 'Components & Props',
      node_type: 'CHAPTER',
      level: 2,
      parent_id: 'sub-1',
      sequence_order: 0,
      has_quizzes: true,
      children: [],
    },
  ],
};

describe('TreeNode Component', () => {
  it('renders node title and recursively renders children nodes', () => {
    render(
      <DragDropContext onDragEnd={vi.fn()}>
        <Droppable droppableId="root" type="SUBJECT">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              <TreeNode
                node={mockSubject}
                dragHandleProps={null}
                onAddChild={vi.fn()}
                onEdit={vi.fn()}
                onDelete={vi.fn()}
                onManageQuizzes={vi.fn()}
              />
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    );

    expect(screen.getByText('React Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('Components & Props')).toBeInTheDocument();
    expect(screen.getByText('Quiz')).toBeInTheDocument(); // Since chap-1 has quizzes
  });
});
