import { renderHook, act } from '@testing-library/react';
import { useCurriculumActions } from '../useCurriculumActions';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { notifications } from '@mantine/notifications';
import axios from 'axios';
import { DropResult } from '@hello-pangea/dnd';
import { CourseTreeResponse } from '@/api/model/components-schemas-curriculum/courseTreeResponse';

// Mock mutation hooks
const mockCreateSubject = vi.fn();
const mockUpdateSubject = vi.fn();
const mockDeleteSubject = vi.fn();

const mockCreateChapter = vi.fn();
const mockUpdateChapter = vi.fn();
const mockDeleteChapter = vi.fn();

const mockCreateLesson = vi.fn();
const mockUpdateLesson = vi.fn();
const mockDeleteLesson = vi.fn();

const mockCreateModelTest = vi.fn();
const mockUpdateModelTest = vi.fn();
const mockDeleteModelTest = vi.fn();

vi.mock('@/api/generated/admin-curriculum/admin-curriculum', () => ({
  usePostAdminSubjects: () => ({ mutateAsync: mockCreateSubject, isPending: false }),
  usePatchAdminSubjectsId: () => ({ mutateAsync: mockUpdateSubject, isPending: false }),
  useDeleteAdminSubjectsId: () => ({ mutateAsync: mockDeleteSubject, isPending: false }),
  usePostAdminChapters: () => ({ mutateAsync: mockCreateChapter, isPending: false }),
  usePatchAdminChaptersId: () => ({ mutateAsync: mockUpdateChapter, isPending: false }),
  useDeleteAdminChaptersId: () => ({ mutateAsync: mockDeleteChapter, isPending: false }),
  usePostAdminLessons: () => ({ mutateAsync: mockCreateLesson, isPending: false }),
  usePatchAdminLessonsId: () => ({ mutateAsync: mockUpdateLesson, isPending: false }),
  useDeleteAdminLessonsId: () => ({ mutateAsync: mockDeleteLesson, isPending: false }),
  useCreateModelTest: () => ({ mutateAsync: mockCreateModelTest, isPending: false }),
  useUpdateModelTest: () => ({ mutateAsync: mockUpdateModelTest, isPending: false }),
  useDeleteModelTest: () => ({ mutateAsync: mockDeleteModelTest, isPending: false }),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn(),
  },
}));

vi.mock('axios', async (importOriginal) => {
  const original = await importOriginal<typeof import('axios')>();
  return {
    ...original,
    default: {
      ...original.default,
      isAxiosError: vi.fn(),
    },
    isAxiosError: vi.fn(),
  };
});

