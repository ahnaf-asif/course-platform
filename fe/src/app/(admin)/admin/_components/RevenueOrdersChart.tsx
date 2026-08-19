'use client';

import React, { useState } from 'react';
import { Card, Group, Title, Text, SegmentedControl, Skeleton, Box, Stack, Badge } from '@mantine/core';
import { AreaChart } from '@mantine/charts';
import { IconChartLine, IconTrendingUp } from '@tabler/icons-react';
import type { RevenueTrendPoint } from '@/api/model/components-schemas-commerce';

interface RevenueOrdersChartProps {
  dailyTrends?: RevenueTrendPoint[];
  monthlyTrends?: RevenueTrendPoint[];
  isLoading?: boolean;
}

export function RevenueOrdersChart({ dailyTrends = [], monthlyTrends = [], isLoading }: RevenueOrdersChartProps) {
  const [timeframe, setTimeframe] = useState<'daily' | 'monthly'>('daily');

  if (isLoading) {
    return (
      <Card p="md" radius="md" withBorder shadow="xs">
        <Skeleton height={40} mb="md" />
        <Skeleton height={280} radius="md" />
      </Card>
    );
  }

  const currentData = timeframe === 'daily' ? dailyTrends : monthlyTrends;

  const totalPeriodRevenue = currentData.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
  const totalPeriodOrders = currentData.reduce((acc, curr) => acc + (curr.total_orders || 0), 0);

  const formattedChartData = currentData.map((d) => ({
    date: d.display_label || d.date,
    revenue: d.revenue,
    orders: d.total_orders,
    completed: d.completed_orders,
  }));

  return (
    <Card p="lg" radius="md" withBorder shadow="xs">
      <Group justify="space-between" align="center" wrap="wrap" gap="sm" mb="lg">
        <div>
          <Group gap="xs" align="center">
            <IconChartLine size={20} color="#0d9488" />
            <Title order={4} fw={700} style={{ color: '#0f172a' }}>
              আয় ও বিক্রয় ট্রেন্ড (Revenue & Sales)
            </Title>
          </Group>
          <Text size="xs" c="dimmed" mt={2}>
            সময়ের সাথে কোর্সের মোট আয় ও অর্ডারের সংখ্যা বিশ্লেষণ করুন
          </Text>
        </div>

        <Group gap="md" align="center">
          <Group gap="xs">
            <Badge color="teal" variant="light" size="md">
              মোট: ৳{totalPeriodRevenue.toLocaleString('en-US', { minimumFractionDigits: 0 })}
            </Badge>
            <Badge color="blue" variant="light" size="md">
              অর্ডার: {totalPeriodOrders} টি
            </Badge>
          </Group>

          <SegmentedControl
            size="xs"
            value={timeframe}
            onChange={(val) => setTimeframe(val as 'daily' | 'monthly')}
            data={[
              { label: 'গত ৩০ দিন (Daily)', value: 'daily' },
              { label: 'গত ১২ মাস (Monthly)', value: 'monthly' },
            ]}
          />
        </Group>
      </Group>

      {formattedChartData.length === 0 ? (
        <Box h={280} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Stack align="center" gap="xs">
            <IconTrendingUp size={36} color="#94a3b8" />
            <Text size="sm" c="dimmed">
              এই সময়ের জন্য কোনো তথ্য পাওয়া যায়নি
            </Text>
          </Stack>
        </Box>
      ) : (
        <AreaChart
          h={280}
          data={formattedChartData}
          dataKey="date"
          series={[
            { name: 'revenue', color: 'teal.6', label: 'আয় (Revenue ৳)' },
            { name: 'orders', color: 'blue.6', label: 'মোট অর্ডার' },
          ]}
          curveType="monotone"
          tickLine="y"
          gridAxis="xy"
          valueFormatter={(value) =>
            typeof value === 'number' && value > 100
              ? `৳${value.toLocaleString()}`
              : `${value}`
          }
          tooltipAnimationDuration={200}
        />
      )}
    </Card>
  );
}
