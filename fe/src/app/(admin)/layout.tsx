'use client';

import { AppShell, Group, Title, NavLink, Text, Avatar, Stack } from '@mantine/core';
import { useAuth } from '@/hooks/useAuth';
import { useAuthContext } from '@/context/AuthContext';
import { AuthGuard } from '@/components/guards/AuthGuard';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  IconLayoutDashboard,
  IconBook,
  IconUsers,
  IconHelpCircle,
  IconShoppingCart,
  IconSpeakerphone,
  IconTag,
  IconLogout,
} from '@tabler/icons-react';

const adminLinks = [
  { label: 'Dashboard', icon: IconLayoutDashboard, href: '/admin' },
  { label: 'Courses', icon: IconBook, href: '/admin/courses' },
  { label: 'Users', icon: IconUsers, href: '/admin/users' },
  { label: 'Quizzes', icon: IconHelpCircle, href: '/admin/quizzes' },
  { label: 'Orders', icon: IconShoppingCart, href: '/admin/orders' },
  { label: 'Announcements', icon: IconSpeakerphone, href: '/admin/announcements' },
  { label: 'Coupons', icon: IconTag, href: '/admin/coupons' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const { userEmail } = useAuthContext();
  const pathname = usePathname();

  return (
    <AuthGuard requiredRole="ADMIN">
      <AppShell
        header={{ height: 60 }}
        navbar={{ width: 260, breakpoint: 'sm' }}
        padding="md"
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Title order={3}>Platform Admin</Title>
            <Group>
              <Text size="sm" fw={500}>{userEmail}</Text>
              <Avatar src={null} radius="xl" size={24} />
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="xs">
          <AppShell.Section grow>
            <Stack gap="xs">
              {adminLinks.map((link) => (
                <NavLink
                  key={link.href}
                  component={Link}
                  href={link.href}
                  label={link.label}
                  leftSection={<link.icon size={16} stroke={1.5} />}
                  active={pathname === link.href}
                />
              ))}
            </Stack>
          </AppShell.Section>

          <AppShell.Section>
            <NavLink
              label="Sign Out"
              leftSection={<IconLogout size={16} stroke={1.5} />}
              onClick={logout}
              color="red"
            />
          </AppShell.Section>
        </AppShell.Navbar>

        <AppShell.Main>
          {children}
        </AppShell.Main>
      </AppShell>
    </AuthGuard>
  );
}
