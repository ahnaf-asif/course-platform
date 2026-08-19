'use client';

import React from 'react';
import {
  Card,
  Group,
  Title,
  Text,
  Stack,
  Skeleton,
  Table,
  Badge,
  Button,
  Box,
  Divider,
  SimpleGrid,
  ThemeIcon,
} from '@mantine/core';
import { DonutChart } from '@mantine/charts';
import {
  IconTrophy,
  IconCreditCard,
  IconArrowRight,
  IconUsers,
} from '@tabler/icons-react';
import Link from 'next/link';
import type {
  TopCourseItem,
  PaymentDistributionItem,
} from '@/api/model/components-schemas-commerce';

interface TopCoursesCardProps {
  topCourses?: TopCourseItem[];
  paymentDistribution?: PaymentDistributionItem[];
  isLoading?: boolean;
}

export function TopCoursesCard({
  topCourses = [],
  paymentDistribution = [],
  isLoading,
}: TopCoursesCardProps) {
  if (isLoading) {
    return (
      <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
        <Skeleton height={320} radius="md" style={{ gridColumn: 'span 2' }} />
        <Skeleton height={320} radius="md" />
      </SimpleGrid>
    );
  }

  const providerColors: Record<string, string> = {
    sslcommerz: 'blue.6',
    bkash: 'pink.6',
    nagad: 'orange.6',
    direct: 'teal.6',
    manual: 'violet.6',
  };

  const donutData = paymentDistribution.map((item) => ({
    name: item.provider.toUpperCase(),
    value: item.order_count,
    color: providerColors[item.provider.toLowerCase()] || 'gray.6',
  }));

  const totalPaymentOrders = paymentDistribution.reduce((acc, curr) => acc + curr.order_count, 0);

  return (
    <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
      {/* Top Courses List (2/3 width) */}
      <Card p="lg" radius="md" withBorder shadow="xs" style={{ gridColumn: 'span 2' }}>
        <Group justify="space-between" align="center" mb="md">
          <Group gap="xs">
            <IconTrophy size={20} color="#d97706" />
            <Title order={4} fw={700} style={{ color: '#0f172a' }}>
              জনপ্রিয় কোর্সসমূহ (Top Performing Courses)
            </Title>
          </Group>
          <Button
            variant="subtle"
            size="xs"
            component={Link}
            href="/admin/courses"
            rightSection={<IconArrowRight size={14} />}
          >
            সব কোর্স দেখুন
          </Button>
        </Group>

        {topCourses.length === 0 ? (
          <Box p="xl" ta="center">
            <Text size="sm" c="dimmed">
              এখনো কোনো কোর্সে এনরোলমেন্ট বা অর্ডার নেই।
            </Text>
          </Box>
        ) : (
          <Table verticalSpacing="sm" highlightOnHover>
            <Table.Thead style={{ backgroundColor: '#f8fafc' }}>
              <Table.Tr>
                <Table.Th>কোর্স নাম</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>এনরোলমেন্ট</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>মোট অর্জিত আয়</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>অ্যাকশন</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {topCourses.map((course, index) => (
                <Table.Tr key={course.id}>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Badge
                        size="sm"
                        variant={index === 0 ? 'filled' : 'light'}
                        color={index === 0 ? 'yellow' : index === 1 ? 'gray' : 'blue'}
                        circle
                      >
                        {index + 1}
                      </Badge>
                      <Stack gap={0} style={{ maxWidth: 260 }}>
                        <Text size="sm" fw={600} truncate title={course.title}>
                          {course.title}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {course.slug || 'N/A'}
                        </Text>
                      </Stack>
                    </Group>
                  </Table.Td>

                  <Table.Td style={{ textAlign: 'center' }}>
                    <Badge color="violet" variant="light" size="sm" leftSection={<IconUsers size={12} />}>
                      {course.total_students} জন
                    </Badge>
                  </Table.Td>

                  <Table.Td style={{ textAlign: 'right' }}>
                    <Text size="sm" fw={700} c="teal.7">
                      ৳{course.total_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </Text>
                  </Table.Td>

                  <Table.Td style={{ textAlign: 'right' }}>
                    <Button
                      variant="light"
                      size="compact-xs"
                      component={Link}
                      href={`/admin/courses/${course.id}/curriculum`}
                    >
                      সিলেবাস
                    </Button>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      {/* Payment Gateway Distribution (1/3 width) */}
      <Card p="lg" radius="md" withBorder shadow="xs">
        <Group gap="xs" mb="sm">
          <IconCreditCard size={20} color="#2563eb" />
          <Title order={4} fw={700} style={{ color: '#0f172a' }}>
            পেমেন্ট মেথড অনুপাত
          </Title>
        </Group>
        <Text size="xs" c="dimmed" mb="md">
          গেটওয়েভিত্তিক অর্ডারের বণ্টন
        </Text>

        {donutData.length === 0 ? (
          <Box h={200} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Text size="sm" c="dimmed">
              কোনো ট্রানজেকশন নেই
            </Text>
          </Box>
        ) : (
          <Stack align="center" gap="md">
            <DonutChart
              data={donutData}
              size={150}
              thickness={22}
              withTooltip
              tooltipDataSource="segment"
            />

            <Stack gap="xs" style={{ width: '100%' }}>
              <Divider />
              {paymentDistribution.map((item) => {
                const color = providerColors[item.provider.toLowerCase()] || 'gray.6';
                const percentage = totalPaymentOrders > 0
                  ? Math.round((item.order_count / totalPaymentOrders) * 100)
                  : 0;

                return (
                  <Group key={item.provider} justify="space-between" align="center">
                    <Group gap={8}>
                      <ThemeIcon size={12} radius="xl" color={color} />
                      <Text size="xs" fw={600}>
                        {item.provider.toUpperCase()}
                      </Text>
                    </Group>
                    <Group gap="xs">
                      <Text size="xs" c="dimmed">
                        {item.order_count} টি ({percentage}%)
                      </Text>
                      <Text size="xs" fw={700} c="teal.8">
                        ৳{item.total_amount.toLocaleString()}
                      </Text>
                    </Group>
                  </Group>
                );
              })}
            </Stack>
          </Stack>
        )}
      </Card>
    </SimpleGrid>
  );
}
