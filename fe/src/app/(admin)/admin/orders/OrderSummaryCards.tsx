'use client';

import React from 'react';
import { SimpleGrid, Card, Group, ThemeIcon, Text, Skeleton } from '@mantine/core';
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
      <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, lg: 5 }} spacing="md">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} height={110} radius="md" />
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
      title: 'মোট আয়',
      subtitle: 'Total Revenue',
      value: formattedRevenue,
      icon: IconCurrencyTaka,
      color: 'teal',
      accentColor: '#0d9488',
      bgGradient: 'linear-gradient(135deg, #f0fdfa 0%, #ffffff 100%)',
    },
    {
      title: 'মোট অর্ডার',
      subtitle: 'Total Orders',
      value: summary?.total_orders?.toLocaleString() || '0',
      icon: IconReceipt,
      color: 'blue',
      accentColor: '#2563eb',
      bgGradient: 'linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)',
    },
    {
      title: 'সফল অর্ডার',
      subtitle: 'Completed',
      value: summary?.completed_orders?.toLocaleString() || '0',
      icon: IconCheck,
      color: 'green',
      accentColor: '#16a34a',
      bgGradient: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
    },
    {
      title: 'পেন্ডিং',
      subtitle: 'Pending Orders',
      value: summary?.pending_orders?.toLocaleString() || '0',
      icon: IconClock,
      color: 'yellow',
      accentColor: '#ca8a04',
      bgGradient: 'linear-gradient(135deg, #fefce8 0%, #ffffff 100%)',
    },
    {
      title: 'রিফান্ড',
      subtitle: 'Refunded',
      value: summary?.refunded_orders?.toLocaleString() || '0',
      icon: IconRotateClockwise,
      color: 'red',
      accentColor: '#dc2626',
      bgGradient: 'linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)',
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
              minHeight: 110,
            }}
          >
            {/* Header: Icon + Title */}
            <Group justify="space-between" align="center" wrap="nowrap" mb={8}>
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
            <div>
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
              <Text size="11px" c="dimmed" fw={500} mt={2}>
                {item.subtitle}
              </Text>
            </div>
          </Card>
        );
      })}
    </SimpleGrid>
  );
}
