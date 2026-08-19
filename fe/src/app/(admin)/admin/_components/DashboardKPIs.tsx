'use client';

import React from 'react';
import { SimpleGrid, Card, Group, ThemeIcon, Text, Skeleton, Badge, Stack } from '@mantine/core';
import {
  IconCurrencyTaka,
  IconUsers,
  IconReceipt,
  IconBook,
  IconSchool,
} from '@tabler/icons-react';
import type { DashboardKPIs as DashboardKPIsType } from '@/api/model/components-schemas-commerce';

interface DashboardKPIsProps {
  kpis?: DashboardKPIsType;
  isLoading?: boolean;
}

export function DashboardKPIs({ kpis, isLoading }: DashboardKPIsProps) {
  if (isLoading || !kpis) {
    return (
      <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, lg: 5 }} spacing="md">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} height={125} radius="md" />
        ))}
      </SimpleGrid>
    );
  }

  const totalRev = parseFloat(kpis.total_revenue || '0');
  const monthRev = parseFloat(kpis.revenue_this_month || '0');

  const formattedTotalRev = isNaN(totalRev)
    ? '৳0.00'
    : `৳${totalRev.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const formattedMonthRev = isNaN(monthRev)
    ? '৳0.00'
    : `৳${monthRev.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const successRate = kpis.total_orders > 0
    ? Math.round((kpis.completed_orders / kpis.total_orders) * 100)
    : 100;

  const stats = [
    {
      title: 'মোট আয়',
      subtitle: 'Total Revenue',
      value: formattedTotalRev,
      badge: `+${formattedMonthRev} এই মাসে`,
      badgeColor: 'teal',
      icon: IconCurrencyTaka,
      color: 'teal',
      accentColor: '#0d9488',
      bgGradient: 'linear-gradient(135deg, #f0fdfa 0%, #ffffff 100%)',
    },
    {
      title: 'শিক্ষার্থী সংখ্যা',
      subtitle: 'Total Students',
      value: kpis.total_users.toLocaleString(),
      badge: `+${kpis.users_this_month} জন নতুন`,
      badgeColor: 'indigo',
      icon: IconUsers,
      color: 'indigo',
      accentColor: '#4f46e5',
      bgGradient: 'linear-gradient(135deg, #eef2ff 0%, #ffffff 100%)',
    },
    {
      title: 'মোট অর্ডার',
      subtitle: 'Total Orders',
      value: kpis.total_orders.toLocaleString(),
      badge: `${successRate}% সফল (${kpis.completed_orders})`,
      badgeColor: 'blue',
      icon: IconReceipt,
      color: 'blue',
      accentColor: '#2563eb',
      bgGradient: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
    },
    {
      title: 'প্রকাশিত কোর্স',
      subtitle: 'Published Courses',
      value: `${kpis.published_courses} / ${kpis.total_courses}`,
      badge: `${kpis.total_lessons} পাঠ • ${kpis.total_quizzes} কুইজ`,
      badgeColor: 'green',
      icon: IconBook,
      color: 'green',
      accentColor: '#16a34a',
      bgGradient: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
    },
    {
      title: 'মোট এনরোলমেন্ট',
      subtitle: 'Active Enrollments',
      value: kpis.total_enrollments.toLocaleString(),
      badge: `${kpis.published_courses} টি কোর্সে যুক্ত`,
      badgeColor: 'violet',
      icon: IconSchool,
      color: 'violet',
      accentColor: '#7c3aed',
      bgGradient: 'linear-gradient(135deg, #faf5ff 0%, #ffffff 100%)',
    },
  ];

  return (
    <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, lg: 5 }} spacing="md">
      {stats.map((item) => {
        const Icon = item.icon;
        return (
          <Card
            key={item.title}
            p="md"
            radius="md"
            withBorder
            shadow="xs"
            style={{
              background: item.bgGradient,
              borderTop: `3px solid ${item.accentColor}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 125,
            }}
          >
            {/* Header: Icon + Title */}
            <Group justify="space-between" align="center" wrap="nowrap" mb={6}>
              <Group gap={8} wrap="nowrap" style={{ overflow: 'hidden' }}>
                <ThemeIcon size={30} radius="md" color={item.color} variant="light" style={{ flexShrink: 0 }}>
                  <Icon size={18} stroke={2} />
                </ThemeIcon>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase" truncate title={item.title}>
                  {item.title}
                </Text>
              </Group>
            </Group>

            {/* Main Value */}
            <Stack gap={4}>
              <Text
                fw={800}
                style={{
                  color: '#0f172a',
                  fontSize: item.value.length > 9 ? '1.25rem' : '1.5rem',
                  lineHeight: 1.15,
                  wordBreak: 'break-word',
                }}
              >
                {item.value}
              </Text>
              <Group justify="space-between" align="center" wrap="nowrap">
                <Badge size="xs" variant="light" color={item.badgeColor} radius="sm">
                  {item.badge}
                </Badge>
              </Group>
            </Stack>
          </Card>
        );
      })}
    </SimpleGrid>
  );
}
