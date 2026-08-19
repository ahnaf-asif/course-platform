import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { SyllabusSidebar } from '../SyllabusSidebar';
import { ExtendedNode } from '../utils';
import React from 'react';

const mockOrganizedTree: ExtendedNode[] = [
  {
    id: 'sub-1',
    title: 'বাংলা ভাষা ও সাহিত্য',
    level: 1,
    node_type: 'SUBJECT',
    has_quizzes: false,
    children: [
      {
        id: 'chap-1',
        title: '১ম অধ্যায়: প্রাচীন যুগ',
        level: 2,
        parent_id: 'sub-1',
        node_type: 'CHAPTER',
        has_quizzes: false,
        children: [
          {
            id: 'les-1',
            title: 'চর্যাপদের আবিষ্কার ও পরিচয়',
            level: 3,
            parent_id: 'chap-1',
            node_type: 'LESSON',
            progress_status: 'COMPLETED',
            has_quizzes: true,
            video_url: 'https://video.com/1',
            children: [],
            quizzes: [
              {
                id: 'quiz-1',
                title: 'চর্যাপদ কুইজ টেস্ট',
                passing_score: 80,
                is_passed: true,
              },
            ],
          },
          {
            id: 'les-2',
            title: 'চর্যাপদের ভাষা ও ছন্দ',
            level: 3,
            parent_id: 'chap-1',
            node_type: 'LESSON',
            progress_status: 'STARTED',
            has_quizzes: false,
            text_content: 'Reading notes',
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: 'sub-2',
    title: 'ইংরেজি ভাষা ও সাহিত্য',
    level: 1,
    node_type: 'SUBJECT',
    has_quizzes: false,
    children: [
      {
        id: 'chap-2',
        title: 'Noun & Pronoun Mastery',
        level: 2,
        parent_id: 'sub-2',
        node_type: 'CHAPTER',
        has_quizzes: false,
        children: [
          {
            id: 'les-3',
            title: 'Types of Nouns and Classifications',
            level: 3,
            parent_id: 'chap-2',
            node_type: 'LESSON',
            progress_status: null,
            has_quizzes: false,
            children: [],
          },
        ],
      },
    ],
  },
];

describe('SyllabusSidebar Component', () => {
  const mockHandleSelectLesson = vi.fn();
  const mockHandleSelectQuiz = vi.fn();
  const mockSetMobileSidebarOpen = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders progress bar, completion stats, and course syllabus title', () => {
    render(
      <SyllabusSidebar
        organizedTree={mockOrganizedTree}
        selectedLessonId="les-1"
        activeQuizId={null}
        handleSelectLesson={mockHandleSelectLesson}
        handleSelectQuiz={mockHandleSelectQuiz}
        totalSlidesCount={3}
        currentSlideProgressIndex={1}
      />
    );

    expect(screen.getByText('কোর্স সিলেবাস')).toBeInTheDocument();
    expect(screen.getByText(/33% সম্পূর্ণ/i)).toBeInTheDocument();
    expect(screen.getByText(/1 \/ 3 পাঠ সম্পন্ন/i)).toBeInTheDocument();
    expect(screen.getByText('বাংলা ভাষা ও সাহিত্য')).toBeInTheDocument();
    expect(screen.getByText('ইংরেজি ভাষা ও সাহিত্য')).toBeInTheDocument();
  });

  it('auto-expands the subject and chapter containing the selected lesson', () => {
    render(
      <SyllabusSidebar
        organizedTree={mockOrganizedTree}
        selectedLessonId="les-1"
        activeQuizId={null}
        handleSelectLesson={mockHandleSelectLesson}
        handleSelectQuiz={mockHandleSelectQuiz}
        totalSlidesCount={3}
        currentSlideProgressIndex={1}
      />
    );

    // First subject and chapter containing les-1 should be expanded
    expect(screen.getByTestId('lesson-item-les-1')).toBeInTheDocument();
    expect(screen.getByText('চর্যাপদের আবিষ্কার ও পরিচয়')).toBeInTheDocument();
  });

  it('invokes handleSelectLesson when a lesson is clicked', () => {
    render(
      <SyllabusSidebar
        organizedTree={mockOrganizedTree}
        selectedLessonId="les-1"
        activeQuizId={null}
        handleSelectLesson={mockHandleSelectLesson}
        handleSelectQuiz={mockHandleSelectQuiz}
        setMobileSidebarOpen={mockSetMobileSidebarOpen}
        totalSlidesCount={3}
        currentSlideProgressIndex={1}
      />
    );

    const lessonItem = screen.getByTestId('lesson-item-les-2');
    fireEvent.click(lessonItem);

    expect(mockHandleSelectLesson).toHaveBeenCalledWith('les-2');
    expect(mockSetMobileSidebarOpen).toHaveBeenCalledWith(false);
  });

  it('invokes handleSelectQuiz when a quiz is clicked', () => {
    render(
      <SyllabusSidebar
        organizedTree={mockOrganizedTree}
        selectedLessonId="les-1"
        activeQuizId={null}
        handleSelectLesson={mockHandleSelectLesson}
        handleSelectQuiz={mockHandleSelectQuiz}
        totalSlidesCount={3}
        currentSlideProgressIndex={1}
      />
    );

    const quizItem = screen.getByTestId('quiz-item-quiz-1');
    fireEvent.click(quizItem);

    expect(mockHandleSelectQuiz).toHaveBeenCalledWith('les-1', 'quiz-1');
  });

  it('toggles subject and chapter dropdowns on click', () => {
    render(
      <SyllabusSidebar
        organizedTree={mockOrganizedTree}
        selectedLessonId="les-1"
        activeQuizId={null}
        handleSelectLesson={mockHandleSelectLesson}
        handleSelectQuiz={mockHandleSelectQuiz}
        totalSlidesCount={3}
        currentSlideProgressIndex={1}
      />
    );

    const subjectToggle = screen.getByTestId('subject-toggle-sub-2');
    expect(subjectToggle).toBeInTheDocument();

    fireEvent.click(subjectToggle);
  });
});
