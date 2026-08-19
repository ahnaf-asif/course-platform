'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Button, Divider, Stack, Text, Title, Alert } from '@mantine/core';
import { IconCheck, IconAlertTriangle } from '@tabler/icons-react';
import { MathJaxContent } from '@/components/MathJaxContent';
import { WatermarkOverlay } from '@/components/WatermarkOverlay';
import { ProtectedCanvasView } from '@/components/ProtectedCanvasView';
import { useAuthContext } from '@/context/AuthContext';
import { embedFingerprint } from '@/lib/steganography';
import { useDevToolsDetector, isDevToolsOpenSync } from '@/lib/useDevToolsDetector';
import { parseHTMLContent } from './utils';

interface LessonTextViewProps {
  lessonDetails: {
    title: string;
    text_content?: string | null;
  };
  selectedLessonId: string | null;
  currentTreeNode: {
    progress_status?: string | null;
  } | null | undefined;
  updateProgress: (nodeId: string, status: 'STARTED' | 'COMPLETED') => Promise<void>;
  isPendingProgress: boolean;
}

export function LessonTextView({
  lessonDetails,
  selectedLessonId,
  currentTreeNode,
  updateProgress,
  isPendingProgress,
}: LessonTextViewProps) {
  const { userEmail } = useAuthContext();
  const [isTampered, setIsTampered] = useState(false);
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(() => isDevToolsOpenSync());
  const isCompleted = currentTreeNode?.progress_status === 'COMPLETED';

  // DevTools open detector: dynamically updates when DevTools is opened or closed
  useDevToolsDetector(setIsDevToolsOpen);

  const isBlocked = isTampered || isDevToolsOpen;

  // Check if content has complex LaTeX/MathJax formulas
  const hasLatex = useMemo(() => {
    const raw = lessonDetails.text_content || '';
    return raw.includes('$') || raw.includes('\\(') || raw.includes('\\[') || raw.includes('class="math"');
  }, [lessonDetails.text_content]);

  // Embed invisible forensic steganography into content
  const protectedHTML = useMemo(() => {
    if (!lessonDetails.text_content || isBlocked) return null;
    const identifier = userEmail || 'EduVerse';
    const fingerprinted = embedFingerprint(lessonDetails.text_content, identifier);
    return parseHTMLContent(fingerprinted);
  }, [lessonDetails.text_content, userEmail, isBlocked]);

  // Anti-Copy & Anti-Print Keyboard Shortcut Interceptor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === 'c' || key === 'p' || key === 's' || key === 'u') {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Box
      p={{ base: 'md', sm: 'xl', md: '28px' }}
      style={{
        width: '100%',
        backgroundColor: '#ffffff',
        minHeight: '100%',
        position: 'relative',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
      }}
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      data-testid="lesson-text-view-container"
    >
      {/* Background forensic watermark overlay with MutationObserver guard */}
      <WatermarkOverlay variant="reading" onTamper={() => setIsTampered(true)} />

      <Box style={{ width: '100%', position: 'relative', zIndex: 10 }}>
        <Stack gap="md">
          <Box>
            <Text size="xs" fw={800} c="blue.6" style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
              লেকচার নোট ও রিভিশন শিট
            </Text>
            <Title order={1} size="h3" mt={4} style={{ fontWeight: 800, color: '#0f172a' }}>
              {lessonDetails.title}
            </Title>
          </Box>

          <Divider color="#e2e8f0" />

          {isBlocked ? (
            <Alert
              icon={<IconAlertTriangle size={20} />}
              title="নিরাপত্তা সতর্কতা"
              color="red"
              radius="md"
              data-testid="tamper-alert"
            >
              {isDevToolsOpen
                ? 'ডেভলপার টুলস (DevTools) খোলা অবস্থায় কন্টেন্ট প্রদর্শন বন্ধ রাখা হয়েছে। কন্টেন্ট দেখতে ইন্সপেক্ট উইন্ডো বন্ধ করুন।'
                : 'কন্টেন্ট সুরক্ষায় অসঙ্গতি বা অননুমোদিত হস্তক্ষেপ শনাক্ত হয়েছে। কন্টেন্ট দেখতে অনুগ্রহ করে পেজটি রিফ্রেশ করুন।'}
            </Alert>
          ) : (
            <Box
              style={{
                minHeight: '180px',
                lineHeight: 1.8,
                fontSize: '15px',
                color: '#334155',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
              data-testid="lesson-text-content"
            >
              {lessonDetails.text_content ? (
                hasLatex ? (
                  <MathJaxContent html={protectedHTML || ''} />
                ) : (
                  <ProtectedCanvasView
                    content={lessonDetails.text_content}
                    userEmail={userEmail}
                  />
                )
              ) : (
                <Text c="dimmed" style={{ fontStyle: 'italic' }}>
                  এই লেকচারের জন্য কোনো লিখিত কন্টেন্ট পাওয়া যায়নি।
                </Text>
              )}
            </Box>
          )}

          <Box mt="md" pb="xs">
            <Button
              variant={isCompleted ? 'light' : 'gradient'}
              gradient={isCompleted ? undefined : { from: 'blue', to: 'violet' }}
              color={isCompleted ? 'green' : undefined}
              leftSection={<IconCheck size={18} />}
              size="md"
              radius="md"
              onClick={() => {
                if (selectedLessonId) {
                  updateProgress(selectedLessonId, 'COMPLETED');
                }
              }}
              loading={isPendingProgress}
              style={{ fontWeight: 700 }}
            >
              {isCompleted ? 'পড়া সম্পন্ন হয়েছে' : 'পড়া সম্পন্ন হিসেবে চিহ্নিত করুন'}
            </Button>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}
