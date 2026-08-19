'use client';

import React from 'react';
import { Card, Group, Title, Text, Skeleton, Box, Stack, Badge } from '@mantine/core';
import { BarChart } from '@mantine/charts';
import { IconUserPlus, IconUsers } from '@tabler/icons-react';
import type { UserTrendPoint } from '@/api/model/components-schemas-commerce';

interface UserGrowthChartProps {
  userTrends?: UserTrendPoint[];
  isLoading?: boolean;
}

export function UserGrowthChart({ userTrends = [], isLoading }: UserGrowthChartProps) {
  if (isLoading) {
    return (
      <Card p="md" radius="md" withBorder shadow="xs">
        <Skeleton height={40} mb="md" />
        <Skeleton height={280} radius="md" />
      </Card>
    );
  }

  const totalNewUsers = userTrends.reduce((acc, curr) => acc + (curr.new_users || 0), 0);

  const formattedChartData = userTrends.map((d) => ({
    date: d.date.slice(5), // MM-DD for clean x-axis
    new_users: d.new_users,
  }));

  return (
    <Card p="lg" radius="md" withBorder shadow="xs">
      <Group justify="space-between" align="center" wrap="wrap" gap="sm" mb="lg">
        <div>
          <Group gap="xs" align="center">
            <IconUserPlus size={20} color="#4f46e5" />
            <Title order={4} fw={700} style={{ color: '#0f172a' }}>
              শিক্ষার্থী নিবন্ধন বৃদ্ধি (User Signups)
            </Title>
          </Group>
          <Text size="xs" c="dimmed" mt={2}>
            গত ৩০ দিনে দৈনিক নতুন শিক্ষার্থী যোগ হওয়ার পরিসংখ্যান
          </Text>
        </div>

        <Badge color="indigo" variant="light" size="md">
          মোট নতুন: {totalNewUsers} জন
        </Badge>
      </Group>

      {formattedChartData.length === 0 ? (
        <Box h={280} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Stack align="center" gap="xs">
            <IconUsers size={36} color="#94a3b8" />
            <Text size="sm" c="dimmed">
              কোনো তথ্য পাওয়া যায়নি
            </Text>
          </Stack>
        </Box>
      ) : (
        <BarChart
          h={280}
          data={formattedChartData}
          dataKey="date"
          series={[{ name: 'new_users', color: 'indigo.6', label: 'নতুন শিক্ষার্থী' }]}
          tickLine="y"
          gridAxis="xy"
          valueFormatter={(val) => `${val} জন`}
          tooltipAnimationDuration={200}
        />
      )}
    </Card>
  );
}
