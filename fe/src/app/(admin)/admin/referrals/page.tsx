'use client';

import React, { useState } from 'react';
import {
  Stack,
  Title,
  Text,
  Group,
  Card,
  SimpleGrid,
  Button,
  Badge,
  Tabs,
  Table,
  Modal,
  TextInput,
  Textarea,
  NumberInput,
  Switch,
  Skeleton,
  Paper,
  Box,
  ThemeIcon,
  SegmentedControl,
  Pagination,
  Alert,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconGift,
  IconCheck,
  IconX,
  IconClock,
  IconReceipt,
  IconCurrencyTaka,
  IconUsers,
  IconSearch,
  IconRefresh,
  IconAlertCircle,
  IconSettings,
  IconHistory,
  IconRotateClockwise,
} from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetAdminReferralsSummary,
  useGetAdminReferralsPayouts,
  usePatchAdminReferralsPayoutsIdStatus,
  useGetAdminReferralsEarnings,
  useGetAdminReferralsSettings,
  usePutAdminReferralsSettings,
} from '@/api/generated/admin-referral/admin-referral';
import type {
  AdminPayoutItem,
  AdminReferralSettingsResponse,
} from '@/api/model/components-schemas-referral';

interface ReferralSettingsFormProps {
  settings?: AdminReferralSettingsResponse;
  onSave: (data: {
    commission_percentage: number;
    buyer_discount_percentage: number;
    min_payout_amount: number;
    is_enabled: boolean;
    terms_and_conditions: string;
  }) => void;
  isSaving: boolean;
}

function ReferralSettingsForm({ settings, onSave, isSaving }: ReferralSettingsFormProps) {
  const [commissionPct, setCommissionPct] = useState<number>(
    settings?.commission_percentage ?? 10
  );
  const [buyerDiscountPct, setBuyerDiscountPct] = useState<number>(
    settings?.buyer_discount_percentage ?? 5
  );
  const [minPayout, setMinPayout] = useState<number>(
    settings?.min_payout_amount ?? 500
  );
  const [isEnabled, setIsEnabled] = useState<boolean>(
    settings?.is_enabled ?? true
  );
  const [terms, setTerms] = useState<string>(
    settings?.terms_and_conditions || ''
  );

  return (
    <Stack gap="lg" style={{ maxWidth: 650 }}>
      <Paper p="md" radius="md" withBorder style={{ backgroundColor: '#f8fafc' }}>
        <Group justify="space-between" align="center">
          <div>
            <Text size="sm" fw={700}>
              রেফারাল প্রোগ্রাম চালু রাখুন
            </Text>
            <Text size="xs" c="dimmed">
              সক্রিয় থাকলে শিক্ষার্থীরা রেফারাল কোড তৈরি ও বিক্রয় কমিশন পাবে।
            </Text>
          </div>
          <Switch
            size="md"
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.currentTarget.checked)}
            data-testid="switch-referral-enabled"
          />
        </Group>
      </Paper>

      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
        <NumberInput
          label="রেফারার কমিশন (%)"
          description="রেফারার কত % কমিশন পাবে"
          min={0}
          max={100}
          decimalScale={2}
          value={commissionPct}
          onChange={(val) => setCommissionPct(typeof val === 'number' ? val : 10)}
          required
          data-testid="input-commission-pct"
        />

        <NumberInput
          label="ক্রেতার ছাড় (%)"
          description="রেফারাল কোডে ক্রেতা কত % ছাড় পাবে"
          min={0}
          max={100}
          decimalScale={2}
          value={buyerDiscountPct}
          onChange={(val) => setBuyerDiscountPct(typeof val === 'number' ? val : 5)}
          required
          data-testid="input-buyer-discount-pct"
        />

        <NumberInput
          label="সর্বনিম্ন উত্তোলন (BDT ৳)"
          description="উত্তোলনের ন্যূনতম ব্যালেন্স"
          min={0}
          step={50}
          value={minPayout}
          onChange={(val) => setMinPayout(typeof val === 'number' ? val : 500)}
          required
          data-testid="input-min-payout"
        />
      </SimpleGrid>

      <Textarea
        label="রেফারাল নীতিমালা ও শর্তাবলী (Terms & Conditions)"
        description="রেফারাল পৃষ্ঠায় শিক্ষার্থীদের দেখানোর নিয়মাবলী"
        placeholder="যেমন: রেফারাল কমিশন পেতে হলে..."
        rows={5}
        value={terms}
        onChange={(e) => setTerms(e.currentTarget.value)}
      />

      <Group justify="flex-start" mt="md">
        <Button
          color="teal"
          loading={isSaving}
          onClick={() =>
            onSave({
              commission_percentage: commissionPct,
              buyer_discount_percentage: buyerDiscountPct,
              min_payout_amount: minPayout,
              is_enabled: isEnabled,
              terms_and_conditions: terms,
            })
          }
          data-testid="btn-save-referral-settings"
        >
          সেটিংস সংরক্ষণ করুন
        </Button>
      </Group>
    </Stack>
  );
}

