import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useGetCourseBySlug, useGetCourseTreeBySlug } from '@/api/generated/course/course';
import { useCheckAccess, useGetUserLesson } from '@/api/generated/commerce/commerce';
import { useGetMe } from '@/api/generated/user/user';
import {
  useStudentListQuizzesByNode,
  useStudentGetQuizQuestions,
  useStudentSubmitQuizAttempt,
  useStudentListQuizAttempts,
  useStudentGetAttemptDetails,
} from '@/api/generated/assessment/assessment';
import { useStudentUpsertProgress } from '@/api/generated/curriculum/curriculum';
import { SubmitQuizResponse } from '@/api/model/components-schemas-assessment/submitQuizResponse';
import { ExtendedNode } from './utils';

export function useCoursePlayer() {
  const router = useRouter();
  const { slug } = useParams() as { slug: string };
  const searchParams = useSearchParams();

  const urlNodeId = searchParams ? (searchParams.get('nodeId') || searchParams.get('node') || searchParams.get('lessonId')) : null;
  const urlQuizId = searchParams ? (searchParams.get('quizId') || searchParams.get('quiz')) : null;
  const urlSlide = searchParams ? searchParams.get('slide') : null;

  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [currentSubSlideIndex, setCurrentSubSlideIndex] = useState<number>(0);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const { data: user, isLoading: isLoadingUser } = useGetMe();
  const { data: course, isLoading: isLoadingCourse } = useGetCourseBySlug(slug);
  const { data: accessData, isLoading: isLoadingAccess } = useCheckAccess(slug, {
    query: {
      enabled: !!user && !!course?.id,
    },
  });

  const { data: tree, isLoading: isLoadingTree, refetch: refetchTree } = useGetCourseTreeBySlug(slug, {
    query: {
      enabled: !!course?.slug,
    },
  });

  const currentTreeNode = useMemo(() => {
    return tree?.find((node) => node.id === selectedLessonId);
  }, [tree, selectedLessonId]);

  // Fetch full lesson details when selected (only for LESSON nodes, not MODEL_TEST)
  const isLessonNode = !currentTreeNode || currentTreeNode.node_type === 'LESSON';
  const { data: lessonDetails, isLoading: isLoadingLesson } = useGetUserLesson(selectedLessonId || '', {
    query: {
      enabled: !!selectedLessonId && isLessonNode,
    },
  });

  // Fetch quizzes linked to this lesson node
  const { data: quizzesData, isLoading: isLoadingQuizzes } = useStudentListQuizzesByNode(selectedLessonId || '', {
    query: {
      enabled: !!selectedLessonId,
    },
  });

  // Quiz states
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<SubmitQuizResponse | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<string, string[]>>({});
  const [isAttempting, setIsAttempting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Past attempt review loading state
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);

  const { data: attemptDetailsData, isLoading: isLoadingAttemptDetails } = useStudentGetAttemptDetails(
    selectedAttemptId || '',
    {
      query: {
        enabled: !!selectedAttemptId,
      },
    }
  );

  useEffect(() => {
    if (attemptDetailsData) {
      const timer = setTimeout(() => {
        setActiveAttempt(attemptDetailsData);
        setSelectedAttemptId(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [attemptDetailsData]);

  const effectiveQuizId = useMemo(() => {
    if (activeQuizId) return activeQuizId;
    if (quizzesData && quizzesData.length > 0) return quizzesData[0].id;
    return '';
  }, [activeQuizId, quizzesData]);

  // Fetch attempts history for active quiz or linked quiz
  const { data: attemptsData, refetch: refetchAttempts, isLoading: isLoadingAttempts } = useStudentListQuizAttempts(
    effectiveQuizId,
    {
      query: {
        enabled: !!effectiveQuizId,
      },
    }
  );

  // Fetch active quiz questions
  const { data: questionsData, isLoading: isLoadingQuestions } = useStudentGetQuizQuestions(effectiveQuizId, {
    query: {
      enabled: !!effectiveQuizId && (isAttempting || currentTreeNode?.node_type === 'MODEL_TEST'),
    },
  });

  const submitAttemptMutation = useStudentSubmitQuizAttempt();
  const upsertProgressMutation = useStudentUpsertProgress();

  const updateProgress = useCallback(async (nodeId: string, status: 'STARTED' | 'COMPLETED') => {
    try {
      await upsertProgressMutation.mutateAsync({
        id: nodeId,
        data: { status },
      });
      refetchTree();
    } catch (err) {
      console.error('Failed to update progress:', err);
    }
  }, [upsertProgressMutation, refetchTree]);

  useEffect(() => {
    if (
      selectedLessonId &&
      currentTreeNode &&
      currentTreeNode.node_type === 'LESSON' &&
      !currentTreeNode.progress_status
    ) {
      updateProgress(selectedLessonId, 'STARTED');
    }
  }, [selectedLessonId, currentTreeNode, updateProgress]);

  const resetQuizStates = useCallback((nextQuizId: string | null = null) => {
    setActiveQuizId(nextQuizId);
    setActiveAttempt(null);
    setSelectedAttemptId(null);
    setUserAnswers({});
    setIsAttempting(false);
    setCurrentQuestionIndex(0);
  }, []);

  const organizedTree = useMemo(() => {
    if (!tree) return [];
    const map: Record<string, ExtendedNode> = {};
    const roots: ExtendedNode[] = [];
    tree.forEach((node) => {
      map[node.id] = { ...node, children: [] };
    });
    tree.forEach((node) => {
      const mappedNode = map[node.id];
      if (node.level === 1) roots.push(mappedNode);
      if (node.parent_id && map[node.parent_id]) map[node.parent_id].children.push(mappedNode);
    });
    return roots.sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0));
  }, [tree]);

  // Set default selected lesson or restore from URL
  useEffect(() => {
    if (organizedTree.length > 0 && !selectedLessonId) {
      // 1. If nodeId is in URL and exists in tree, restore it
      if (urlNodeId) {
        const matchingNode = tree?.find((n) => n.id === urlNodeId);
        if (matchingNode) {
          const timer = setTimeout(() => {
            setSelectedLessonId(urlNodeId);
            if (urlQuizId) {
              setActiveQuizId(urlQuizId);
            }
          }, 0);
          return () => clearTimeout(timer);
        }
      }

      // 2. Otherwise find the first lesson in the tree
      for (const subject of organizedTree) {
        for (const chapter of subject.children) {
          if (chapter.children.length > 0) {
            const firstLessonId = chapter.children[0].id;
            const timer = setTimeout(() => {
              setSelectedLessonId(firstLessonId);
            }, 0);
            return () => clearTimeout(timer);
          }
        }
      }
    }
  }, [organizedTree, selectedLessonId, tree, urlNodeId, urlQuizId]);

  // Flat lessons list
  const flatLessons = useMemo(() => {
    const list: {
      id: string;
      title: string;
      video_url?: string | null;
      text_content?: string | null;
      has_quizzes?: boolean;
    }[] = [];
    const traverse = (nodes: ExtendedNode[]) => {
      const sorted = [...nodes].sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0));
      for (const node of sorted) {
        if (node.node_type === 'LESSON' || node.node_type === 'MODEL_TEST') {
          list.push({
            id: node.id,
            title: node.title,
            video_url: node.video_url,
            text_content: node.text_content,
            has_quizzes: node.has_quizzes,
          });
        }
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      }
    };
    traverse(organizedTree);
    return list;
  }, [organizedTree]);

  const currentLessonIndex = useMemo(() => {
    return flatLessons.findIndex((l) => l.id === selectedLessonId);
  }, [flatLessons, selectedLessonId]);

  const prevLesson = currentLessonIndex > 0 ? flatLessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex < flatLessons.length - 1 ? flatLessons[currentLessonIndex + 1] : null;

  // Dynamically compute active sub-slides based on the fetched lesson details and quizzes
  const activeSubSlides = useMemo<('video' | 'text' | 'quiz')[]>(() => {
    if (!lessonDetails) return ['text']; // default fallback
    const slides: ('video' | 'text' | 'quiz')[] = [];
    if (lessonDetails.video_url) slides.push('video');
    if (lessonDetails.text_content) slides.push('text');
    if (quizzesData && quizzesData.length > 0) {
      slides.push('quiz');
    }
    if (slides.length === 0) slides.push('text');
    return slides;
  }, [lessonDetails, quizzesData]);

  const activeSlideType = activeSubSlides[currentSubSlideIndex] || 'text';
  const isVideoSlide = activeSlideType === 'video';

  // Restore slide from URL if specified on initial load
  useEffect(() => {
    if (urlSlide && activeSubSlides.length > 0) {
      const slideIdx = activeSubSlides.indexOf(urlSlide as ('video' | 'text' | 'quiz'));
      if (slideIdx !== -1 && currentSubSlideIndex !== slideIdx) {
        const timer = setTimeout(() => {
          setCurrentSubSlideIndex(slideIdx);
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [urlSlide, activeSubSlides, currentSubSlideIndex]);

  // Update browser URL query parameters seamlessly without reloading the page
  const updateUrl = useCallback(
    (nodeId: string | null, quizId: string | null = null, slide?: string | null) => {
      if (typeof window === 'undefined' || !nodeId) return;
      const params = new URLSearchParams(window.location.search);
      params.set('nodeId', nodeId);
      if (quizId) {
        params.set('quizId', quizId);
      } else {
        params.delete('quizId');
        params.delete('quiz');
      }
      if (slide && slide !== 'text') {
        params.set('slide', slide);
      } else {
        params.delete('slide');
      }
      const queryString = params.toString();
      const newRelativePathQuery = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
      window.history.replaceState(null, '', newRelativePathQuery);
    },
    []
  );

  // Synchronize URL on lesson/quiz/slide changes
  useEffect(() => {
    if (selectedLessonId) {
      updateUrl(selectedLessonId, activeQuizId, activeSlideType);
    }
  }, [selectedLessonId, activeQuizId, activeSlideType, updateUrl]);

  // Auto-select quiz if there is only one quiz for this lesson
  useEffect(() => {
    if (activeSlideType === 'quiz' && quizzesData && quizzesData.length === 1 && !activeQuizId) {
      const timer = setTimeout(() => {
        setActiveQuizId(quizzesData[0].id);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [activeSlideType, quizzesData, activeQuizId]);

  // Compute slide counts for progress bar
  const totalSlidesCount = useMemo(() => {
    let count = 0;
    for (const l of flatLessons) {
      const hasVideo = !!l.video_url;
      const hasText = !!l.text_content;
      const hasQuiz = !!l.has_quizzes;

      let subSlides = 0;
      if (hasVideo) subSlides++;
      if (hasText) subSlides++;
      if (hasQuiz) subSlides++;

      if (subSlides === 0) {
        count += 1;
      } else {
        count += subSlides;
      }
    }
    return count;
  }, [flatLessons]);

  const currentSlideProgressIndex = useMemo(() => {
    if (currentLessonIndex === -1) return 0;
    let progressCount = 0;

    for (let i = 0; i < currentLessonIndex; i++) {
      const l = flatLessons[i];
      const hasVideo = !!l.video_url;
      const hasText = !!l.text_content;
      const hasQuiz = !!l.has_quizzes;

      let subSlides = 0;
      if (hasVideo) subSlides++;
      if (hasText) subSlides++;
      if (hasQuiz) subSlides++;

      if (subSlides === 0) {
        progressCount += 1;
      } else {
        progressCount += subSlides;
      }
    }

    progressCount += currentSubSlideIndex + 1;
    return progressCount;
  }, [flatLessons, currentLessonIndex, currentSubSlideIndex]);

  const handlePrev = () => {
    if (currentSubSlideIndex > 0) {
      setCurrentSubSlideIndex(currentSubSlideIndex - 1);
    } else if (prevLesson) {
      const prevSlides: ('video' | 'text' | 'quiz')[] = [];
      const prevHasVideo = !!prevLesson.video_url;
      const prevHasText = !!prevLesson.text_content;
      const prevHasQuiz = !!prevLesson.has_quizzes;

      if (prevHasVideo) prevSlides.push('video');
      if (prevHasText) prevSlides.push('text');
      if (prevHasQuiz) prevSlides.push('quiz');
      if (prevSlides.length === 0) prevSlides.push('text');

      setSelectedLessonId(prevLesson.id);
      setCurrentSubSlideIndex(prevSlides.length - 1);
      resetQuizStates(null);
    }
  };

  const handleNext = () => {
    if (currentSubSlideIndex < activeSubSlides.length - 1) {
      setCurrentSubSlideIndex(currentSubSlideIndex + 1);
    } else if (nextLesson) {
      setSelectedLessonId(nextLesson.id);
      setCurrentSubSlideIndex(0);
      resetQuizStates(null);
    }
  };

  const handleSelectLesson = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setCurrentSubSlideIndex(0);
    resetQuizStates(null);
  };

  const handleSelectQuiz = (lessonId: string, quizId: string) => {
    if (selectedLessonId === lessonId) {
      resetQuizStates(quizId);
      const quizIndex = activeSubSlides.indexOf('quiz');
      if (quizIndex !== -1) {
        setCurrentSubSlideIndex(quizIndex);
      }
    } else {
      setSelectedLessonId(lessonId);
      setCurrentSubSlideIndex(0);
      resetQuizStates(quizId);
    }
  };

  // Redirect if no access
  useEffect(() => {
    if (!isLoadingAccess && accessData && !accessData.has_access) {
      router.push(`/courses/s/${slug}`);
    }
  }, [isLoadingAccess, accessData, slug, router]);

  return {
    slug,
    selectedLessonId,
    setSelectedLessonId,
    currentSubSlideIndex,
    setCurrentSubSlideIndex,
    mobileSidebarOpen,
    setMobileSidebarOpen,
    user,
    isLoadingUser,
    course,
    isLoadingCourse,
    accessData,
    isLoadingAccess,
    tree,
    isLoadingTree,
    refetchTree,
    lessonDetails,
    isLoadingLesson,
    quizzesData,
    isLoadingQuizzes,
    activeQuizId,
    setActiveQuizId,
    activeAttempt,
    setActiveAttempt,
    userAnswers,
    setUserAnswers,
    isAttempting,
    setIsAttempting,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    attemptsData,
    isLoadingAttempts,
    refetchAttempts,
    questionsData,
    isLoadingQuestions,
    submitAttemptMutation,
    selectedAttemptId,
    setSelectedAttemptId,
    isLoadingAttemptDetails,
    upsertProgressMutation,
    currentTreeNode,
    updateProgress,
    organizedTree,
    flatLessons,
    currentLessonIndex,
    prevLesson,
    nextLesson,
    activeSubSlides,
    activeSlideType,
    isVideoSlide,
    totalSlidesCount,
    currentSlideProgressIndex,
    handlePrev,
    handleNext,
    handleSelectLesson,
    handleSelectQuiz,
  };
}