describe('useCurriculumActions hook', () => {
  const mockRefetch = vi.fn();
  const mockCloseModal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles submit of a new subject successfully', async () => {
    mockCreateSubject.mockResolvedValue({});
    const props = {
      courseId: 'course-1',
      tree: [],
      refetch: mockRefetch,
      modalType: {
        type: 'SUBJECT' as const,
        action: 'CREATE' as const,
        parentId: null,
        nodeId: null,
      },
      closeModal: mockCloseModal,
    };

    const { result } = renderHook(() => useCurriculumActions(props));

    await act(async () => {
      await result.current.handleSubmit({ title: 'New Subject' });
    });

    expect(mockCreateSubject).toHaveBeenCalledWith({
      data: { title: 'New Subject', parent_id: 'course-1', sequence_order: 0 },
    });
    expect(mockCloseModal).toHaveBeenCalled();
    expect(mockRefetch).toHaveBeenCalled();
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Success',
        color: 'green',
      })
    );
  });

  it('handles submit of a new chapter successfully', async () => {
    mockCreateChapter.mockResolvedValue({});
    const props = {
      courseId: 'course-1',
      tree: [
        { id: 'chap-1', parent_id: 'sub-1', sequence_order: 0 },
      ] as unknown as CourseTreeResponse[],
      refetch: mockRefetch,
      modalType: {
        type: 'CHAPTER' as const,
        action: 'CREATE' as const,
        parentId: 'sub-1',
        nodeId: null,
      },
      closeModal: mockCloseModal,
    };

    const { result } = renderHook(() => useCurriculumActions(props));

    await act(async () => {
      await result.current.handleSubmit({ title: 'New Chapter' });
    });

    expect(mockCreateChapter).toHaveBeenCalledWith({
      data: { title: 'New Chapter', parent_id: 'sub-1', sequence_order: 1 },
    });
    expect(mockCloseModal).toHaveBeenCalled();
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('handles submit of a new lesson successfully', async () => {
    mockCreateLesson.mockResolvedValue({});
    const props = {
      courseId: 'course-1',
      tree: [],
      refetch: mockRefetch,
      modalType: {
        type: 'LESSON' as const,
        action: 'CREATE' as const,
        parentId: 'chap-1',
        nodeId: null,
      },
      closeModal: mockCloseModal,
    };

    const { result } = renderHook(() => useCurriculumActions(props));

    await act(async () => {
      await result.current.handleSubmit({ title: 'New Lesson' });
    });

    expect(mockCreateLesson).toHaveBeenCalledWith({
      data: { title: 'New Lesson', parent_id: 'chap-1', sequence_order: 0 },
    });
    expect(mockCloseModal).toHaveBeenCalled();
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('handles edit of a subject successfully', async () => {
    mockUpdateSubject.mockResolvedValue({});
    const props = {
      courseId: 'course-1',
      tree: [],
      refetch: mockRefetch,
      modalType: {
        type: 'SUBJECT' as const,
        action: 'EDIT' as const,
        parentId: null,
        nodeId: 'sub-1',
      },
      closeModal: mockCloseModal,
    };

    const { result } = renderHook(() => useCurriculumActions(props));

    await act(async () => {
      await result.current.handleSubmit({ title: 'Updated Subject' });
    });

    expect(mockUpdateSubject).toHaveBeenCalledWith({
      id: 'sub-1',
      data: { title: 'Updated Subject' },
    });
    expect(mockCloseModal).toHaveBeenCalled();
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('handles edit of a chapter successfully', async () => {
    mockUpdateChapter.mockResolvedValue({});
    const props = {
      courseId: 'course-1',
      tree: [],
      refetch: mockRefetch,
      modalType: {
        type: 'CHAPTER' as const,
        action: 'EDIT' as const,
        parentId: 'sub-1',
        nodeId: 'chap-1',
      },
      closeModal: mockCloseModal,
    };

    const { result } = renderHook(() => useCurriculumActions(props));

    await act(async () => {
      await result.current.handleSubmit({ title: 'Updated Chapter' });
    });

    expect(mockUpdateChapter).toHaveBeenCalledWith({
      id: 'chap-1',
      data: { title: 'Updated Chapter' },
    });
    expect(mockCloseModal).toHaveBeenCalled();
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('handles submit errors gracefully with axios error message', async () => {
    const errorObj = { response: { data: { message: 'Unique constraint error' } } };
    mockCreateSubject.mockRejectedValue(errorObj);
    vi.mocked(axios.isAxiosError).mockReturnValue(true);

    const props = {
      courseId: 'course-1',
      tree: [],
      refetch: mockRefetch,
      modalType: {
        type: 'SUBJECT' as const,
        action: 'CREATE' as const,
        parentId: null,
        nodeId: null,
      },
      closeModal: mockCloseModal,
    };

    const { result } = renderHook(() => useCurriculumActions(props));

    await act(async () => {
      await result.current.handleSubmit({ title: 'New Subject' });
    });

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        message: 'Unique constraint error',
        color: 'red',
      })
    );
  });

  it('handles submit errors gracefully with generic error', async () => {
    mockCreateSubject.mockRejectedValue(new Error('Unknown Error'));
    vi.mocked(axios.isAxiosError).mockReturnValue(false);

    const props = {
      courseId: 'course-1',
      tree: [],
      refetch: mockRefetch,
      modalType: {
        type: 'SUBJECT' as const,
        action: 'CREATE' as const,
        parentId: null,
        nodeId: null,
      },
      closeModal: mockCloseModal,
    };

    const { result } = renderHook(() => useCurriculumActions(props));

    await act(async () => {
      await result.current.handleSubmit({ title: 'New Subject' });
    });

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        message: 'Failed to save changes',
        color: 'red',
      })
    );
  });

  it('handles delete of a subject successfully', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockDeleteSubject.mockResolvedValue({});
    const props = {
      courseId: 'course-1',
      tree: [],
      refetch: mockRefetch,
      modalType: {
        type: 'SUBJECT' as const,
        action: 'CREATE' as const,
        parentId: null,
        nodeId: null,
      },
      closeModal: mockCloseModal,
    };

    const { result } = renderHook(() => useCurriculumActions(props));

    await act(async () => {
      await result.current.handleDelete('sub-1', 'SUBJECT');
    });

    expect(mockDeleteSubject).toHaveBeenCalledWith({ id: 'sub-1' });
    expect(mockRefetch).toHaveBeenCalled();
    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Deleted',
        color: 'blue',
      })
    );
  });

  it('cancels delete if not confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const props = {
      courseId: 'course-1',
      tree: [],
      refetch: mockRefetch,
      modalType: {
        type: 'SUBJECT' as const,
        action: 'CREATE' as const,
        parentId: null,
        nodeId: null,
      },
      closeModal: mockCloseModal,
    };

    const { result } = renderHook(() => useCurriculumActions(props));

    await act(async () => {
      await result.current.handleDelete('sub-1', 'SUBJECT');
    });

    expect(mockDeleteSubject).not.toHaveBeenCalled();
    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it('handles delete of a chapter and lesson successfully', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockDeleteChapter.mockResolvedValue({});
    mockDeleteLesson.mockResolvedValue({});

    const props = {
      courseId: 'course-1',
      tree: [],
      refetch: mockRefetch,
      modalType: {
        type: 'SUBJECT' as const,
        action: 'CREATE' as const,
        parentId: null,
        nodeId: null,
      },
      closeModal: mockCloseModal,
    };

    const { result } = renderHook(() => useCurriculumActions(props));

    await act(async () => {
      await result.current.handleDelete('chap-1', 'CHAPTER');
    });
    expect(mockDeleteChapter).toHaveBeenCalledWith({ id: 'chap-1' });

    await act(async () => {
      await result.current.handleDelete('les-1', 'LESSON');
    });
    expect(mockDeleteLesson).toHaveBeenCalledWith({ id: 'les-1' });
  });

  it('handles delete errors gracefully', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockDeleteSubject.mockRejectedValue(new Error('Delete error'));

    const props = {
      courseId: 'course-1',
      tree: [],
      refetch: mockRefetch,
      modalType: {
        type: 'SUBJECT' as const,
        action: 'CREATE' as const,
        parentId: null,
        nodeId: null,
      },
      closeModal: mockCloseModal,
    };

    const { result } = renderHook(() => useCurriculumActions(props));

    await act(async () => {
      await result.current.handleDelete('sub-1', 'SUBJECT');
    });

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        message: 'Failed to delete item',
        color: 'red',
      })
    );
  });

  it('ignores drag-and-drop reordering if destination is missing', async () => {
    const props = {
      courseId: 'course-1',
      tree: [],
      refetch: mockRefetch,
      modalType: {
        type: 'SUBJECT' as const,
        action: 'CREATE' as const,
        parentId: null,
        nodeId: null,
      },
      closeModal: mockCloseModal,
    };

    const { result } = renderHook(() => useCurriculumActions(props));

    await act(async () => {
      await result.current.handleDragEnd({ destination: null, source: { droppableId: 'root', index: 0 } } as unknown as DropResult);
    });

    expect(mockUpdateSubject).not.toHaveBeenCalled();
    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it('ignores drag-and-drop reordering if item is dropped in the same position', async () => {
    const props = {
      courseId: 'course-1',
      tree: [],
      refetch: mockRefetch,
      modalType: {
        type: 'SUBJECT' as const,
        action: 'CREATE' as const,
        parentId: null,
        nodeId: null,
      },
      closeModal: mockCloseModal,
    };

    const { result } = renderHook(() => useCurriculumActions(props));

    await act(async () => {
      await result.current.handleDragEnd({
        destination: { droppableId: 'root', index: 0 },
        source: { droppableId: 'root', index: 0 },
      } as unknown as DropResult);
    });

    expect(mockUpdateSubject).not.toHaveBeenCalled();
    expect(mockRefetch).not.toHaveBeenCalled();
  });

  it('handles reordering of subjects successfully', async () => {
    mockUpdateSubject.mockResolvedValue({});
    const props = {
      courseId: 'course-1',
      tree: [
        { id: 'sub-1', parent_id: 'course-1', node_type: 'SUBJECT', sequence_order: 0 },
        { id: 'sub-2', parent_id: 'course-1', node_type: 'SUBJECT', sequence_order: 1 },
      ] as unknown as CourseTreeResponse[],
      refetch: mockRefetch,
      modalType: {
        type: 'SUBJECT' as const,
        action: 'CREATE' as const,
        parentId: null,
        nodeId: null,
      },
      closeModal: mockCloseModal,
    };

    const { result } = renderHook(() => useCurriculumActions(props));

    await act(async () => {
      await result.current.handleDragEnd({
        source: { droppableId: 'root', index: 0 },
        destination: { droppableId: 'root', index: 1 },
      } as unknown as DropResult);
    });

    expect(mockUpdateSubject).toHaveBeenCalledWith({ id: 'sub-1', data: { sequence_order: 1 } });
    expect(mockUpdateSubject).toHaveBeenCalledWith({ id: 'sub-2', data: { sequence_order: 0 } });
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('handles reordering of chapters and lessons successfully', async () => {
    mockUpdateChapter.mockResolvedValue({});
    mockUpdateLesson.mockResolvedValue({});
    const props = {
      courseId: 'course-1',
      tree: [
        { id: 'chap-1', parent_id: 'sub-1', node_type: 'CHAPTER', sequence_order: 0 },
        { id: 'chap-2', parent_id: 'sub-1', node_type: 'CHAPTER', sequence_order: 1 },
        { id: 'les-1', parent_id: 'chap-1', node_type: 'LESSON', sequence_order: 0 },
        { id: 'les-2', parent_id: 'chap-1', node_type: 'LESSON', sequence_order: 1 },
      ] as unknown as CourseTreeResponse[],
      refetch: mockRefetch,
      modalType: {
        type: 'SUBJECT' as const,
        action: 'CREATE' as const,
        parentId: null,
        nodeId: null,
      },
      closeModal: mockCloseModal,
    };

    const { result } = renderHook(() => useCurriculumActions(props));

    // Reorder chapters
    await act(async () => {
      await result.current.handleDragEnd({
        source: { droppableId: 'sub-1', index: 0 },
        destination: { droppableId: 'sub-1', index: 1 },
      } as unknown as DropResult);
    });

    expect(mockUpdateChapter).toHaveBeenCalledWith({ id: 'chap-1', data: { sequence_order: 1 } });
    expect(mockUpdateChapter).toHaveBeenCalledWith({ id: 'chap-2', data: { sequence_order: 0 } });

    // Reorder lessons
    await act(async () => {
      await result.current.handleDragEnd({
        source: { droppableId: 'chap-1', index: 0 },
        destination: { droppableId: 'chap-1', index: 1 },
      } as unknown as DropResult);
    });

    expect(mockUpdateLesson).toHaveBeenCalledWith({ id: 'les-1', data: { sequence_order: 1 } });
    expect(mockUpdateLesson).toHaveBeenCalledWith({ id: 'les-2', data: { sequence_order: 0 } });
  });

  it('handles drag-and-drop reordering errors gracefully', async () => {
    mockUpdateSubject.mockRejectedValue(new Error('Reorder error'));
    const props = {
      courseId: 'course-1',
      tree: [
        { id: 'sub-1', parent_id: 'course-1', node_type: 'SUBJECT', sequence_order: 0 },
        { id: 'sub-2', parent_id: 'course-1', node_type: 'SUBJECT', sequence_order: 1 },
      ] as unknown as CourseTreeResponse[],
      refetch: mockRefetch,
      modalType: {
        type: 'SUBJECT' as const,
        action: 'CREATE' as const,
        parentId: null,
        nodeId: null,
      },
      closeModal: mockCloseModal,
    };

    const { result } = renderHook(() => useCurriculumActions(props));

    await act(async () => {
      await result.current.handleDragEnd({
        source: { droppableId: 'root', index: 0 },
        destination: { droppableId: 'root', index: 1 },
      } as unknown as DropResult);
    });

    expect(notifications.show).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Error',
        message: 'Failed to reorder items',
        color: 'red',
      })
    );
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('handles submit of a new model test successfully', async () => {
    mockCreateModelTest.mockResolvedValue({});
    const props = {
      courseId: 'course-1',
      tree: [],
      refetch: mockRefetch,
      modalType: {
        type: 'MODEL_TEST' as const,
        action: 'CREATE' as const,
        parentId: 'sub-1',
        nodeId: null,
      },
      closeModal: mockCloseModal,
    };

    const { result } = renderHook(() => useCurriculumActions(props));

    await act(async () => {
      await result.current.handleSubmit({
        title: '45th BCS Model Test 1',
        duration_minutes: 60,
        total_marks: 100,
        pass_marks: 40,
        negative_marking_rate: 0.5,
      });
    });

    expect(mockCreateModelTest).toHaveBeenCalledWith({
      data: {
        title: '45th BCS Model Test 1',
        description: '',
        duration_minutes: 60,
        total_marks: 100,
        pass_marks: 40,
        negative_marking_rate: 0.5,
        parent_id: 'sub-1',
        sequence_order: 0,
      },
    });
    expect(mockCloseModal).toHaveBeenCalled();
    expect(mockRefetch).toHaveBeenCalled();
  });

  it('handles edit and delete of a model test successfully', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockUpdateModelTest.mockResolvedValue({});
    mockDeleteModelTest.mockResolvedValue({});

    const props = {
      courseId: 'course-1',
      tree: [],
      refetch: mockRefetch,
      modalType: {
        type: 'MODEL_TEST' as const,
        action: 'EDIT' as const,
        parentId: 'sub-1',
        nodeId: 'mt-1',
      },
      closeModal: mockCloseModal,
    };

    const { result } = renderHook(() => useCurriculumActions(props));

    await act(async () => {
      await result.current.handleSubmit({
        title: 'Updated Model Test Title',
        duration_minutes: 90,
        total_marks: 200,
        pass_marks: 80,
        negative_marking_rate: 0.5,
      });
    });

    expect(mockUpdateModelTest).toHaveBeenCalledWith({
      id: 'mt-1',
      data: {
        title: 'Updated Model Test Title',
        description: undefined,
        duration_minutes: 90,
        total_marks: 200,
        pass_marks: 80,
        negative_marking_rate: 0.5,
      },
    });

    await act(async () => {
      await result.current.handleDelete('mt-1', 'MODEL_TEST');
    });

    expect(mockDeleteModelTest).toHaveBeenCalledWith({ id: 'mt-1' });
  });
});
