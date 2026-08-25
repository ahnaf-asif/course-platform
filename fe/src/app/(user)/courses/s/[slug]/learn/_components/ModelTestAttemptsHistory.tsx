'use client';

import React from 'react';
import {
  Table,
  Badge,
  Text,
  Group,
  Button,
  Card,
  Stack,
  Loader,
  Center,
} from '@mantine/core';
import { IconHistory, IconEye, IconCheck, IconX } from '@tabler/icons-react';
import { StudentQuizAttemptSummary } from '@/api/model/components-schemas-assessment/studentQuizAttemptSummary';

interface ModelTestAttemptsHistoryProps {
  attemptsData: StudentQuizAttemptSummary[] | undefined;
  isLoadingAttempts: boolean;
  selectedAttemptId: string | null;
  setSelectedAttemptId: (id: string | null) => void;
  isLoadingAttemptDetails: boolean;
}

export function ModelTestAttemptsHistory({
  attemptsData,
  isLoadingAttempts,
  selectedAttemptId,
  setSelectedAttemptId,
  isLoadingAttemptDetails,
}: ModelTestAttemptsHistoryProps) {
  const formatTimeSpent = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs} সেকেন্ড`;
    return `${mins} মি. ${secs} সে.`;
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('bn-BD', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  if (isLoadingAttempts) {
    return (
      <Center py={60}>
        <Stack align="center" gap="xs">
          <Loader size="md" color="indigo" />
          <Text size="xs" c="dimmed">ফলাফল ইতিহাস লোড হচ্ছে...</Text>
        </Stack>
      </Center>
    );
  }

  if (!attemptsData || attemptsData.length === 0) {
    return (
      <Card withBorder radius="md" p="xl" ta="center">
        <Stack align="center" gap="sm">
          <IconHistory size={40} color="#cbd5e1" />
          <Text fw={600} size="md" c="gray.7">
            কোনো পূর্ববর্তী ফলাফল পাওয়া যায়নি
          </Text>
          <Text size="xs" c="dimmed">
            মডেল টেস্ট সমাপ্ত করার পর আপনার সকল প্রচেষ্টার বিস্তারিত তথ্য এখানে সংরক্ষিত থাকবে।
          </Text>
        </Stack>
      </Card>
    );
  }

  return (
    <Card withBorder radius="md" p={0} style={{ overflow: 'hidden' }}>
      <Table.ScrollContainer minWidth={600}>
        <Table verticalSpacing="sm" horizontalSpacing="md" highlightOnHover>
          <Table.Thead style={{ backgroundColor: '#f8fafc' }}>
            <Table.Tr>
              <Table.Th>প্রচেষ্টা #</Table.Th>
              <Table.Th>তারিখ ও সময়</Table.Th>
              <Table.Th>ব্যয়িত সময়</Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>সঠিক / ভুল</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>প্রাপ্ত নম্বর</Table.Th>
              <Table.Th style={{ textAlign: 'center' }}>অবস্থা</Table.Th>
              <Table.Th style={{ textAlign: 'right' }}>অ্যাকশন</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {attemptsData.map((att, idx) => {
              const attemptNum = attemptsData.length - idx;
              const isFirst = att.is_first_attempt;

              return (
                <Table.Tr key={att.id}>
                  <Table.Td>
                    <Group gap="xs">
                      <Text size="sm" fw={600}>
                        #{attemptNum}
                      </Text>
                      {isFirst && (
                        <Badge size="xs" color="indigo" variant="light">
                          অফিশিয়াল র‍্যাংক
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="gray.7">
                      {formatDate(att.completed_at)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="gray.8">
                      {formatTimeSpent(att.time_spent_seconds)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={6} justify="center">
                      <Badge size="xs" color="green" variant="light" leftSection={<IconCheck size={10} />}>
                        {att.correct_count}
                      </Badge>
                      <Badge size="xs" color="red" variant="light" leftSection={<IconX size={10} />}>
                        {att.wrong_count}
                      </Badge>
                    </Group>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Text fw={800} size="sm" c={att.score >= 0 ? 'indigo.8' : 'red.6'}>
                      {att.score.toFixed(2)}
                    </Text>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'center' }}>
                    <Badge size="xs" color={att.is_passed ? 'green' : 'red'} variant="light">
                      {att.is_passed ? 'উত্তীর্ণ' : 'অনুত্তীর্ণ'}
                    </Badge>
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Button
                      size="xs"
                      variant="light"
                      color="blue"
                      leftSection={<IconEye size={14} />}
                      loading={isLoadingAttemptDetails && selectedAttemptId === att.id}
                      onClick={() => setSelectedAttemptId(att.id)}
                    >
                      উত্তর রিভিউ
                    </Button>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Card>
  );
}
