'use client';

import React from 'react';
import {
  Box,
  Card,
  Stack,
  Text,
  Title,
  Badge,
  Group,
  Button,
  Container,
  Paper,
  SimpleGrid,
  ThemeIcon,
  Alert,
} from '@mantine/core';
import {
  IconCheck,
  IconX,
  IconTrophy,
  IconMinus,
  IconRotateClockwise,
  IconInfoCircle,
  IconHelp,
  IconArrowLeft,
} from '@tabler/icons-react';
import { MathJaxContent } from '@/components/MathJaxContent';
import { parseHTMLContent } from './utils';
import { SubmitQuizResponse } from '@/api/model/components-schemas-assessment/submitQuizResponse';

interface ModelTestReviewProps {
  activeAttempt: SubmitQuizResponse;
  setActiveAttempt: (attempt: SubmitQuizResponse | null) => void;
  onRetake: () => void;
  onViewLeaderboard?: () => void;
}

export function ModelTestReview({
  activeAttempt,
  setActiveAttempt,
  onRetake,
  onViewLeaderboard,
}: ModelTestReviewProps) {
  const {
    score,
    is_passed,
    passing_score,
    time_spent_seconds,
    total_questions,
    correct_count,
    wrong_count,
    unanswered_count,
    total_negative_marks,
    is_first_attempt,
    rank_position,
    questions,
  } = activeAttempt;

  const formatTimeSpent = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} সেকেন্ড`;
    return `${mins} মি. ${secs} সে.`;
  };

  return (
    <Box py="sm" data-testid="model-test-review">
      <Container size="md" px={0} style={{ maxWidth: '880px', width: '100%' }}>
        <Stack gap="xl">
          {/* Top Back and Retake Buttons */}
          <Group justify="space-between" align="center">
            <Button
              variant="subtle"
              color="gray.7"
              size="sm"
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => setActiveAttempt(null)}
            >
              মডেল টেস্ট ড্যাশবোর্ডে ফিরুন
            </Button>
            <Group gap="xs">
              {onViewLeaderboard && (
                <Button
                  variant="light"
                  color="indigo"
                  size="sm"
                  leftSection={<IconTrophy size={16} />}
                  onClick={onViewLeaderboard}
                >
                  র‍্যাংক লিস্ট দেখুন
                </Button>
              )}
              <Button
                variant="filled"
                color="blue"
                size="sm"
                leftSection={<IconRotateClockwise size={16} />}
                onClick={onRetake}
              >
                পুনরায় পরীক্ষা দিন
              </Button>
            </Group>
          </Group>

          {/* Results Scorecard Card */}
          <Paper
            withBorder
            p="xl"
            radius="lg"
            style={{
              backgroundColor: is_passed ? '#f0fdf4' : '#fff1f2',
              borderColor: is_passed ? '#86efac' : '#fca5a5',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            }}
          >
            <Stack gap="lg">
              <Group justify="space-between" align="flex-start" wrap="wrap">
                <div>
                  <Badge
                    size="lg"
                    color={is_passed ? 'green' : 'red'}
                    variant="filled"
                    radius="sm"
                  >
                    {is_passed ? 'উত্তীর্ণ (Passed)' : 'অনুত্তীর্ণ (Failed)'}
                  </Badge>
                  <Title order={2} size="h3" style={{ fontWeight: 800, marginTop: '8px' }}>
                    মডেল টেস্ট মূল্যায়ন ফলাফল
                  </Title>
                  <Text size="xs" c="dimmed" mt={4}>
                    পাস মার্কস: {passing_score}
                  </Text>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <Text size="xs" fw={700} c="dimmed" style={{ textTransform: 'uppercase' }}>
                    মোট প্রাপ্ত নম্বর
                  </Text>
                  <Text size="32px" fw={900} c={score >= 0 ? 'indigo.9' : 'red.6'} style={{ lineHeight: 1.2 }}>
                    {score.toFixed(2)}
                  </Text>
                </div>
              </Group>

              {/* Leaderboard Notice Banner */}
              {is_first_attempt ? (
                <Alert
                  icon={<IconTrophy size={20} />}
                  title="অফিশিয়াল র‍্যাংক আপডেট"
                  color="teal"
                  variant="light"
                  radius="md"
                >
                  <Text size="xs">
                    এটি আপনার প্রথম প্রচেষ্টা হওয়ায় এই ফলাফলটি অফিশিয়াল র‍্যাংক লিস্টে অন্তর্ভুক্ত করা হয়েছে।{' '}
                    {rank_position && <strong>আপনার বর্তমান র‍্যাংক: #{rank_position}</strong>}
                  </Text>
                </Alert>
              ) : (
                <Alert
                  icon={<IconInfoCircle size={20} />}
                  title="পুনঃপ্রচেষ্টা মোড (Practice Attempt)"
                  color="blue"
                  variant="light"
                  radius="md"
                >
                  <Text size="xs">
                    এটি একটি পুনঃপ্রচেষ্টা (Practice attempt)। আপনি অনুশীলনের জন্য যতবার ইচ্ছে পরীক্ষা দিতে পারবেন, তবে আপনার প্রথম প্রচেষ্টার ফলাফলটিই অফিশিয়াল র‍্যাংক লিস্টে থাকবে।
                  </Text>
                </Alert>
              )}

              {/* Stats Overview Grid */}
              <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} spacing="md">
                <Paper withBorder p="sm" radius="md" bg="white" ta="center">
                  <Text size="11px" c="dimmed" fw={600}>
                    মোট প্রশ্ন
                  </Text>
                  <Text size="lg" fw={800} c="gray.8" mt={2}>
                    {total_questions}
                  </Text>
                </Paper>

                <Paper withBorder p="sm" radius="md" bg="white" ta="center">
                  <Text size="11px" c="dimmed" fw={600}>
                    সঠিক উত্তর
                  </Text>
                  <Text size="lg" fw={800} c="green.7" mt={2}>
                    {correct_count}
                  </Text>
                </Paper>

                <Paper withBorder p="sm" radius="md" bg="white" ta="center">
                  <Text size="11px" c="dimmed" fw={600}>
                    ভুল উত্তর
                  </Text>
                  <Text size="lg" fw={800} c="red.6" mt={2}>
                    {wrong_count}
                  </Text>
                </Paper>

                <Paper withBorder p="sm" radius="md" bg="white" ta="center">
                  <Text size="11px" c="dimmed" fw={600}>
                    উত্তর দেননি
                  </Text>
                  <Text size="lg" fw={800} c="gray.6" mt={2}>
                    {unanswered_count}
                  </Text>
                </Paper>

                <Paper withBorder p="sm" radius="md" bg="white" ta="center">
                  <Text size="11px" c="dimmed" fw={600}>
                    নেগেটিভ মার্ক
                  </Text>
                  <Text size="lg" fw={800} c="red.7" mt={2}>
                    -{total_negative_marks.toFixed(2)}
                  </Text>
                </Paper>

                <Paper withBorder p="sm" radius="md" bg="white" ta="center">
                  <Text size="11px" c="dimmed" fw={600}>
                    ব্যয়িত সময়
                  </Text>
                  <Text size="sm" fw={800} c="blue.7" mt={4}>
                    {formatTimeSpent(time_spent_seconds)}
                  </Text>
                </Paper>
              </SimpleGrid>
            </Stack>
          </Paper>

          {/* Question-by-Question In-depth Review */}
          <div>
            <Title order={3} size="h4" style={{ fontWeight: 800, color: '#0f172a' }}>
              প্রশ্নোত্তর ও ব্যাখ্যাসমূহ (Answer Review & Explanations)
            </Title>
            <Text size="xs" c="dimmed" mt={2} mb="md">
              প্রতিটি প্রশ্নের সঠিক উত্তর এবং বিস্তারিত ব্যাখ্যা নিচে দেওয়া হলো:
            </Text>
          </div>

          <Stack gap="lg">
            {questions.map((q, idx) => {
              const isCorrect = q.is_correct;
              const hasAnswered = q.user_answers && q.user_answers.length > 0;

              return (
                <Card
                  key={q.id}
                  withBorder
                  radius="md"
                  p="lg"
                  style={{
                    backgroundColor: '#ffffff',
                    borderColor: isCorrect ? '#bbf7d0' : hasAnswered ? '#fecaca' : '#e2e8f0',
                  }}
                  data-testid={`review-question-${idx + 1}`}
                >
                  <Stack gap="md">
                    <Group justify="space-between" align="flex-start">
                      <Group gap="xs">
                        <Badge size="md" color="dark" variant="light">
                          প্রশ্ন {idx + 1}
                        </Badge>
                        {isCorrect ? (
                          <Badge size="md" color="green" variant="filled" leftSection={<IconCheck size={12} />}>
                            সঠিক উত্তর (+১.০০)
                          </Badge>
                        ) : hasAnswered ? (
                          <Badge size="md" color="red" variant="filled" leftSection={<IconX size={12} />}>
                            ভুল উত্তর
                          </Badge>
                        ) : (
                          <Badge size="md" color="gray" variant="light" leftSection={<IconMinus size={12} />}>
                            উত্তর দেওয়া হয়নি
                          </Badge>
                        )}
                      </Group>
                    </Group>

                    {/* Question Content with MathJax support */}
                    <Box fw={700} style={{ fontSize: '15.5px', color: '#0f172a', lineHeight: 1.6 }}>
                      <MathJaxContent html={parseHTMLContent(q.content)} />
                    </Box>

                    {/* Answer Options */}
                    <Stack gap="xs" mt="xs">
                      {q.answer_options.map((opt) => {
                        const isOptionCorrect = opt.is_correct;
                        const isUserSelected = q.user_answers?.includes(opt.id);

                        let bgColor = '#ffffff';
                        let borderColor = '#e2e8f0';
                        let textColor = '#334155';

                        if (isOptionCorrect) {
                          bgColor = 'rgba(16, 185, 129, 0.1)';
                          borderColor = '#10b981';
                          textColor = '#065f46';
                        } else if (isUserSelected && !isOptionCorrect) {
                          bgColor = 'rgba(239, 68, 68, 0.08)';
                          borderColor = '#ef4444';
                          textColor = '#991b1b';
                        }

                        return (
                          <Paper
                            key={opt.id}
                            withBorder
                            p="sm"
                            radius="md"
                            style={{
                              backgroundColor: bgColor,
                              borderColor: borderColor,
                              borderWidth: isOptionCorrect || isUserSelected ? 2 : 1,
                            }}
                          >
                            <Group justify="space-between" align="center">
                              <Group gap="sm" style={{ flex: 1 }}>
                                {isOptionCorrect ? (
                                  <ThemeIcon size={20} radius="xl" color="green">
                                    <IconCheck size={12} />
                                  </ThemeIcon>
                                ) : isUserSelected ? (
                                  <ThemeIcon size={20} radius="xl" color="red">
                                    <IconX size={12} />
                                  </ThemeIcon>
                                ) : (
                                  <Box style={{ width: 20 }} />
                                )}
                                <Text size="sm" fw={isOptionCorrect || isUserSelected ? 700 : 500} c={textColor}>
                                  {opt.content}
                                </Text>
                              </Group>

                              <Group gap={6}>
                                {isOptionCorrect && (
                                  <Badge size="xs" color="green" variant="light">
                                    সঠিক উত্তর
                                  </Badge>
                                )}
                                {isUserSelected && (
                                  <Badge size="xs" color={isOptionCorrect ? 'teal' : 'red'} variant="filled">
                                    আপনার উত্তর
                                  </Badge>
                                )}
                              </Group>
                            </Group>
                          </Paper>
                        );
                      })}
                    </Stack>

                    {/* Rich Explanation Box */}
                    {q.explanation && (
                      <Paper
                        withBorder
                        p="md"
                        radius="md"
                        mt="xs"
                        style={{
                          backgroundColor: '#f8fafc',
                          borderColor: '#e2e8f0',
                        }}
                      >
                        <Stack gap="xs">
                          <Group gap="xs">
                            <ThemeIcon size={22} radius="md" color="indigo" variant="light">
                              <IconHelp size={14} />
                            </ThemeIcon>
                            <Text size="xs" fw={700} c="indigo.8" style={{ textTransform: 'uppercase' }}>
                              ব্যাখ্যা (Explanation):
                            </Text>
                          </Group>
                          <Box style={{ fontSize: '13.5px', color: '#334155', lineHeight: 1.65 }}>
                            <MathJaxContent html={parseHTMLContent(q.explanation)} />
                          </Box>
                        </Stack>
                      </Paper>
                    )}
                  </Stack>
                </Card>
              );
            })}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
