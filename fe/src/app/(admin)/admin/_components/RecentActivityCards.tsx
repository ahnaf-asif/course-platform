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
  SimpleGrid,
  Avatar,
} from '@mantine/core';
import {
  IconShoppingCart,
  IconUsers,
  IconArrowRight,
  IconCheck,
  IconClock,
  IconRotateClockwise,
} from '@tabler/icons-react';
import Link from 'next/link';
import type {
  AdminOrderResponse,
  RecentUserItem,
} from '@/api/model/components-schemas-commerce';

interface RecentActivityCardsProps {
  recentOrders?: AdminOrderResponse[];
  recentUsers?: RecentUserItem[];
  isLoading?: boolean;
}

export function RecentActivityCards({
  recentOrders = [],
  recentUsers = [],
  isLoading,
}: RecentActivityCardsProps) {
  if (isLoading) {
    return (
      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
        <Skeleton height={280} radius="md" />
        <Skeleton height={280} radius="md" />
      </SimpleGrid>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge color="green" variant="light" size="xs" leftSection={<IconCheck size={10} />}>Completed</Badge>;
      case 'PENDING':
        return <Badge color="yellow" variant="light" size="xs" leftSection={<IconClock size={10} />}>Pending</Badge>;
      case 'REFUNDED':
        return <Badge color="red" variant="light" size="xs" leftSection={<IconRotateClockwise size={10} />}>Refunded</Badge>;
      default:
        return <Badge color="gray" variant="light" size="xs">{status}</Badge>;
    }
  };

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
      {/* Recent Orders Card */}
      <Card p="lg" radius="md" withBorder shadow="xs">
        <Group justify="space-between" align="center" mb="md">
          <Group gap="xs">
            <IconShoppingCart size={20} color="#2563eb" />
            <Title order={4} fw={700} style={{ color: '#0f172a' }}>
              সাম্প্রতিক অর্ডারসমূহ (Recent Orders)
            </Title>
          </Group>
          <Button
            variant="subtle"
            size="xs"
            component={Link}
            href="/admin/orders"
            rightSection={<IconArrowRight size={14} />}
          >
            সকল অর্ডার
          </Button>
        </Group>

        {recentOrders.length === 0 ? (
          <Box p="xl" ta="center">
            <Text size="sm" c="dimmed">
              কোনো সাম্প্রতিক অর্ডার নেই।
            </Text>
          </Box>
        ) : (
          <Table verticalSpacing="xs" highlightOnHover>
            <Table.Thead style={{ backgroundColor: '#f8fafc' }}>
              <Table.Tr>
                <Table.Th>শিক্ষার্থী</Table.Th>
                <Table.Th>কোর্স</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>মূল্য</Table.Th>
                <Table.Th style={{ textAlign: 'center' }}>স্ট্যাটাস</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recentOrders.map((order) => (
                <Table.Tr key={order.id}>
                  <Table.Td>
                    <Stack gap={0} style={{ maxWidth: 140 }}>
                      <Text size="xs" fw={600} truncate title={order.user_name}>
                        {order.user_name}
                      </Text>
                      <Text size="10px" c="dimmed" truncate title={order.user_email}>
                        {order.user_email}
                      </Text>
                    </Stack>
                  </Table.Td>

                  <Table.Td>
                    <Text size="xs" fw={500} style={{ maxWidth: 160 }} truncate title={order.course_title}>
                      {order.course_title}
                    </Text>
                  </Table.Td>

                  <Table.Td style={{ textAlign: 'right' }}>
                    <Text size="xs" fw={700} c="teal.8">
                      ৳{parseFloat(order.amount_paid).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                    </Text>
                  </Table.Td>

                  <Table.Td style={{ textAlign: 'center' }}>
                    {getStatusBadge(order.status)}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>

      {/* Recent Users Card */}
      <Card p="lg" radius="md" withBorder shadow="xs">
        <Group justify="space-between" align="center" mb="md">
          <Group gap="xs">
            <IconUsers size={20} color="#16a34a" />
            <Title order={4} fw={700} style={{ color: '#0f172a' }}>
              নতুন নিবন্ধিত শিক্ষার্থী (New Users)
            </Title>
          </Group>
          <Button
            variant="subtle"
            size="xs"
            component={Link}
            href="/admin/users"
            rightSection={<IconArrowRight size={14} />}
          >
            সকল ইউজার
          </Button>
        </Group>

        {recentUsers.length === 0 ? (
          <Box p="xl" ta="center">
            <Text size="sm" c="dimmed">
              কোনো সাম্প্রতিক শিক্ষার্থী নিবন্ধন নেই।
            </Text>
          </Box>
        ) : (
          <Table verticalSpacing="xs" highlightOnHover>
            <Table.Thead style={{ backgroundColor: '#f8fafc' }}>
              <Table.Tr>
                <Table.Th>প্রোফাইল</Table.Th>
                <Table.Th>রোল</Table.Th>
                <Table.Th style={{ textAlign: 'right' }}>যোগদানের তারিখ</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {recentUsers.map((user) => (
                <Table.Tr key={user.id}>
                  <Table.Td>
                    <Group gap="xs" wrap="nowrap">
                      <Avatar size="sm" radius="xl" color="blue" src={user.avatar_url || undefined}>
                        {user.full_name.charAt(0).toUpperCase()}
                      </Avatar>
                      <Stack gap={0} style={{ maxWidth: 180 }}>
                        <Text size="xs" fw={600} truncate title={user.full_name}>
                          {user.full_name}
                        </Text>
                        <Text size="10px" c="dimmed" truncate title={user.email}>
                          {user.email}
                        </Text>
                      </Stack>
                    </Group>
                  </Table.Td>

                  <Table.Td>
                    <Badge size="xs" variant="outline" color={user.role === 'ADMIN' ? 'red' : 'blue'}>
                      {user.role}
                    </Badge>
                  </Table.Td>

                  <Table.Td style={{ textAlign: 'right' }}>
                    <Text size="xs" c="dimmed">
                      {new Date(user.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Card>
    </SimpleGrid>
  );
}
