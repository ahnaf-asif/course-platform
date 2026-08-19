'use client';

import React, { useState } from 'react';
import {
  Modal,
  Stack,
  Group,
  Text,
  Badge,
  Paper,
  Divider,
  Button,
  CopyButton,
  ActionIcon,
  Tooltip,
  Skeleton,
  Alert,
  SimpleGrid,
} from '@mantine/core';
import {
  IconCheck,
  IconCopy,
  IconReceipt,
  IconUser,
  IconBook,
  IconCreditCard,
  IconTag,
  IconRotateClockwise,
  IconAlertCircle,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
  useGetAdminOrdersId,
  usePatchAdminOrdersIdStatus,
} from '@/api/generated/admin-commerce/admin-commerce';
import type { UpdateOrderStatusRequestStatus as OrderStatus } from '@/api/model/components-schemas-commerce';

interface OrderDetailModalProps {
  opened: boolean;
  onClose: () => void;
  orderId: string | null;
  onStatusUpdated?: () => void;
}

export function OrderDetailModal({ opened, onClose, orderId, onStatusUpdated }: OrderDetailModalProps) {
  const { data: order, isLoading, isError, refetch } = useGetAdminOrdersId(orderId || '', {
    query: {
      enabled: !!orderId && opened,
    },
  });

  const { mutateAsync: updateStatus, isPending: isUpdating } = usePatchAdminOrdersIdStatus();
  const [confirmStatus, setConfirmStatus] = useState<OrderStatus | null>(null);

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (!orderId) return;
    try {
      await updateStatus({
        id: orderId,
        data: { status: newStatus },
      });
      notifications.show({
        title: 'অর্ডার স্ট্যাটাস আপডেট হয়েছে',
        message: `অর্ডারের স্ট্যাটাস সফলভাবে '${newStatus}' করা হয়েছে।`,
        color: 'green',
      });
      setConfirmStatus(null);
      refetch();
      if (onStatusUpdated) onStatusUpdated();
    } catch (error) {
      console.error('Failed to update order status:', error);
      notifications.show({
        title: 'স্ট্যাটাস পরিবর্তন ব্যর্থ',
        message: 'অর্ডারের স্ট্যাটাস পরিবর্তন করা সম্ভব হয়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।',
        color: 'red',
      });
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge color="green" variant="light" size="lg">সফল (Completed)</Badge>;
      case 'PENDING':
        return <Badge color="yellow" variant="light" size="lg">অপেক্ষারত (Pending)</Badge>;
      case 'REFUNDED':
        return <Badge color="red" variant="light" size="lg">রিফান্ড (Refunded)</Badge>;
      default:
        return <Badge color="gray" variant="light" size="lg">{status || 'Unknown'}</Badge>;
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={() => {
        setConfirmStatus(null);
        onClose();
      }}
      title={
        <Group gap="xs">
          <IconReceipt size={20} color="#2563eb" />
          <Text fw={700} size="lg">
            অর্ডার বিবরণী (Order Details)
          </Text>
        </Group>
      }
      size="lg"
      radius="md"
      centered
    >
      {isLoading ? (
        <Stack gap="md">
          <Skeleton height={60} radius="md" />
          <Skeleton height={120} radius="md" />
          <Skeleton height={120} radius="md" />
        </Stack>
      ) : isError || !order ? (
        <Alert color="red" icon={<IconAlertCircle size={16} />} title="Error">
          অর্ডারের তথ্য লোড করা সম্ভব হয়নি।
        </Alert>
      ) : (
        <Stack gap="md">
          {/* Header Card */}
          <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#f8fafc' }}>
            <Group justify="space-between" align="center">
              <div>
                <Text size="xs" c="dimmed" fw={600} tt="uppercase">
                  অর্ডার আইডি
                </Text>
                <Group gap={6}>
                  <Text fw={700} size="sm" style={{ fontFamily: 'monospace' }}>
                    {order.id}
                  </Text>
                  <CopyButton value={order.id} timeout={2000}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? 'কপি হয়েছে' : 'কপি করুন'} withArrow position="right">
                        <ActionIcon color={copied ? 'teal' : 'gray'} variant="subtle" size="xs" onClick={copy}>
                          {copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
              </div>
              <div>{getStatusBadge(order.status)}</div>
            </Group>
          </Paper>

          {/* Student Info Card */}
          <Paper p="md" radius="md" withBorder>
            <Group gap="xs" mb="xs">
              <IconUser size={18} color="#0284c7" />
              <Text fw={700} size="sm">
                শিক্ষার্থী তথ্য (Customer Information)
              </Text>
            </Group>
            <Divider mb="xs" />
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <div>
                <Text size="xs" c="dimmed">
                  শিক্ষার্থীর নাম
                </Text>
                <Text size="sm" fw={600}>
                  {order.user_name}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  ইমেইল অ্যাড্রেস
                </Text>
                <Group gap={4}>
                  <Text size="sm" fw={600}>
                    {order.user_email}
                  </Text>
                  <CopyButton value={order.user_email} timeout={2000}>
                    {({ copied, copy }) => (
                      <ActionIcon color={copied ? 'teal' : 'gray'} variant="subtle" size="xs" onClick={copy}>
                        {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                      </ActionIcon>
                    )}
                  </CopyButton>
                </Group>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  ইউজার আইডি
                </Text>
                <Text size="xs" style={{ fontFamily: 'monospace' }} c="dimmed">
                  {order.user_id}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  ইউজার রোল
                </Text>
                <Badge size="sm" variant="outline" color="blue">
                  {order.user_role}
                </Badge>
              </div>
            </SimpleGrid>
          </Paper>

          {/* Course Info Card */}
          <Paper p="md" radius="md" withBorder>
            <Group gap="xs" mb="xs">
              <IconBook size={18} color="#16a34a" />
              <Text fw={700} size="sm">
                কোর্স তথ্য (Course Information)
              </Text>
            </Group>
            <Divider mb="xs" />
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <div>
                <Text size="xs" c="dimmed">
                  কোর্সের নাম
                </Text>
                <Text size="sm" fw={700} c="blue.8">
                  {order.course_title}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  কোর্স স্লাগ
                </Text>
                <Text size="sm">
                  {order.course_slug || 'N/A'}
                </Text>
              </div>
            </SimpleGrid>
          </Paper>

          {/* Payment & Financials Card */}
          <Paper p="md" radius="md" withBorder>
            <Group gap="xs" mb="xs">
              <IconCreditCard size={18} color="#d97706" />
              <Text fw={700} size="sm">
                পেমেন্ট ও ট্রানজেকশন (Payment & Billing)
              </Text>
            </Group>
            <Divider mb="xs" />
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <div>
                <Text size="xs" c="dimmed">
                  পরিশোধিত মূল্য (Amount Paid)
                </Text>
                <Text size="lg" fw={800} c="teal.7">
                  ৳{parseFloat(order.amount_paid).toLocaleString('en-US', { minimumFractionDigits: 2 })} {order.currency}
                </Text>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  পেমেন্ট মাধ্যম (Gateway)
                </Text>
                <Badge color="cyan" variant="light" size="md">
                  {order.payment_provider.toUpperCase()}
                </Badge>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  ট্রানজেকশন রেফারেন্স (Val / Tran ID)
                </Text>
                <Group gap={4}>
                  <Text size="xs" fw={600} style={{ fontFamily: 'monospace' }}>
                    {order.provider_reference}
                  </Text>
                  <CopyButton value={order.provider_reference} timeout={2000}>
                    {({ copied, copy }) => (
                      <ActionIcon color={copied ? 'teal' : 'gray'} variant="subtle" size="xs" onClick={copy}>
                        {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
                      </ActionIcon>
                    )}
                  </CopyButton>
                </Group>
              </div>
              <div>
                <Text size="xs" c="dimmed">
                  অর্ডারের তারিখ ও সময়
                </Text>
                <Text size="xs" fw={500}>
                  {new Date(order.created_at).toLocaleString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </div>
            </SimpleGrid>

            {order.coupon_code && (
              <>
                <Divider my="sm" />
                <Group gap="xs">
                  <IconTag size={16} color="#7c3aed" />
                  <Text size="xs" fw={600}>
                    ব্যবহৃত কুপন:
                  </Text>
                  <Badge color="violet" variant="filled" size="sm">
                    {order.coupon_code}
                  </Badge>
                  {order.coupon_discount_value && (
                    <Text size="xs" c="dimmed">
                      (ডিসকাউন্ট: {order.coupon_discount_type === 'PERCENTAGE' ? `${order.coupon_discount_value}%` : `৳${order.coupon_discount_value}`})
                    </Text>
                  )}
                </Group>
              </>
            )}
          </Paper>

          {/* Status Update Confirmation or Action Buttons */}
          {confirmStatus ? (
            <Alert color={confirmStatus === 'COMPLETED' ? 'green' : 'red'} title="নিশ্চিতকরণ প্রয়োজন">
              <Stack gap="xs">
                <Text size="sm">
                  আপনি কি নিশ্চিতভাবে এই অর্ডারের স্ট্যাটাস পরিবর্তন করে{' '}
                  <strong>{confirmStatus}</strong> করতে চান?{' '}
                  {confirmStatus === 'COMPLETED' && 'এটি শিক্ষার্থীকে স্বয়ংক্রিয়ভাবে কোর্সে অ্যাক্সেস প্রদান করবে।'}
                </Text>
                <Group justify="flex-end" gap="xs">
                  <Button size="xs" variant="default" onClick={() => setConfirmStatus(null)}>
                    বাতিল করুন
                  </Button>
                  <Button
                    size="xs"
                    color={confirmStatus === 'COMPLETED' ? 'green' : 'red'}
                    loading={isUpdating}
                    onClick={() => handleStatusChange(confirmStatus)}
                  >
                    হ্যাঁ, পরিবর্তন করুন
                  </Button>
                </Group>
              </Stack>
            </Alert>
          ) : (
            <Group justify="flex-end" gap="sm" mt="xs">
              {order.status === 'PENDING' && (
                <Button
                  color="green"
                  leftSection={<IconCheck size={16} />}
                  onClick={() => setConfirmStatus('COMPLETED')}
                  data-testid="btn-mark-completed"
                >
                  অনুমোদন করুন (Mark Completed)
                </Button>
              )}
              {order.status === 'COMPLETED' && (
                <Button
                  color="red"
                  variant="light"
                  leftSection={<IconRotateClockwise size={16} />}
                  onClick={() => setConfirmStatus('REFUNDED')}
                  data-testid="btn-mark-refunded"
                >
                  রিফান্ড করুন (Mark Refunded)
                </Button>
              )}
              {order.status === 'REFUNDED' && (
                <Button
                  color="blue"
                  variant="light"
                  leftSection={<IconCheck size={16} />}
                  onClick={() => setConfirmStatus('COMPLETED')}
                  data-testid="btn-reactivate"
                >
                  পুনরায় সক্রিয় করুন (Reactivate)
                </Button>
              )}
              <Button variant="default" onClick={onClose}>
                বন্ধ করুন
              </Button>
            </Group>
          )}
        </Stack>
      )}
    </Modal>
  );
}
