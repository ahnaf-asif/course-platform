'use client';

import React from 'react';
import {
  Card,
  Table,
  Badge,
  Text,
  Group,
  Avatar,
  Stack,
  Loader,
  Center,
  Title,
  Paper,
  ThemeIcon,
} from '@mantine/core';
import {
  IconTrophy,
  IconClock,
  IconUser,
  IconCheck,
  IconX,
  IconMinus,
} from '@tabler/icons-react';
import { useStudentGetQuizLeaderboard } from '@/api/generated/assessment/assessment';

interface ModelTestLeaderboardProps {
  quizId: string;
}

export function ModelTestLeaderboard({ quizId }: ModelTestLeaderboardProps) {
  const { data: leaderboardData, isLoading, isError } = useStudentGetQuizLeaderboard(quizId, {
    query: {
      enabled: !!quizId,
      refetchInterval: 30000, // auto-refresh leaderboard every 30s
    },
  });

  if (isLoading) {
    return (
      <Center py={60}>
        <Stack align="center" gap="sm">
          <Loader size="md" color="indigo" />
          <Text size="sm" c="dimmed">
            লিডারবোর্ড লোড হচ্ছে...
          </Text>
        </Stack>
      </Center>
    );
  }

  if (isError || !leaderboardData) {
    return (
      <Center py={40}>
        <Text size="sm" c="red.6">
          লিডারবোর্ড তথ্য লোড করা সম্ভব হয়নি।
        </Text>
      </Center>
    );
  }

  const { total_participants, my_rank, entries } = leaderboardData;

  const formatTimeSpent = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} সেকেন্ড`;
    return `${mins} মি. ${secs} সে.`;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <Badge size="lg" variant="gradient" gradient={{ from: 'yellow.6', to: 'orange.6' }}>
          🥇 ১ম স্থান
        </Badge>
      );
    }
    if (rank === 2) {
      return (
        <Badge size="lg" variant="gradient" gradient={{ from: 'gray.4', to: 'gray.6' }}>
          🥈 ২য় স্থান
        </Badge>
      );
    }
    if (rank === 3) {
      return (
        <Badge size="lg" variant="gradient" gradient={{ from: 'orange.7', to: 'yellow.8' }}>
          🥉 ৩য় স্থান
        </Badge>
      );
    }
    return (
      <Badge size="md" variant="light" color="indigo">
        #{rank}
      </Badge>
    );
  };

  return (
    <Stack gap="lg" py="xs" data-testid="model-test-leaderboard">
      {/* Header Info */}
      <Group justify="space-between" align="center">
        <div>
          <Title order={3} size="h4" style={{ fontWeight: 800, color: '#0f172a' }}>
            🏆 অফিশিয়াল র‍্যাংক লিস্ট
          </Title>
          <Text size="xs" c="dimmed" mt={2}>
            কেবল প্রথম প্রচেষ্টার প্রাপ্ত নম্বর ও সমাপ্ত করার সময় অনুযায়ী অফিশিয়াল র‍্যাংক তৈরি করা হয়।
          </Text>
        </div>
        <Badge size="lg" color="indigo" variant="light" leftSection={<IconUser size={14} />}>
          মোট পরীক্ষার্থী: {total_participants} জন
        </Badge>
      </Group>

      {/* Current User Rank Card */}
      {my_rank ? (
        <Paper
          withBorder
          p="md"
          radius="md"
          style={{
            backgroundColor: '#f0fdf4',
            borderColor: '#86efac',
          }}
          data-testid="my-rank-banner"
        >
          <Group justify="space-between" align="center" wrap="wrap">
            <Group gap="md">
              <ThemeIcon size={42} radius="md" color="teal" variant="light">
                <IconTrophy size={24} />
              </ThemeIcon>
              <div>
                <Text size="xs" fw={700} c="teal.9" style={{ textTransform: 'uppercase' }}>
                  আপনার বর্তমান অবস্থান
                </Text>
                <Group gap="xs" mt={2}>
                  <Text size="lg" fw={800} c="teal.9">
                    র‍্যাংক #{my_rank.rank_position}
                  </Text>
                  <Text size="xs" c="dimmed">
                    ({total_participants} জনের মধ্যে)
                  </Text>
                </Group>
              </div>
            </Group>

            <Group gap="lg">
              <div style={{ textAlign: 'right' }}>
                <Text size="xs" c="dimmed">
                  প্রাপ্ত নম্বর
                </Text>
                <Text size="lg" fw={800} c="indigo.8">
                  {my_rank.score.toFixed(2)}
                </Text>
              </div>
              <div style={{ textAlign: 'right' }}>
                <Text size="xs" c="dimmed">
                  ব্যয়িত সময়
                </Text>
                <Text size="sm" fw={700} c="gray.8">
                  {formatTimeSpent(my_rank.time_spent_seconds)}
                </Text>
              </div>
            </Group>
          </Group>
        </Paper>
      ) : (
        <Paper withBorder p="sm" radius="md" bg="gray.0">
          <Text size="xs" c="dimmed" ta="center">
            আপনি এখনও এই মডেল টেস্টে অংশগ্রহণ করেননি। পরীক্ষা সমাপ্ত করার পর আপনার র‍্যাংক এখানে প্রদর্শিত হবে।
          </Text>
        </Paper>
      )}

      {/* Leaderboard Table */}
      {entries.length === 0 ? (
        <Card withBorder radius="md" p="xl" ta="center">
          <Stack align="center" gap="sm">
            <IconTrophy size={40} color="#cbd5e1" />
            <Text fw={600} size="md" c="gray.7">
              এখনও কোনো ফলাফল যুক্ত হয়নি
            </Text>
            <Text size="xs" c="dimmed">
              প্রথম শিক্ষার্থী হিসেবে মডেল টেস্ট দিয়ে র‍্যাংক লিস্টের শীর্ষে স্থান করে নিন!
            </Text>
          </Stack>
        </Card>
      ) : (
        <Card withBorder radius="md" p={0} style={{ overflow: 'hidden' }}>
          <Table.ScrollContainer minWidth={600}>
            <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
              <Table.Thead style={{ backgroundColor: '#f8fafc' }}>
                <Table.Tr>
                  <Table.Th style={{ width: '100px' }}>র‍্যাংক</Table.Th>
                  <Table.Th>শিক্ষার্থীর নাম</Table.Th>
                  <Table.Th style={{ textAlign: 'center' }}>সঠিক / ভুল / ফাঁকা</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>সময়</Table.Th>
                  <Table.Th style={{ textAlign: 'right' }}>প্রাপ্ত নম্বর</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {entries.map((entry) => {
                  const isMe = entry.is_current_user;
                  return (
                    <Table.Tr
                      key={entry.attempt_id}
                      style={{
                        backgroundColor: isMe ? '#eff6ff' : undefined,
                        fontWeight: isMe ? 600 : undefined,
                      }}
                      data-testid={`leaderboard-row-${entry.rank_position}`}
                    >
                      <Table.Td>{getRankBadge(entry.rank_position)}</Table.Td>
                      <Table.Td>
                        <Group gap="sm" wrap="nowrap">
                          <Avatar
                            src={entry.avatar_url}
                            alt={entry.user_name}
                            radius="xl"
                            size="sm"
                            color="indigo"
                          >
                            {entry.user_name?.slice(0, 1) || 'S'}
                          </Avatar>
                          <div>
                            <Group gap={6}>
                              <Text size="sm" fw={isMe ? 700 : 600} c={isMe ? 'blue.9' : 'gray.9'}>
                                {entry.user_name}
                              </Text>
                              {isMe && (
                                <Badge size="xs" color="blue" variant="filled">
                                  আপনি
                                </Badge>
                              )}
                            </Group>
                          </div>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={6} justify="center">
                          <Badge size="xs" color="green" variant="light" leftSection={<IconCheck size={10} />}>
                            {entry.correct_count}
                          </Badge>
                          <Badge size="xs" color="red" variant="light" leftSection={<IconX size={10} />}>
                            {entry.wrong_count}
                          </Badge>
                          <Badge size="xs" color="gray" variant="light" leftSection={<IconMinus size={10} />}>
                            {entry.unanswered_count}
                          </Badge>
                        </Group>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Group gap={4} justify="flex-end">
                          <IconClock size={14} color="#64748b" />
                          <Text size="xs" c="gray.7">
                            {formatTimeSpent(entry.time_spent_seconds)}
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text fw={800} size="sm" c={entry.score >= 0 ? 'indigo.8' : 'red.6'}>
                          {entry.score.toFixed(2)}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        </Card>
      )}
    </Stack>
  );
}
