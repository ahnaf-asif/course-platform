'use client';

import React from 'react';
import {
  Title,
  Group,
  Stack,
  Button,
  Text,
  Alert,
  Card,
  SimpleGrid,
} from '@mantine/core';
import {
  IconPlus,
  IconRefresh,
  IconAlertCircle,
  IconChartBar,
  IconBook,
  IconHelpCircle,
  IconShoppingCart,
  IconUsers,
  IconSpeakerphone,
  IconTag,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useGetAdminDashboardAnalytics } from '@/api/generated/admin-analytics/admin-analytics';
import { DashboardKPIs } from './_components/DashboardKPIs';
import { RevenueOrdersChart } from './_components/RevenueOrdersChart';
import { UserGrowthChart } from './_components/UserGrowthChart';
import { TopCoursesCard } from './_components/TopCoursesCard';
import { RecentActivityCards } from './_components/RecentActivityCards';

export default function AdminDashboard() {
  const {
    data: analytics,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetAdminDashboardAnalytics();

  return (
    <Stack gap="xl" p={{ base: 'sm', md: 'md' }}>
      {/* Top Header */}
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <div>
          <Group gap="xs" align="center">
            <IconChartBar size={28} color="#2563eb" />
            <Title order={2} style={{ fontWeight: 800, color: '#0f172a' }}>
              অ্যানালিটিক্স ও ড্যাশবোর্ড (Overview & Analytics)
            </Title>
          </Group>
          <Text size="sm" c="dimmed" mt={2}>
            প্ল্যাটফর্মের সামগ্রিক আয়, শিক্ষার্থী নিবন্ধন বৃদ্ধি ও কোর্স কার্যক্রমের রিয়েল-টাইম তথ্য।
          </Text>
        </div>

        <Group gap="sm" wrap="wrap">
          <Button
            variant="light"
            color="blue"
            leftSection={<IconRefresh size={16} className={isFetching ? 'animate-spin' : ''} />}
            onClick={() => refetch()}
            data-testid="btn-refresh-dashboard"
          >
            রিফ্রেশ
          </Button>

          <Button
            component={Link}
            href="/admin/courses"
            leftSection={<IconPlus size={16} />}
            data-testid="btn-new-course"
          >
            নতুন কোর্স তৈরি
          </Button>
        </Group>
      </Group>

      {/* Error Alert */}
      {isError && (
        <Alert color="red" icon={<IconAlertCircle size={16} />} title="Error">
          ড্যাশবোর্ড তথ্য লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে রিফ্রেশ করুন।
        </Alert>
      )}

      {/* 1. Executive KPI Summary Cards */}
      <DashboardKPIs kpis={analytics?.kpis} isLoading={isLoading} />

      {/* 2. Primary Charts Grid (Revenue Trend + User Signups) */}
      <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
        <RevenueOrdersChart
          dailyTrends={analytics?.daily_revenue_trends}
          monthlyTrends={analytics?.monthly_revenue_trends}
          isLoading={isLoading}
        />
        <UserGrowthChart
          userTrends={analytics?.daily_user_trends}
          isLoading={isLoading}
        />
      </SimpleGrid>

      {/* 3. Top Performing Courses & Payment Distribution */}
      <TopCoursesCard
        topCourses={analytics?.top_courses}
        paymentDistribution={analytics?.payment_distribution}
        isLoading={isLoading}
      />

      {/* 4. Recent Activity (Recent Orders & Recent Users) */}
      <RecentActivityCards
        recentOrders={analytics?.recent_orders}
        recentUsers={analytics?.recent_users}
        isLoading={isLoading}
      />

      {/* 5. Quick Navigation Hub */}
      <Card p="lg" radius="md" withBorder shadow="xs">
        <Title order={4} fw={700} mb="md" style={{ color: '#0f172a' }}>
          ম্যানেজমেন্ট শর্টকাটস (Quick Actions)
        </Title>
        <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} spacing="sm">
          <Button variant="light" color="blue" component={Link} href="/admin/courses" h={75}>
            <Stack gap={4} align="center">
              <IconBook size={20} />
              <Text size="xs" fw={600}>কোর্সসমূহ</Text>
            </Stack>
          </Button>

          <Button variant="light" color="green" component={Link} href="/admin/orders" h={75}>
            <Stack gap={4} align="center">
              <IconShoppingCart size={20} />
              <Text size="xs" fw={600}>অর্ডার ও বিক্রয়</Text>
            </Stack>
          </Button>

          <Button variant="light" color="indigo" component={Link} href="/admin/users" h={75}>
            <Stack gap={4} align="center">
              <IconUsers size={20} />
              <Text size="xs" fw={600}>শিক্ষার্থীবৃন্দ</Text>
            </Stack>
          </Button>

          <Button variant="light" color="orange" component={Link} href="/admin/quizzes" h={75}>
            <Stack gap={4} align="center">
              <IconHelpCircle size={20} />
              <Text size="xs" fw={600}>কুইজ ও প্রশ্ন</Text>
            </Stack>
          </Button>

          <Button variant="light" color="violet" component={Link} href="/admin/coupons" h={75}>
            <Stack gap={4} align="center">
              <IconTag size={20} />
              <Text size="xs" fw={600}>ডিসকাউন্ট কুপন</Text>
            </Stack>
          </Button>

          <Button variant="light" color="teal" component={Link} href="/admin/announcements" h={75}>
            <Stack gap={4} align="center">
              <IconSpeakerphone size={20} />
              <Text size="xs" fw={600}>ঘোষণা ও নোটিশ</Text>
            </Stack>
          </Button>
        </SimpleGrid>
      </Card>
    </Stack>
  );
}
