'use client';

import React from 'react';
import { SimpleGrid, Card, Group, ThemeIcon, Text, Skeleton, Stack } from '@mantine/core';
import {
  IconCurrencyTaka,
  IconReceipt,
  IconCheck,
  IconClock,
  IconRotateClockwise,
} from '@tabler/icons-react';
import type { AdminOrderSummaryResponse } from '@/api/model/components-schemas-commerce';

interface OrderSummaryCardsProps {
  summary?: AdminOrderSummaryResponse;
  isLoading?: boolean;
}

export function OrderSummaryCards({ summary, isLoading }: OrderSummaryCardsProps) {
  if (isLoading) {
    return (
      <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="md">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} height={105} radius="md" />
        ))}
      </SimpleGrid>
    );
  }

  const revenueNum = parseFloat(summary?.total_revenue || '0');
  const formattedRevenue = isNaN(revenueNum)
    ? '৳0.00'
    : `৳${revenueNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const stats = [
    {
      title: 'মোট আয় (Revenue)',
      value: formattedRevenue,
      icon: IconCurrencyTaka,
      color: 'teal',
      bg: 'teal.0',
    },
    {
      title: 'মোট অর্ডার (Total)',
      value: summary?.total_orders?.toLocaleString() || '0',
      icon: IconReceipt,
      color: 'blue',
      bg: 'blue.0',
    },
    {
      title: 'সফল অর্ডার (Completed)',
      value: summary?.completed_orders?.toLocaleString() || '0',
      icon: IconCheck,
      color: 'green',
      bg: 'green.0',
    },
    {
      title: 'পেন্ডিং (Pending)',
      value: summary?.pending_orders?.toLocaleString() || '0',
      icon: IconClock,
      color: 'yellow',
      bg: 'yellow.0',
    },
    {
      title: 'রিফান্ড (Refunded)',
      value: summary?.refunded_orders?.toLocaleString() || '0',
      icon: IconRotateClockwise,
      color: 'red',
      bg: 'red.0',
    },
  ];

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="md">
      {stats.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.title} p="md" radius="md" withBorder shadow="xs" style={{ backgroundColor: '#ffffff' }}>
            <Group justify="space-between" align="flex-start">
              <Stack gap={2}>
                <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                  {item.title}
                </Text>
                <Text size="xl" fw={800} style={{ color: '#0f172a' }}>
                  {item.value}
                </Text>
              </Stack>
              <ThemeIcon size={40} radius="md" color={item.color} variant="light">
                <Icon size={22} stroke={1.8} />
              </ThemeIcon>
            </Group>
          </Card>
        );
      })}
    </SimpleGrid>
  );
}