export default function AdminReferralsPage() {
  const [activeTab, setActiveTab] = useState<string | null>('payouts');

  // Summary Metrics
  const {
    data: summary,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
  } = useGetAdminReferralsSummary();

  // Settings
  const {
    data: settings,
    refetch: refetchSettings,
  } = useGetAdminReferralsSettings();

  const putSettingsMutation = usePutAdminReferralsSettings();

  // Payouts Tab State
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  const [payoutSearch, setPayoutSearch] = useState('');
  const [payoutPage, setPayoutPage] = useState(1);

  const {
    data: payoutsData,
    isLoading: isPayoutsLoading,
    refetch: refetchPayouts,
  } = useGetAdminReferralsPayouts({
    page: payoutPage,
    limit: 15,
    status: payoutStatusFilter === 'ALL' ? undefined : payoutStatusFilter,
    search: payoutSearch.trim() || undefined,
  });

  // Earnings Tab State
  const [earningSearch, setEarningSearch] = useState('');
  const [earningPage, setEarningPage] = useState(1);

  const {
    data: earningsData,
    isLoading: isEarningsLoading,
    refetch: refetchEarnings,
  } = useGetAdminReferralsEarnings({
    page: earningPage,
    limit: 15,
    search: earningSearch.trim() || undefined,
  });

  // Action Modals State
  const [selectedPayout, setSelectedPayout] = useState<AdminPayoutItem | null>(null);
  const [approveModalOpened, { open: openApproveModal, close: closeApproveModal }] = useDisclosure(false);
  const [rejectModalOpened, { open: openRejectModal, close: closeRejectModal }] = useDisclosure(false);
  const [transactionRef, setTransactionRef] = useState('');
  const [adminNote, setAdminNote] = useState('');

  const queryClient = useQueryClient();
  const patchPayoutMutation = usePatchAdminReferralsPayoutsIdStatus();

  const handleApprove = () => {
    if (!selectedPayout) return;
    if (!transactionRef.trim()) {
      notifications.show({
        title: 'বিকাশ ট্রানজেকশন ID প্রয়োজন',
        message: 'অনুগ্রহ করে সফল পেমেন্টের bKash TrxID প্রদান করুন।',
        color: 'red',
      });
      return;
    }

    patchPayoutMutation.mutate(
      {
        id: selectedPayout.id,
        data: {
          status: 'APPROVED',
          transaction_ref: transactionRef.trim(),
          admin_note: adminNote.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          notifications.show({
            title: 'উত্তোলন সফল হয়েছে!',
            message: `৳${selectedPayout.amount} অনুমোদিত ও পরিশোধিত হিসেবে চিহ্নিত করা হয়েছে।`,
            color: 'teal',
            icon: <IconCheck size={18} />,
          });
          closeApproveModal();
          setSelectedPayout(null);
          setTransactionRef('');
          setAdminNote('');
          refetchPayouts();
          refetchSummary();
          queryClient.invalidateQueries({ queryKey: ['referrals'] });
          queryClient.invalidateQueries({ queryKey: ['admin-referrals'] });
        },
        onError: (err: unknown) => {
          const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
          notifications.show({
            title: 'অপারেশন ব্যর্থ',
            message: axiosErr?.response?.data?.message || axiosErr?.message || 'ত্রুটি ঘটেছে',
            color: 'red',
          });
        },
      }
    );
  };

  const handleReject = () => {
    if (!selectedPayout) return;

    patchPayoutMutation.mutate(
      {
        id: selectedPayout.id,
        data: {
          status: 'REJECTED',
          admin_note: adminNote.trim() || 'অনুরোধটি বাতিল করা হয়েছে',
        },
      },
      {
        onSuccess: () => {
          notifications.show({
            title: 'উত্তোলন বাতিল করা হয়েছে',
            message: 'টাকা স্বয়ংক্রিয়ভাবে ব্যবহারকারীর উপলব্ধ ব্যালেন্সে ফেরত যুক্ত হয়েছে।',
            color: 'orange',
          });
          closeRejectModal();
          setSelectedPayout(null);
          setAdminNote('');
          refetchPayouts();
          refetchSummary();
          queryClient.invalidateQueries({ queryKey: ['referrals'] });
          queryClient.invalidateQueries({ queryKey: ['admin-referrals'] });
        },
        onError: (err: unknown) => {
          const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
          notifications.show({
            title: 'অপারেশন ব্যর্থ',
            message: axiosErr?.response?.data?.message || axiosErr?.message || 'ত্রুটি ঘটেছে',
            color: 'red',
          });
        },
      }
    );
  };

  const handleSaveSettings = (data: {
    commission_percentage: number;
    buyer_discount_percentage: number;
    min_payout_amount: number;
    is_enabled: boolean;
    terms_and_conditions: string;
  }) => {
    putSettingsMutation.mutate(
      {
        data,
      },
      {
        onSuccess: () => {
          notifications.show({
            title: 'সেটিংস সংরক্ষিত!',
            message: 'রেফারাল সেটিংস সফলভাবে আপডেট করা হয়েছে।',
            color: 'teal',
            icon: <IconCheck size={18} />,
          });
          refetchSettings();
          queryClient.invalidateQueries({ queryKey: ['referrals'] });
          queryClient.invalidateQueries({ queryKey: ['admin-referrals'] });
        },
        onError: (err: unknown) => {
          const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
          notifications.show({
            title: 'সংরক্ষণ ব্যর্থ',
            message: axiosErr?.response?.data?.message || axiosErr?.message || 'ত্রুটি ঘটেছে',
            color: 'red',
          });
        },
      }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge color="green" variant="light" size="sm" leftSection={<IconCheck size={12} />}>অনুমোদিত (Approved)</Badge>;
      case 'PENDING':
        return <Badge color="yellow" variant="light" size="sm" leftSection={<IconClock size={12} />}>অপেক্ষারত (Pending)</Badge>;
      case 'REJECTED':
        return <Badge color="red" variant="light" size="sm" leftSection={<IconRotateClockwise size={12} />}>বাতিল (Rejected)</Badge>;
      default:
        return <Badge color="gray" variant="light" size="sm">{status}</Badge>;
    }
  };

  return (
    <Stack gap="xl" p={{ base: 'sm', md: 'md' }}>
      {/* Top Header */}
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <div>
          <Group gap="xs" align="center">
            <IconGift size={28} color="#2563eb" />
            <Title order={2} fw={800} style={{ color: '#0f172a' }}>
              রেফারাল ও কমিশন ম্যানেজমেন্ট (Referrals & Payouts)
            </Title>
          </Group>
          <Text size="sm" c="dimmed" mt={2}>
            প্ল্যাটফর্মের অ্যাফিলিয়েট কমিশন, বিকাশ উত্তোলন অনুরোধ এবং রেফারাল সেটিংস নিয়ন্ত্রণ করুন।
          </Text>
        </div>

        <Group gap="sm">
          <Button
            variant="light"
            color="blue"
            leftSection={<IconRefresh size={16} />}
            onClick={() => {
              refetchSummary();
              refetchPayouts();
              refetchEarnings();
            }}
          >
            রিফ্রেশ
          </Button>
        </Group>
      </Group>

      {/* 1. Summary Metrics Strip */}
      {isSummaryLoading ? (
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, lg: 5 }} spacing="md">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} height={125} radius="md" />
          ))}
        </SimpleGrid>
      ) : (
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, lg: 5 }} spacing="md">
          {/* Total Affiliate Sales */}
          <Card
            p="md"
            radius="md"
            withBorder
            shadow="xs"
            style={{
              background: 'linear-gradient(135deg, #f0fdfa 0%, #ffffff 100%)',
              borderTop: '3px solid #0d9488',
              minHeight: 125,
            }}
          >
            <Group justify="space-between" align="center" mb={6}>
              <Group gap={8}>
                <ThemeIcon size={30} radius="md" color="teal" variant="light">
                  <IconCurrencyTaka size={18} stroke={2} />
                </ThemeIcon>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                  মোট রেফারাল বিক্রয়
                </Text>
              </Group>
            </Group>
            <Stack gap={4}>
              <Text fw={800} style={{ color: '#0d9488', fontSize: '1.5rem', lineHeight: 1.15 }}>
                ৳{(summary?.total_referral_sales || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
              <Badge size="xs" variant="light" color="teal">রেফারাল থেকে আয়</Badge>
            </Stack>
          </Card>

          {/* Total Commissions Earned */}
          <Card
            p="md"
            radius="md"
            withBorder
            shadow="xs"
            style={{
              background: 'linear-gradient(135deg, #eef2ff 0%, #ffffff 100%)',
              borderTop: '3px solid #4f46e5',
              minHeight: 125,
            }}
          >
            <Group justify="space-between" align="center" mb={6}>
              <Group gap={8}>
                <ThemeIcon size={30} radius="md" color="indigo" variant="light">
                  <IconReceipt size={18} stroke={2} />
                </ThemeIcon>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                  মোট অর্জিত কমিশন
                </Text>
              </Group>
            </Group>
            <Stack gap={4}>
              <Text fw={800} style={{ color: '#1e1b4b', fontSize: '1.5rem', lineHeight: 1.15 }}>
                ৳{(summary?.total_commissions_earned || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
              <Badge size="xs" variant="light" color="indigo">শিক্ষার্থীদের প্রাপ্ত</Badge>
            </Stack>
          </Card>

          {/* Total Commissions Paid */}
          <Card
            p="md"
            radius="md"
            withBorder
            shadow="xs"
            style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
              borderTop: '3px solid #16a34a',
              minHeight: 125,
            }}
          >
            <Group justify="space-between" align="center" mb={6}>
              <Group gap={8}>
                <ThemeIcon size={30} radius="md" color="green" variant="light">
                  <IconCheck size={18} stroke={2} />
                </ThemeIcon>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                  পরিশোধিত কমিশন
                </Text>
              </Group>
            </Group>
            <Stack gap={4}>
              <Text fw={800} style={{ color: '#14532d', fontSize: '1.5rem', lineHeight: 1.15 }}>
                ৳{(summary?.total_commissions_paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
              <Badge size="xs" variant="light" color="green">বিকাশে পরিশোধিত</Badge>
            </Stack>
          </Card>

          {/* Pending Payout Amount */}
          <Card
            p="md"
            radius="md"
            withBorder
            shadow="xs"
            style={{
              background: 'linear-gradient(135deg, #fefce8 0%, #ffffff 100%)',
              borderTop: '3px solid #ca8a04',
              minHeight: 125,
            }}
          >
            <Group justify="space-between" align="center" mb={6}>
              <Group gap={8}>
                <ThemeIcon size={30} radius="md" color="yellow" variant="light">
                  <IconClock size={18} stroke={2} />
                </ThemeIcon>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                  পেন্ডিং উত্তোলন
                </Text>
              </Group>
            </Group>
            <Stack gap={4}>
              <Text fw={800} style={{ color: '#713f12', fontSize: '1.5rem', lineHeight: 1.15 }}>
                ৳{(summary?.pending_payout_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
              <Badge size="xs" variant="light" color="yellow">
                {summary?.pending_payout_count || 0} টি অনুরোধ
              </Badge>
            </Stack>
          </Card>

          {/* Active Affiliates */}
          <Card
            p="md"
            radius="md"
            withBorder
            shadow="xs"
            style={{
              background: 'linear-gradient(135deg, #faf5ff 0%, #ffffff 100%)',
              borderTop: '3px solid #7c3aed',
              minHeight: 125,
            }}
          >
            <Group justify="space-between" align="center" mb={6}>
              <Group gap={8}>
                <ThemeIcon size={30} radius="md" color="violet" variant="light">
                  <IconUsers size={18} stroke={2} />
                </ThemeIcon>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                  সক্রিয় রেফারার
                </Text>
              </Group>
            </Group>
            <Stack gap={4}>
              <Text fw={800} style={{ color: '#3b0764', fontSize: '1.5rem', lineHeight: 1.15 }}>
                {summary?.active_affiliates_count || 0} জন
              </Text>
              <Badge size="xs" variant="light" color="violet">রেফারাল তৈরি করেছে</Badge>
            </Stack>
          </Card>
        </SimpleGrid>
      )}

      {/* 2. Main Tabs Section */}
      <Card p="lg" radius="md" withBorder shadow="xs">
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List mb="lg">
            <Tabs.Tab value="payouts" leftSection={<IconClock size={16} />}>
              উত্তোলন অনুরোধসমূহ ({summary?.pending_payout_count || 0} পেন্ডিং)
            </Tabs.Tab>
            <Tabs.Tab value="earnings" leftSection={<IconHistory size={16} />}>
              রেফারাল হিস্টোরি (All Earnings)
            </Tabs.Tab>
            <Tabs.Tab value="settings" leftSection={<IconSettings size={16} />}>
              রেফারাল সেটিংস (Settings)
            </Tabs.Tab>
          </Tabs.List>

          {/* TAB 1: Payout Requests */}
          <Tabs.Panel value="payouts">
            <Stack gap="md">
              {/* Filter & Search Bar */}
              <Group justify="space-between" wrap="wrap" gap="sm">
                <SegmentedControl
                  size="xs"
                  value={payoutStatusFilter}
                  onChange={(val) => {
                    setPayoutStatusFilter(val as 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL');
                    setPayoutPage(1);
                  }}
                  data={[
                    { label: 'পেন্ডিং (Pending)', value: 'PENDING' },
                    { label: 'অনুমোদিত (Approved)', value: 'APPROVED' },
                    { label: 'বাতিল (Rejected)', value: 'REJECTED' },
                    { label: 'সকল (All)', value: 'ALL' },
                  ]}
                />

                <TextInput
                  placeholder="ইউজার বা বিকাশ নম্বর খুঁজুন..."
                  size="xs"
                  leftSection={<IconSearch size={14} />}
                  value={payoutSearch}
                  onChange={(e) => {
                    setPayoutSearch(e.currentTarget.value);
                    setPayoutPage(1);
                  }}
                  style={{ width: 260 }}
                />
              </Group>

              {/* Table */}
              {isPayoutsLoading ? (
                <Stack gap="xs">
                  <Skeleton height={40} />
                  <Skeleton height={40} />
                  <Skeleton height={40} />
                </Stack>
              ) : !payoutsData || payoutsData.payouts.length === 0 ? (
                <Box p="xl" ta="center">
                  <Text size="sm" c="dimmed">
                    কোনো উত্তোলন অনুরোধ পাওয়া যায়নি।
                  </Text>
                </Box>
              ) : (
                <>
                  <Table verticalSpacing="sm" highlightOnHover>
                    <Table.Thead style={{ backgroundColor: '#f8fafc' }}>
                      <Table.Tr>
                        <Table.Th>শিক্ষার্থী / ইউজার</Table.Th>
                        <Table.Th>বিকাশ অ্যাকাউন্ট</Table.Th>
                        <Table.Th>অ্যাকাউন্ট টাইপ</Table.Th>
                        <Table.Th style={{ textAlign: 'right' }}>পরিমাণ</Table.Th>
                        <Table.Th style={{ textAlign: 'center' }}>স্ট্যাটাস</Table.Th>
                        <Table.Th>bKash TrxID</Table.Th>
                        <Table.Th style={{ textAlign: 'right' }}>তারিখ</Table.Th>
                        <Table.Th style={{ textAlign: 'right' }}>অ্যাকশন</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {payoutsData.payouts.map((payout) => (
                        <Table.Tr key={payout.id}>
                          <Table.Td>
                            <Stack gap={0}>
                              <Text size="xs" fw={600}>{payout.user_name}</Text>
                              <Text size="10px" c="dimmed">{payout.user_email}</Text>
                            </Stack>
                          </Table.Td>

                          <Table.Td>
                            <Group gap={6}>
                              <Badge color="pink" size="xs" variant="filled">bKash</Badge>
                              <Text size="xs" fw={700}>{payout.account_number}</Text>
                            </Group>
                          </Table.Td>

                          <Table.Td>
                            <Badge size="xs" variant="outline" color="gray">
                              {payout.account_type}
                            </Badge>
                          </Table.Td>

                          <Table.Td style={{ textAlign: 'right' }}>
                            <Text size="sm" fw={700} c="teal.8">
                              ৳{payout.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </Text>
                          </Table.Td>

                          <Table.Td style={{ textAlign: 'center' }}>
                            {getStatusBadge(payout.status)}
                          </Table.Td>

                          <Table.Td>
                            {payout.transaction_ref ? (
                              <Text size="xs" fw={700} style={{ fontFamily: 'monospace' }}>
                                {payout.transaction_ref}
                              </Text>
                            ) : (
                              <Text size="xs" c="dimmed">-</Text>
                            )}
                          </Table.Td>

                          <Table.Td style={{ textAlign: 'right' }}>
                            <Text size="xs" c="dimmed">
                              {new Date(payout.created_at).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </Text>
                          </Table.Td>

                          <Table.Td style={{ textAlign: 'right' }}>
                            {payout.status === 'PENDING' ? (
                              <Group gap={6} justify="flex-end">
                                <Button
                                  size="compact-xs"
                                  color="teal"
                                  leftSection={<IconCheck size={12} />}
                                  onClick={() => {
                                    setSelectedPayout(payout);
                                    setTransactionRef('');
                                    setAdminNote('');
                                    openApproveModal();
                                  }}
                                  data-testid={`btn-approve-payout-${payout.id}`}
                                >
                                  পরিশোধ
                                </Button>
                                <Button
                                  size="compact-xs"
                                  color="red"
                                  variant="light"
                                  leftSection={<IconX size={12} />}
                                  onClick={() => {
                                    setSelectedPayout(payout);
                                    setAdminNote('');
                                    openRejectModal();
                                  }}
                                  data-testid={`btn-reject-payout-${payout.id}`}
                                >
                                  বাতিল
                                </Button>
                              </Group>
                            ) : (
                              <Badge size="xs" variant="dot" color={payout.status === 'APPROVED' ? 'green' : 'red'}>
                                {payout.status === 'APPROVED' ? 'পরিশোধিত' : 'বাতিলকৃত'}
                              </Badge>
                            )}
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>

                  {payoutsData.total_count > 15 && (
                    <Group justify="center" mt="md">
                      <Pagination
                        total={Math.ceil(payoutsData.total_count / 15)}
                        value={payoutPage}
                        onChange={setPayoutPage}
                      />
                    </Group>
                  )}
                </>
              )}
            </Stack>
          </Tabs.Panel>

          {/* TAB 2: All Earnings Ledger */}
          <Tabs.Panel value="earnings">
            <Stack gap="md">
              <Group justify="flex-end">
                <TextInput
                  placeholder="রেফারার, ক্রেতা বা কোর্স খুঁজুন..."
                  size="xs"
                  leftSection={<IconSearch size={14} />}
                  value={earningSearch}
                  onChange={(e) => {
                    setEarningSearch(e.currentTarget.value);
                    setEarningPage(1);
                  }}
                  style={{ width: 280 }}
                />
              </Group>

              {isEarningsLoading ? (
                <Stack gap="xs">
                  <Skeleton height={40} />
                  <Skeleton height={40} />
                </Stack>
              ) : !earningsData || earningsData.earnings.length === 0 ? (
                <Box p="xl" ta="center">
                  <Text size="sm" c="dimmed">
                    কোনো রেফারাল বিক্রয় পাওয়া যায়নি।
                  </Text>
                </Box>
              ) : (
                <>
                  <Table verticalSpacing="sm" highlightOnHover>
                    <Table.Thead style={{ backgroundColor: '#f8fafc' }}>
                      <Table.Tr>
                        <Table.Th>রেফারার (কমিশন প্রাপক)</Table.Th>
                        <Table.Th>ক্রেতা (রেফারকৃত শিক্ষার্থী)</Table.Th>
                        <Table.Th>কোর্স নাম</Table.Th>
                        <Table.Th style={{ textAlign: 'right' }}>বিক্রয় মূল্য</Table.Th>
                        <Table.Th style={{ textAlign: 'center' }}>কমিশন হার</Table.Th>
                        <Table.Th style={{ textAlign: 'right' }}>প্রদত্ত কমিশন</Table.Th>
                        <Table.Th style={{ textAlign: 'right' }}>তারিখ</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {earningsData.earnings.map((item) => (
                        <Table.Tr key={item.id}>
                          <Table.Td>
                            <Stack gap={0}>
                              <Text size="xs" fw={600}>{item.referrer_name}</Text>
                              <Text size="10px" c="dimmed">{item.referrer_email}</Text>
                            </Stack>
                          </Table.Td>

                          <Table.Td>
                            <Stack gap={0}>
                              <Text size="xs" fw={500}>{item.referred_name}</Text>
                              <Text size="10px" c="dimmed">{item.referred_email}</Text>
                            </Stack>
                          </Table.Td>

                          <Table.Td>
                            <Text size="xs" fw={600}>{item.course_title}</Text>
                          </Table.Td>

                          <Table.Td style={{ textAlign: 'right' }}>
                            <Text size="xs">৳{item.order_amount.toLocaleString()}</Text>
                          </Table.Td>

                          <Table.Td style={{ textAlign: 'center' }}>
                            <Badge size="xs" variant="light" color="blue">
                              {item.commission_percentage}%
                            </Badge>
                          </Table.Td>

                          <Table.Td style={{ textAlign: 'right' }}>
                            <Text size="sm" fw={700} c="teal.8">
                              +৳{item.commission_earned.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </Text>
                          </Table.Td>

                          <Table.Td style={{ textAlign: 'right' }}>
                            <Text size="xs" c="dimmed">
                              {new Date(item.created_at).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>

                  {earningsData.total_count > 15 && (
                    <Group justify="center" mt="md">
                      <Pagination
                        total={Math.ceil(earningsData.total_count / 15)}
                        value={earningPage}
                        onChange={setEarningPage}
                      />
                    </Group>
                  )}
                </>
              )}
            </Stack>
          </Tabs.Panel>

          {/* TAB 3: Settings */}
          <Tabs.Panel value="settings">
            <ReferralSettingsForm
              key={settings ? 'loaded' : 'loading'}
              settings={settings}
              onSave={handleSaveSettings}
              isSaving={putSettingsMutation.isPending}
            />
          </Tabs.Panel>
        </Tabs>
      </Card>

      {/* Approve Payout Modal */}
      <Modal
        opened={approveModalOpened}
        onClose={closeApproveModal}
        title={<Title order={4} fw={700} c="teal.9">বিকাশ পেমেন্ট অনুমোদন ও TrxID প্রদান</Title>}
        centered
        radius="md"
        transitionProps={{ duration: 0 }}
      >
        {selectedPayout && (
          <Stack gap="md">
            <Paper p="sm" radius="md" style={{ backgroundColor: '#f0fdfa', border: '1px solid #ccfbf1' }}>
              <Stack gap={4}>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">শিক্ষার্থীর নাম:</Text>
                  <Text size="xs" fw={700}>{selectedPayout.user_name}</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">বিকাশ নম্বর:</Text>
                  <Text size="sm" fw={800} c="pink.8">{selectedPayout.account_number} ({selectedPayout.account_type})</Text>
                </Group>
                <Group justify="space-between">
                  <Text size="xs" c="dimmed">পরিশোধের পরিমাণ:</Text>
                  <Text size="md" fw={900} c="teal.9">৳{selectedPayout.amount.toLocaleString()}</Text>
                </Group>
              </Stack>
            </Paper>

            <Alert color="blue" icon={<IconAlertCircle size={16} />}>
              ম্যানুয়ালি বিকাশে টাকা প্রেরণের পর ফিরতি এসএমএস থেকে <b>TrxID</b> এখানে ইনপুট করুন।
            </Alert>

            <TextInput
              label="bKash Transaction ID (TrxID)"
              placeholder="যেমন: BLA928172X"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.currentTarget.value)}
              required
              data-testid="input-payout-trxid"
            />

            <TextInput
              label="অ্যাডমিন নোট (ঐচ্ছিক)"
              placeholder="পেমেন্ট সম্পর্কিত কোনো মন্তব্য..."
              value={adminNote}
              onChange={(e) => setAdminNote(e.currentTarget.value)}
            />

            <Group justify="flex-end" gap="sm" mt="md">
              <Button variant="default" onClick={closeApproveModal}>বাতিল</Button>
              <Button
                color="teal"
                loading={patchPayoutMutation.isPending}
                onClick={handleApprove}
                data-testid="btn-confirm-approve-payout"
              >
                অনুমোদন সম্পন্ন করুন
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Reject Payout Modal */}
      <Modal
        opened={rejectModalOpened}
        onClose={closeRejectModal}
        title={<Title order={4} fw={700} c="red.9">উত্তোলন অনুরোধ বাতিল</Title>}
        centered
        radius="md"
        transitionProps={{ duration: 0 }}
      >
        {selectedPayout && (
          <Stack gap="md">
            <Alert color="red" icon={<IconAlertCircle size={16} />}>
              এই অনুরোধটি বাতিল করলে <b>৳{selectedPayout.amount}</b> স্বয়ংক্রিয়ভাবে শিক্ষার্থীর অ্যাকাউন্টে উপলব্ধ ব্যালেন্স হিসেবে ফেরত যুক্ত হবে।
            </Alert>

            <Textarea
              label="বাতিলের কারণ / নোট"
              placeholder="যেমন: ভুল বিকাশ নম্বর দেওয়া হয়েছে..."
              rows={3}
              value={adminNote}
              onChange={(e) => setAdminNote(e.currentTarget.value)}
              required
              data-testid="input-reject-note"
            />

            <Group justify="flex-end" gap="sm" mt="md">
              <Button variant="default" onClick={closeRejectModal}>ফিরে যান</Button>
              <Button
                color="red"
                loading={patchPayoutMutation.isPending}
                onClick={handleReject}
                data-testid="btn-confirm-reject-payout"
              >
                বাতিল নিশ্চিত করুন
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
