'use client';

import React, { useState } from 'react';
import {
  Container,
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
  NumberInput,
  TextInput,
  Select,
  Skeleton,
  CopyButton,
  Paper,
  Box,
  ThemeIcon,
  Alert,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconGift,
  IconCopy,
  IconCheck,
  IconCurrencyTaka,
  IconArrowUpRight,
  IconClock,
  IconUsers,
  IconAlertCircle,
  IconHistory,
  IconReceipt,
  IconRotateClockwise,
} from '@tabler/icons-react';
import {
  useGetReferralsOverview,
  useGetReferralsEarnings,
  useGetReferralsPayouts,
  usePostReferralsPayoutRequests,
} from '@/api/generated/referral/referral';

export default function StudentReferralsPage() {
  const {
    data: overview,
    isLoading: isOverviewLoading,
    refetch: refetchOverview,
  } = useGetReferralsOverview();

  const {
    data: earnings,
    isLoading: isEarningsLoading,
  } = useGetReferralsEarnings();

  const {
    data: payouts,
    isLoading: isPayoutsLoading,
    refetch: refetchPayouts,
  } = useGetReferralsPayouts();

  const [payoutModalOpened, { open: openPayoutModal, close: closePayoutModal }] = useDisclosure(false);

  // Form State for Payout
  const [payoutAmount, setPayoutAmount] = useState<number | ''>('');
  const [bkashNumber, setBkashNumber] = useState('');
  const [accountType, setAccountType] = useState<string | null>('PERSONAL');
  const [formError, setFormError] = useState<string | null>(null);

  const payoutMutation = usePostReferralsPayoutRequests();

  const handleRequestPayout = async () => {
    setFormError(null);

    const amountNum = typeof payoutAmount === 'number' ? payoutAmount : parseFloat(payoutAmount as string);
    if (!amountNum || isNaN(amountNum) || amountNum <= 0) {
      setFormError('অনুগ্রহ করে একটি সঠিক উত্তোলনের পরিমাণ লিখুন');
      return;
    }

    const minAmount = overview?.min_payout_amount || 500;
    if (amountNum < minAmount) {
      setFormError(`সর্বনিম্ন উত্তোলনের পরিমাণ ৳${minAmount}`);
      return;
    }

    const availBalance = overview?.available_balance || 0;
    if (amountNum > availBalance) {
      setFormError(`উত্তোলনের পরিমাণ আপনার উপলব্ধ ব্যালেন্স (৳${availBalance}) এর চেয়ে বেশি হতে পারবে না`);
      return;
    }

    const cleanPhone = bkashNumber.trim();
    if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
      setFormError('সঠিক ১১ ডিজিটের বিকাশ নম্বর দিন (যেমন: 017XXXXXXXX)');
      return;
    }

    payoutMutation.mutate(
      {
        data: {
          amount: amountNum,
          payment_method: 'bkash',
          account_number: cleanPhone,
          account_type: (accountType as 'PERSONAL' | 'AGENT') || 'PERSONAL',
        },
      },
      {
        onSuccess: () => {
          notifications.show({
            title: 'উত্তোলন অনুরোধ সফল!',
            message: `৳${amountNum} বিকাশে পাঠানোর অনুরোধ গ্রহণ করা হয়েছে।`,
            color: 'teal',
            icon: <IconCheck size={18} />,
          });
          closePayoutModal();
          setPayoutAmount('');
          setBkashNumber('');
          refetchOverview();
          refetchPayouts();
        },
        onError: (err: unknown) => {
          const axiosErr = err as { response?: { data?: { message?: string } }; message?: string };
          const errMsg = axiosErr?.response?.data?.message || axiosErr?.message || 'উত্তোলন অনুরোধ ব্যর্থ হয়েছে';
          setFormError(errMsg);
        },
      }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
      case 'COMMISSION_EARNED':
        return <Badge color="green" variant="light" size="sm" leftSection={<IconCheck size={12} />}>সফল</Badge>;
      case 'PENDING':
        return <Badge color="yellow" variant="light" size="sm" leftSection={<IconClock size={12} />}>অপেক্ষারত</Badge>;
      case 'REJECTED':
      case 'REFUNDED_REVOKED':
        return <Badge color="red" variant="light" size="sm" leftSection={<IconRotateClockwise size={12} />}>বাতিল</Badge>;
      default:
        return <Badge color="gray" variant="light" size="sm">{status}</Badge>;
    }
  };

  const referralCode = overview?.code || '------';
  const commissionPct = overview?.commission_percentage || 10;
  const buyerDiscountPct = overview?.buyer_discount_percentage || 5;
  const availableBal = overview?.available_balance || 0;

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header Title */}
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <div>
            <Group gap="xs" align="center">
              <ThemeIcon size={38} radius="md" variant="gradient" gradient={{ from: 'teal', to: 'blue' }}>
                <IconGift size={22} color="white" />
              </ThemeIcon>
              <div>
                <Title order={2} fw={800} style={{ color: '#0f172a' }}>
                  রেফারাল ও আয় (Affiliate Program)
                </Title>
                <Text size="sm" c="dimmed">
                  আপনার বন্ধুদের সাথে রেফারাল কোড শেয়ার করুন—বন্ধুরা পাবে {buyerDiscountPct}% ইনস্ট্যান্ট ছাড়, আর আপনি পাবেন {commissionPct}% নগদ কমিশন!
                </Text>
              </div>
            </Group>
          </div>

          <Button
            size="md"
            color="teal"
            leftSection={<IconArrowUpRight size={18} />}
            onClick={openPayoutModal}
            disabled={isOverviewLoading || availableBal < (overview?.min_payout_amount || 500)}
            data-testid="btn-request-payout-header"
          >
            টাকা উত্তোলন করুন (bKash)
          </Button>
        </Group>

        {/* 1. Hero Referral Code Card */}
        <Card
          p="xl"
          radius="lg"
          withBorder
          shadow="sm"
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#f8fafc',
          }}
        >
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
            {/* Left: Code Box */}
            <Stack gap="sm">
              <Group gap="xs">
                <Badge size="lg" variant="gradient" gradient={{ from: 'teal', to: 'cyan' }}>
                  আপনার ইউনিক রেফারাল কোড
                </Badge>
                <Badge size="sm" variant="filled" color="green">
                  বন্ধুদের জন্য {buyerDiscountPct}% ছাড়
                </Badge>
                <Badge size="sm" variant="outline" color="cyan">
                  আপনার {commissionPct}% নগদ কমিশন
                </Badge>
              </Group>

              <Text size="xs" c="gray.4">
                আপনার কোড ব্যবহার করে যে কেউ কোর্স কিনলে তারা পাবে <b>{buyerDiscountPct}% ছাড়</b> এবং আপনি পাবেন <b>{commissionPct}% নগদ বোনাস</b>।
              </Text>

              {/* Big Code Pill */}
              <Paper
                p="md"
                radius="md"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.07)',
                  border: '1px dashed rgba(255, 255, 255, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                {isOverviewLoading ? (
                  <Skeleton height={36} width={140} radius="md" />
                ) : (
                  <Text
                    fw={900}
                    style={{
                      fontSize: '1.75rem',
                      letterSpacing: '4px',
                      color: '#38bdf8',
                      fontFamily: 'monospace',
                    }}
                    data-testid="referral-code-display"
                  >
                    {referralCode}
                  </Text>
                )}

                <CopyButton value={referralCode} timeout={2000}>
                  {({ copied, copy }) => (
                    <Button
                      size="xs"
                      color={copied ? 'teal' : 'blue'}
                      variant="filled"
                      leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                      onClick={copy}
                    >
                      {copied ? 'কপিকৃত!' : 'কোড কপি করুন'}
                    </Button>
                  )}
                </CopyButton>
              </Paper>
            </Stack>

            {/* Right: How to use Instructions */}
            <Stack gap="sm" justify="center">
              <Text size="sm" fw={700} c="gray.2">
                রেফারাল কোড যেভাবে কাজ করে:
              </Text>

              <Stack gap="xs">
                <Group gap="xs" align="flex-start">
                  <ThemeIcon size={22} radius="xl" color="teal" variant="light">
                    <Text size="xs" fw={800}>১</Text>
                  </ThemeIcon>
                  <Text size="xs" c="gray.3">
                    <b>কোডটি শেয়ার করুন:</b> আপনার ৬ অক্ষরের কোডটি কপি করে বন্ধুদের দিন।
                  </Text>
                </Group>

                <Group gap="xs" align="flex-start">
                  <ThemeIcon size={22} radius="xl" color="blue" variant="light">
                    <Text size="xs" fw={800}>২</Text>
                  </ThemeIcon>
                  <Text size="xs" c="gray.3">
                    <b>বন্ধুরা পাবে {buyerDiscountPct}% ছাড়:</b> কোর্স কেনার সময় রেফারাল কোড বক্সে এটি দিলেই তারা সাথে সাথে ডিসকাউন্ট পাবে।
                  </Text>
                </Group>

                <Group gap="xs" align="flex-start">
                  <ThemeIcon size={22} radius="xl" color="cyan" variant="light">
                    <Text size="xs" fw={800}>৩</Text>
                  </ThemeIcon>
                  <Text size="xs" c="gray.3">
                    <b>আপনি পাবেন {commissionPct}% নগদ কমিশন:</b> পেমেন্ট সম্পন্ন হলে আপনার ব্যালেন্সে কমিশন যোগ হবে যা বিকাশে উত্তোলন করতে পারবেন।
                  </Text>
                </Group>
              </Stack>
            </Stack>
          </SimpleGrid>
        </Card>

        {/* 2. Balances & KPI Summary Cards */}
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3, lg: 5 }} spacing="md">
          {/* Available Balance Card */}
          <Card
            p="md"
            radius="md"
            withBorder
            shadow="xs"
            style={{
              background: 'linear-gradient(135deg, #f0fdfa 0%, #ffffff 100%)',
              borderTop: '3px solid #0d9488',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 125,
            }}
          >
            <Group justify="space-between" align="center" wrap="nowrap" mb={6}>
              <Group gap={8}>
                <ThemeIcon size={30} radius="md" color="teal" variant="light">
                  <IconCurrencyTaka size={18} stroke={2} />
                </ThemeIcon>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                  উত্তোলনযোগ্য ব্যালেন্স
                </Text>
              </Group>
            </Group>

            <Stack gap={4}>
              <Text fw={800} style={{ color: '#0d9488', fontSize: '1.5rem', lineHeight: 1.15 }}>
                ৳{availableBal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
              <Group justify="space-between">
                <Badge size="xs" variant="light" color="teal">
                  সর্বনিম্ন: ৳{overview?.min_payout_amount || 500}
                </Badge>
              </Group>
            </Stack>
          </Card>

          {/* Total Earned Card */}
          <Card
            p="md"
            radius="md"
            withBorder
            shadow="xs"
            style={{
              background: 'linear-gradient(135deg, #eef2ff 0%, #ffffff 100%)',
              borderTop: '3px solid #4f46e5',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 125,
            }}
          >
            <Group justify="space-between" align="center" wrap="nowrap" mb={6}>
              <Group gap={8}>
                <ThemeIcon size={30} radius="md" color="indigo" variant="light">
                  <IconReceipt size={18} stroke={2} />
                </ThemeIcon>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                  সর্বমোট অর্জিত আয়
                </Text>
              </Group>
            </Group>

            <Stack gap={4}>
              <Text fw={800} style={{ color: '#1e1b4b', fontSize: '1.5rem', lineHeight: 1.15 }}>
                ৳{(overview?.total_earned || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
              <Badge size="xs" variant="light" color="indigo">
                লাইফটাইম কমিশন
              </Badge>
            </Stack>
          </Card>

          {/* Total Paid Out Card */}
          <Card
            p="md"
            radius="md"
            withBorder
            shadow="xs"
            style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
              borderTop: '3px solid #16a34a',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 125,
            }}
          >
            <Group justify="space-between" align="center" wrap="nowrap" mb={6}>
              <Group gap={8}>
                <ThemeIcon size={30} radius="md" color="green" variant="light">
                  <IconCheck size={18} stroke={2} />
                </ThemeIcon>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                  পরিশোধিত আয়
                </Text>
              </Group>
            </Group>

            <Stack gap={4}>
              <Text fw={800} style={{ color: '#14532d', fontSize: '1.5rem', lineHeight: 1.15 }}>
                ৳{(overview?.total_withdrawn || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
              <Badge size="xs" variant="light" color="green">
                বিকাশে প্রেরিত
              </Badge>
            </Stack>
          </Card>

          {/* Pending Payout Card */}
          <Card
            p="md"
            radius="md"
            withBorder
            shadow="xs"
            style={{
              background: 'linear-gradient(135deg, #fefce8 0%, #ffffff 100%)',
              borderTop: '3px solid #ca8a04',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 125,
            }}
          >
            <Group justify="space-between" align="center" wrap="nowrap" mb={6}>
              <Group gap={8}>
                <ThemeIcon size={30} radius="md" color="yellow" variant="light">
                  <IconClock size={18} stroke={2} />
                </ThemeIcon>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                  অপেক্ষারত উত্তোলন
                </Text>
              </Group>
            </Group>

            <Stack gap={4}>
              <Text fw={800} style={{ color: '#713f12', fontSize: '1.5rem', lineHeight: 1.15 }}>
                ৳{(overview?.pending_payout || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
              <Badge size="xs" variant="light" color="yellow">
                প্রসেসিংয়ে আছে
              </Badge>
            </Stack>
          </Card>

          {/* Total Referrals Count Card */}
          <Card
            p="md"
            radius="md"
            withBorder
            shadow="xs"
            style={{
              background: 'linear-gradient(135deg, #faf5ff 0%, #ffffff 100%)',
              borderTop: '3px solid #7c3aed',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 125,
            }}
          >
            <Group justify="space-between" align="center" wrap="nowrap" mb={6}>
              <Group gap={8}>
                <ThemeIcon size={30} radius="md" color="violet" variant="light">
                  <IconUsers size={18} stroke={2} />
                </ThemeIcon>
                <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                  সফল রেফারাল
                </Text>
              </Group>
            </Group>

            <Stack gap={4}>
              <Text fw={800} style={{ color: '#3b0764', fontSize: '1.5rem', lineHeight: 1.15 }}>
                {overview?.total_referrals || 0} টি
              </Text>
              <Badge size="xs" variant="light" color="violet">
                কোর্স বিক্রয়
              </Badge>
            </Stack>
          </Card>
        </SimpleGrid>

        {/* 3. Tabbed Activity Tables: Earnings & Payout Requests */}
        <Card p="lg" radius="md" withBorder shadow="xs">
          <Tabs defaultValue="earnings">
            <Tabs.List mb="md">
              <Tabs.Tab value="earnings" leftSection={<IconReceipt size={16} />}>
                রেফারাল বিক্রয় ও আয় ({earnings?.length || 0})
              </Tabs.Tab>
              <Tabs.Tab value="payouts" leftSection={<IconHistory size={16} />}>
                উত্তোলনের হিস্টোরি ({payouts?.length || 0})
              </Tabs.Tab>
            </Tabs.List>

            {/* Tab 1: Earnings History */}
            <Tabs.Panel value="earnings">
              {isEarningsLoading ? (
                <Stack gap="xs">
                  <Skeleton height={40} />
                  <Skeleton height={40} />
                  <Skeleton height={40} />
                </Stack>
              ) : !earnings || earnings.length === 0 ? (
                <Box p="xl" ta="center">
                  <Text size="sm" c="dimmed">
                    আপনার রেফারাল কোড ব্যবহার করে এখনো কেউ কোনো কোর্স ক্রয় করেনি। লিংকটি বন্ধুদের সাথে শেয়ার করুন!
                  </Text>
                </Box>
              ) : (
                <Table verticalSpacing="sm" highlightOnHover>
                  <Table.Thead style={{ backgroundColor: '#f8fafc' }}>
                    <Table.Tr>
                      <Table.Th>কোর্স নাম</Table.Th>
                      <Table.Th>ক্রেতা</Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>কোর্স মূল্য</Table.Th>
                      <Table.Th style={{ textAlign: 'center' }}>কমিশন হার</Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>অর্জিত আয়</Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>তারিখ</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {earnings.map((item) => (
                      <Table.Tr key={item.id}>
                        <Table.Td>
                          <Text size="sm" fw={600}>
                            {item.course_title}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Stack gap={0}>
                            <Text size="xs" fw={500}>{item.referred_user_name}</Text>
                            <Text size="10px" c="dimmed">{item.referred_user_email}</Text>
                          </Stack>
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
                          <Text size="sm" fw={700} c="teal.7">
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
              )}
            </Tabs.Panel>

            {/* Tab 2: Payouts History */}
            <Tabs.Panel value="payouts">
              {isPayoutsLoading ? (
                <Stack gap="xs">
                  <Skeleton height={40} />
                  <Skeleton height={40} />
                  <Skeleton height={40} />
                </Stack>
              ) : !payouts || payouts.length === 0 ? (
                <Box p="xl" ta="center">
                  <Text size="sm" c="dimmed">
                    কোনো উত্তোলনের ইতিহাস নেই। ব্যালেন্স জমা হলে bKash-এ টাকা উত্তোলন করতে পারবেন।
                  </Text>
                </Box>
              ) : (
                <Table verticalSpacing="sm" highlightOnHover>
                  <Table.Thead style={{ backgroundColor: '#f8fafc' }}>
                    <Table.Tr>
                      <Table.Th>উত্তোলনের পরিমাণ</Table.Th>
                      <Table.Th>মেথড ও নম্বর</Table.Th>
                      <Table.Th>অ্যাকাউন্ট টাইপ</Table.Th>
                      <Table.Th style={{ textAlign: 'center' }}>স্ট্যাটাস</Table.Th>
                      <Table.Th>bKash ট্রানজেকশন ID</Table.Th>
                      <Table.Th style={{ textAlign: 'right' }}>তারিখ</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {payouts.map((item) => (
                      <Table.Tr key={item.id}>
                        <Table.Td>
                          <Text size="sm" fw={700} c="teal.8">
                            ৳{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap={6}>
                            <Badge color="pink" size="xs" variant="filled">
                              bKash
                            </Badge>
                            <Text size="xs" fw={600}>
                              {item.account_number}
                            </Text>
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Badge size="xs" variant="outline" color="gray">
                            {item.account_type}
                          </Badge>
                        </Table.Td>
                        <Table.Td style={{ textAlign: 'center' }}>
                          {getStatusBadge(item.status)}
                        </Table.Td>
                        <Table.Td>
                          {item.transaction_ref ? (
                            <Text size="xs" fw={700} style={{ fontFamily: 'monospace' }}>
                              {item.transaction_ref}
                            </Text>
                          ) : (
                            <Text size="xs" c="dimmed">
                              -
                            </Text>
                          )}
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
              )}
            </Tabs.Panel>
          </Tabs>
        </Card>
      </Stack>

      {/* Payout Request Modal */}
      <Modal
        opened={payoutModalOpened}
        onClose={closePayoutModal}
        title={<Title order={4} fw={700}>বিকাশ (bKash) উত্তোলন অনুরোধ</Title>}
        centered
        radius="md"
        transitionProps={{ duration: 0 }}
      >
        <Stack gap="md">
          {formError && (
            <Alert color="red" icon={<IconAlertCircle size={16} />} title="ত্রুটি">
              {formError}
            </Alert>
          )}

          <Paper p="sm" radius="md" style={{ backgroundColor: '#f0fdfa', border: '1px solid #ccfbf1' }}>
            <Group justify="space-between" align="center">
              <Text size="xs" c="teal.9" fw={600}>
                আপনার উপলব্ধ উত্তোলন ব্যালেন্স:
              </Text>
              <Text size="sm" fw={800} c="teal.9">
                ৳{availableBal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </Text>
            </Group>
          </Paper>

          <Stack gap={4}>
            <NumberInput
              label="উত্তোলনের পরিমাণ (BDT)"
              placeholder="যেমন: 1000"
              min={overview?.min_payout_amount || 500}
              max={availableBal}
              value={payoutAmount}
              onChange={(val) => setPayoutAmount(typeof val === 'number' ? val : '')}
              required
              data-testid="input-payout-amount"
            />
            <Group justify="space-between" mt={2}>
              <Text size="10px" c="dimmed">
                সর্বনিম্ন উত্তোলন: ৳{overview?.min_payout_amount || 500}
              </Text>
              <Button
                variant="subtle"
                size="compact-xs"
                color="teal"
                onClick={() => setPayoutAmount(availableBal)}
              >
                সম্পূর্ণ ব্যালেন্স
              </Button>
            </Group>
          </Stack>

          <TextInput
            label="বিকাশ অ্যাকাউন্ট নম্বর (bKash Number)"
            placeholder="017XXXXXXXX"
            value={bkashNumber}
            onChange={(e) => setBkashNumber(e.currentTarget.value)}
            maxLength={11}
            required
            data-testid="input-bkash-number"
          />

          <Select
            label="অ্যাকাউন্ট টাইপ"
            data={[
              { value: 'PERSONAL', label: 'Personal Account (ব্যক্তিগত)' },
              { value: 'AGENT', label: 'Agent Account (এজেন্ট)' },
            ]}
            value={accountType}
            onChange={setAccountType}
            required
          />

          <Group justify="flex-end" gap="sm" mt="md">
            <Button variant="default" onClick={closePayoutModal}>
              বাতিল
            </Button>
            <Button
              color="teal"
              loading={payoutMutation.isPending}
              onClick={handleRequestPayout}
              data-testid="btn-submit-payout"
            >
              উত্তোলন নিশ্চিত করুন
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
