import { describe, it, expect } from 'vitest';
import { organizeTree } from '../curriculumUtils';
import { CourseTreeResponse } from '@/api/model/components-schemas-curriculum/courseTreeResponse';

describe('curriculumUtils', () => {
  describe('organizeTree', () => {
    it('returns empty array when tree is undefined', () => {
      expect(organizeTree(undefined)).toEqual([]);
    });

    it('organizes a flat tree into a hierarchical tree', () => {
      const flatTree: CourseTreeResponse[] = [
        {
          id: 'course-root',
          title: 'Course Root',
          node_type: 'COURSE',
          level: 0,
          parent_id: null,
          sequence_order: 0,
          has_quizzes: false,
        },
        {
          id: 'subject-1',
          title: 'Subject 1',
          node_type: 'SUBJECT',
          level: 1,
          parent_id: 'course-root',
          sequence_order: 0,
          has_quizzes: false,
        },
        {
          id: 'chapter-1',
          title: 'Chapter 1',
          node_type: 'CHAPTER',
          level: 2,
          parent_id: 'subject-1',
          sequence_order: 0,
          has_quizzes: false,
        },
        {
          id: 'lesson-1',
          title: 'Lesson 1',
          node_type: 'LESSON',
          level: 3,
          parent_id: 'chapter-1',
          sequence_order: 0,
          has_quizzes: false,
        },
      ];

      const organized = organizeTree(flatTree);
      expect(organized).toHaveLength(1);
      expect(organized[0].id).toBe('subject-1');
      expect(organized[0].children).toHaveLength(1);
      expect(organized[0].children[0].id).toBe('chapter-1');
      expect(organized[0].children[0].children).toHaveLength(1);
      expect(organized[0].children[0].children[0].id).toBe('lesson-1');
    });

    it('sorts nodes by sequence_order', () => {
      const flatTree: CourseTreeResponse[] = [
        {
          id: 'subject-2',
          title: 'Subject 2',
          node_type: 'SUBJECT',
          level: 1,
          parent_id: 'course-root',
          sequence_order: 1,
          has_quizzes: false,
        },
        {
          id: 'subject-1',
          title: 'Subject 1',
          node_type: 'SUBJECT',
          level: 1,
          parent_id: 'course-root',
          sequence_order: 0,
          has_quizzes: false,
        },
      ];

      const organized = organizeTree(flatTree);
      expect(organized).toHaveLength(2);
      expect(organized[0].id).toBe('subject-1');
      expect(organized[1].id).toBe('subject-2');
    });
  });
});
