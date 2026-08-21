'use client';

import React, { useState } from 'react';
import {
  Title,
  Stack,
  Card,
  Group,
  TextInput,
  Select,
  Button,
  Table,
  Badge,
  Text,
  ActionIcon,
  Pagination,
  Skeleton,
  Alert,
  CopyButton,
  Tooltip,
  Menu,
  Box,
  Avatar,
  CloseButton,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import {
  IconSearch,
  IconRefresh,
  IconDownload,
  IconEye,
  IconCheck,
  IconRotateClockwise,
  IconDotsVertical,
  IconAlertCircle,
  IconCopy,
  IconFilterOff,
  IconReceipt,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetAdminOrders,
  useGetAdminOrdersSummary,
  usePatchAdminOrdersIdStatus,
} from '@/api/generated/admin-commerce/admin-commerce';
import type {
  AdminOrderResponse,
  AdminOrderResponseStatus as OrderStatus,
} from '@/api/model/components-schemas-commerce';
import { OrderSummaryCards } from './OrderSummaryCards';
import { OrderDetailModal } from './OrderDetailModal';

export default function OrdersManagement() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<string>('20');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [gatewayFilter, setGatewayFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch] = useDebouncedValue(searchQuery, 400);

  // Selected Order for Detail Modal
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [detailModalOpened, setDetailModalOpened] = useState<boolean>(false);

  // Fetch Orders Summary Stats
  const {
    data: summaryData,
    isLoading: isLoadingSummary,
    refetch: refetchSummary,
  } = useGetAdminOrdersSummary();

  // Fetch Orders List
  const {
    data: ordersData,
    isLoading: isLoadingOrders,
    isFetching: isFetchingOrders,
    isError: isOrdersError,
    refetch: refetchOrders,
  } = useGetAdminOrders({
    page,
    limit: parseInt(limit, 10) || 20,
    status: statusFilter ? (statusFilter as OrderStatus) : undefined,
    payment_provider: gatewayFilter || undefined,
    search: debouncedSearch.trim() || undefined,
  });

  const { mutateAsync: updateStatus } = usePatchAdminOrdersIdStatus();

  const handleRefresh = () => {
    refetchSummary();
    refetchOrders();
  };

  const handleOpenDetail = (orderId: string) => {
    setSelectedOrderId(orderId);
    setDetailModalOpened(true);
  };

  const handleQuickStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await updateStatus({
        id: orderId,
        data: { status: newStatus },
      });
      notifications.show({
        title: 'স্ট্যাটাস আপডেট সফল',
        message: `অর্ডার স্ট্যাটাস সফলভাবে '${newStatus}' করা হয়েছে।`,
        color: 'green',
      });
      refetchOrders();
      refetchSummary();
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    } catch (error) {
      console.error('Failed to update status:', error);
      notifications.show({
        title: 'স্ট্যাটাস আপডেট ব্যর্থ',
        message: 'স্ট্যাটাস পরিবর্তন করা সম্ভব হয়নি।',
        color: 'red',
      });
    }
  };

  const handleResetFilters = () => {
    setStatusFilter(null);
    setGatewayFilter(null);
    setSearchQuery('');
    setPage(1);
  };

  // CSV Export for accounting / reporting
  const handleExportCSV = () => {
    if (!ordersData?.orders || ordersData.orders.length === 0) {
      notifications.show({
        title: 'এক্সপোর্ট করার তথ্য নেই',
        message: 'বর্তমান ফিল্টারে কোনো অর্ডার পাওয়া যায়নি।',
        color: 'yellow',
      });
      return;
    }

    const headers = [
      'Order ID',
      'Student Name',
      'Student Email',
      'Course Title',
      'Amount Paid',
      'Currency',
      'Status',
      'Payment Provider',
      'Transaction Ref',
      'Coupon Code',
      'Created At',
    ];

    const rows = ordersData.orders.map((o: AdminOrderResponse) => [
      `"${o.id}"`,
      `"${o.user_name.replace(/"/g, '""')}"`,
      `"${o.user_email}"`,
      `"${o.course_title.replace(/"/g, '""')}"`,
      o.amount_paid,
      o.currency,
      o.status,
      o.payment_provider,
      `"${o.provider_reference}"`,
      `"${o.coupon_code || ''}"`,
      `"${new Date(o.created_at).toISOString()}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `orders_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    notifications.show({
      title: 'CSV ডাউনলোড সম্পন্ন',
      message: `${ordersData.orders.length} টি অর্ডারের রিপোর্ট ডাউনলোড করা হয়েছে।`,
      color: 'green',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <Badge color="green" variant="light" size="sm" leftSection={<IconCheck size={12} />}>
            Completed
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge color="yellow" variant="light" size="sm">
            Pending
          </Badge>
        );
      case 'REFUNDED':
        return (
          <Badge color="red" variant="light" size="sm" leftSection={<IconRotateClockwise size={12} />}>
            Refunded
          </Badge>
        );
      default:
        return (
          <Badge color="gray" variant="light" size="sm">
            {status}
          </Badge>
        );
    }
  };

  const hasActiveFilters = !!statusFilter || !!gatewayFilter || !!searchQuery;

  return (
    <Stack gap="lg" p={{ base: 'sm', md: 'md' }}>
      {/* Header */}
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <div>
          <Group gap="xs" align="center">
            <IconReceipt size={28} color="#2563eb" />
            <Title order={2} style={{ fontWeight: 800, color: '#0f172a' }}>
              অর্ডার ও ট্রানজেকশন (Orders Management)
            </Title>
          </Group>
          <Text size="sm" c="dimmed" mt={2}>
            সকল কোর্স ক্রয়, পেমেন্ট ট্রানজেকশন, কুপন ডিসকাউন্ট ও এনরোলমেন্ট পরিচালনা করুন।
          </Text>
        </div>

        <Group gap="xs">
          <Button
            variant="light"
            color="blue"
            leftSection={<IconRefresh size={16} className={isFetchingOrders ? 'animate-spin' : ''} />}
            onClick={handleRefresh}
            data-testid="btn-refresh-orders"
          >
            রিফ্রেশ
          </Button>
          <Button
            variant="outline"
            color="teal"
            leftSection={<IconDownload size={16} />}
            onClick={handleExportCSV}
            data-testid="btn-export-orders"
          >
            রিপোর্ট এক্সপোর্ট (CSV)
          </Button>
        </Group>
      </Group>

      {/* Metric Summary Cards */}
      <OrderSummaryCards summary={summaryData} isLoading={isLoadingSummary} />

      {/* Filter and Search Bar */}
      <Card p="md" radius="md" withBorder shadow="xs">
        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
          <Group gap="sm" style={{ flex: 1 }} wrap="wrap">
            <TextInput
              placeholder="শিক্ষার্থী নাম, ইমেইল, কোর্স বা ট্রানজেকশন আইডি খুঁজুন..."
              leftSection={<IconSearch size={16} />}
              rightSection={
                searchQuery ? (
                  <CloseButton
                    size="sm"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setSearchQuery('');
                      setPage(1);
                    }}
                    aria-label="Clear search"
                  />
                ) : null
              }
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.currentTarget.value);
                setPage(1);
              }}
              style={{ minWidth: 280, flex: 1 }}
              data-testid="input-search-orders"
            />

            <Select
              placeholder="সব স্ট্যাটাস"
              data={[
                { value: '', label: 'সকল স্ট্যাটাস (All)' },
                { value: 'COMPLETED', label: '✅ সফল (Completed)' },
                { value: 'PENDING', label: '⏳ অপেক্ষারত (Pending)' },
                { value: 'REFUNDED', label: '🔄 রিফান্ড (Refunded)' },
              ]}
              value={statusFilter || ''}
              onChange={(val) => {
                setStatusFilter(val || null);
                setPage(1);
              }}
              style={{ width: 190 }}
              data-testid="select-status-filter"
            />

            <Select
              placeholder="পেমেন্ট মেথড"
              data={[
                { value: '', label: 'সকল মেথড (All)' },
                { value: 'sslcommerz', label: '💳 SSLCommerz' },
                { value: 'direct', label: '🎁 Direct / Free' },
                { value: 'bkash', label: '📱 bKash' },
                { value: 'nagad', label: '📱 Nagad' },
                { value: 'manual', label: '📝 Manual' },
              ]}
              value={gatewayFilter || ''}
              onChange={(val) => {
                setGatewayFilter(val || null);
                setPage(1);
              }}
              style={{ width: 170 }}
              data-testid="select-gateway-filter"
            />

            {hasActiveFilters && (
              <Button
                variant="subtle"
                color="gray"
                size="sm"
                leftSection={<IconFilterOff size={16} />}
                onClick={handleResetFilters}
              >
                রিসেট
              </Button>
            )}
          </Group>

          <Group gap="xs">
            <Text size="xs" c="dimmed">
              প্রতি পেজে:
            </Text>
            <Select
              data={['10', '20', '50', '100']}
              value={limit}
              onChange={(val) => {
                setLimit(val || '20');
                setPage(1);
              }}
              style={{ width: 75 }}
              size="xs"
            />
          </Group>
        </Group>
      </Card>

      {/* Orders Table */}
      <Card p={0} radius="md" withBorder shadow="xs" style={{ overflow: 'hidden' }}>
        {isLoadingOrders ? (
          <Stack p="md" gap="md">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} height={45} radius="sm" />
            ))}
          </Stack>
        ) : isOrdersError ? (
          <Box p="xl">
            <Alert color="red" icon={<IconAlertCircle size={16} />} title="Error">
              অর্ডার তালিকা লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে রিফ্রেশ করুন।
            </Alert>
          </Box>
        ) : !ordersData?.orders || ordersData.orders.length === 0 ? (
          <Box p="xl" ta="center">
            <Stack align="center" gap="sm">
              <IconReceipt size={48} color="#94a3b8" />
              <Text fw={700} size="lg" c="dimmed">
                কোনো অর্ডার পাওয়া যায়নি
              </Text>
              <Text size="sm" c="dimmed">
                {hasActiveFilters
                  ? 'আপনার ফিল্টারের সাথে মিলে এমন কোনো অর্ডার পাওয়া যায়নি। ফিল্টার রিসেট করে পুনরায় চেষ্টা করুন।'
                  : 'এখনো কোনো অর্ডার সম্পন্ন করা হয়নি।'}
              </Text>
              {hasActiveFilters && (
                <Button variant="light" size="xs" onClick={handleResetFilters}>
                  ফিল্টার রিসেট করুন
                </Button>
              )}
            </Stack>
          </Box>
        ) : (
          <Box style={{ overflowX: 'auto' }}>
            <Table striped highlightOnHover verticalSpacing="sm" horizontalSpacing="md">
              <Table.Thead style={{ backgroundColor: '#f8fafc' }}>
                <Table.Tr>
                  <Table.Th style={{ fontWeight: 700 }}>অর্ডার আইডি ও রেফ</Table.Th>
                  <Table.Th style={{ fontWeight: 700 }}>শিক্ষার্থী</Table.Th>
                  <Table.Th style={{ fontWeight: 700 }}>কোর্স</Table.Th>
                  <Table.Th style={{ fontWeight: 700 }}>মূল্য</Table.Th>
                  <Table.Th style={{ fontWeight: 700 }}>মেথড</Table.Th>
                  <Table.Th style={{ fontWeight: 700 }}>স্ট্যাটাস</Table.Th>
                  <Table.Th style={{ fontWeight: 700 }}>তারিখ ও সময়</Table.Th>
                  <Table.Th style={{ textAlign: 'right', fontWeight: 700 }}>অ্যাকশন</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {ordersData.orders.map((order: AdminOrderResponse) => {
                  const amount = parseFloat(order.amount_paid);
                  const formattedAmount = isNaN(amount)
                    ? '৳0.00'
                    : `৳${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

                  return (
                    <Table.Tr key={order.id} data-testid={`order-row-${order.id}`}>
                      {/* Order ID & Reference */}
                      <Table.Td>
                        <Group gap={6} align="center">
                          <Text size="xs" fw={700} style={{ fontFamily: 'monospace', color: '#1e293b' }}>
                            {order.id.slice(0, 8)}...
                          </Text>
                          <CopyButton value={order.id} timeout={2000}>
                            {({ copied, copy }) => (
                              <Tooltip label={copied ? 'কপি হয়েছে' : 'অর্ডার আইডি কপি'} withArrow position="top">
                                <ActionIcon color={copied ? 'teal' : 'gray'} variant="subtle" size="xs" onClick={copy}>
                                  {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                                </ActionIcon>
                              </Tooltip>
                            )}
                          </CopyButton>
                        </Group>
                        {order.provider_reference && order.provider_reference !== 'pending' && (
                          <Text size="10px" c="dimmed" style={{ fontFamily: 'monospace' }}>
                            Ref: {order.provider_reference.slice(0, 14)}
                          </Text>
                        )}
                      </Table.Td>

                      {/* Student Info */}
                      <Table.Td>
                        <Group gap="xs" wrap="nowrap">
                          <Avatar size="sm" radius="xl" color="blue">
                            {order.user_name.charAt(0).toUpperCase()}
                          </Avatar>
                          <Stack gap={0} style={{ maxWidth: 180, overflow: 'hidden' }}>
                            <Text size="sm" fw={600} truncate title={order.user_name}>
                              {order.user_name}
                            </Text>
                            <Text size="xs" c="dimmed" truncate title={order.user_email}>
                              {order.user_email}
                            </Text>
                          </Stack>
                        </Group>
                      </Table.Td>

                      {/* Course Info */}
                      <Table.Td>
                        <Text size="sm" fw={600} style={{ maxWidth: 220 }} truncate title={order.course_title}>
                          {order.course_title}
                        </Text>
                        {order.course_slug && (
                          <Text size="xs" c="dimmed">
                            {order.course_slug}
                          </Text>
                        )}
                      </Table.Td>

                      {/* Amount & Coupon */}
                      <Table.Td>
                        <Text size="sm" fw={700} c="teal.8">
                          {formattedAmount}
                        </Text>
                        {order.coupon_code && (
                          <Badge size="xs" color="violet" variant="outline">
                            {order.coupon_code}
                          </Badge>
                        )}
                      </Table.Td>

                      {/* Payment Provider */}
                      <Table.Td>
                        <Badge variant="dot" color={order.payment_provider === 'direct' ? 'teal' : 'blue'} size="sm">
                          {order.payment_provider.toUpperCase()}
                        </Badge>
                      </Table.Td>

                      {/* Status */}
                      <Table.Td>{getStatusBadge(order.status)}</Table.Td>

                      {/* Date */}
                      <Table.Td>
                        <Text size="xs" fw={500}>
                          {new Date(order.created_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Text>
                        <Text size="10px" c="dimmed">
                          {new Date(order.created_at).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </Table.Td>

                      {/* Actions */}
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Group gap={4} justify="flex-end" wrap="nowrap">
                          <Tooltip label="বিস্তারিত দেখুন" withArrow position="top">
                            <ActionIcon
                              variant="light"
                              color="blue"
                              size="sm"
                              onClick={() => handleOpenDetail(order.id)}
                              data-testid={`btn-view-order-${order.id}`}
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>

                          <Menu shadow="md" width={180} position="bottom-end">
                            <Menu.Target>
                              <ActionIcon variant="subtle" color="gray" size="sm">
                                <IconDotsVertical size={16} />
                              </ActionIcon>
                            </Menu.Target>

                            <Menu.Dropdown>
                              <Menu.Item
                                leftSection={<IconEye size={14} />}
                                onClick={() => handleOpenDetail(order.id)}
                              >
                                বিস্তারিত দেখুন
                              </Menu.Item>

                              {order.status === 'PENDING' && (
                                <Menu.Item
                                  leftSection={<IconCheck size={14} color="green" />}
                                  onClick={() => handleQuickStatusChange(order.id, 'COMPLETED')}
                                >
                                  অনুমোদন করুন (Complete)
                                </Menu.Item>
                              )}

                              {order.status === 'COMPLETED' && (
                                <Menu.Item
                                  color="red"
                                  leftSection={<IconRotateClockwise size={14} />}
                                  onClick={() => handleQuickStatusChange(order.id, 'REFUNDED')}
                                >
                                  রিফান্ড করুন (Refund)
                                </Menu.Item>
                              )}

                              <Menu.Divider />
                              <CopyButton value={order.id}>
                                {({ copy }) => (
                                  <Menu.Item leftSection={<IconCopy size={14} />} onClick={copy}>
                                    অর্ডার আইডি কপি
                                  </Menu.Item>
                                )}
                              </CopyButton>
                              <CopyButton value={order.user_email}>
                                {({ copy }) => (
                                  <Menu.Item leftSection={<IconCopy size={14} />} onClick={copy}>
                                    ইমেইল কপি
                                  </Menu.Item>
                                )}
                              </CopyButton>
                            </Menu.Dropdown>
                          </Menu>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
              </Table.Tbody>
            </Table>
          </Box>
        )}

        {/* Pagination Footer */}
        {ordersData && ordersData.total_count > 0 && (
          <Box p="md" style={{ borderTop: '1px solid #e2e8f0', backgroundColor: '#fbfcfe' }}>
            <Group justify="space-between" align="center" wrap="wrap" gap="sm">
              <Text size="xs" c="dimmed">
                মোট <strong>{ordersData.total_count}</strong> টি অর্ডারের মধ্যে{' '}
                <strong>{(page - 1) * parseInt(limit, 10) + 1}</strong> -{' '}
                <strong>{Math.min(page * parseInt(limit, 10), ordersData.total_count)}</strong> প্রদর্শিত হচ্ছে
              </Text>

              <Pagination
                total={ordersData.total_pages || 1}
                value={page}
                onChange={setPage}
                size="sm"
                radius="md"
                withEdges
              />
            </Group>
          </Box>
        )}
      </Card>

      {/* Order Detail Modal */}
      <OrderDetailModal
        opened={detailModalOpened}
        onClose={() => {
          setDetailModalOpened(false);
          setSelectedOrderId(null);
        }}
        orderId={selectedOrderId}
        onStatusUpdated={() => {
          refetchOrders();
          refetchSummary();
        }}
      />
    </Stack>
  );
}
