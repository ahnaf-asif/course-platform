'use client';

import { 
  AppShell, 
  Group, 
  Title, 
  NavLink, 
  Text, 
  Avatar, 
  Stack, 
  Burger, 
  Menu, 
  UnstyledButton,
  Box,
  ScrollArea,
  Divider,
} from '@mantine/core';
import { useAuth } from '@/hooks/useAuth';
import { useAuthContext } from '@/context/AuthContext';
import { AuthGuard } from '@/components/guards/AuthGuard';
import { usePathname } from 'next/navigation';
import { useDisclosure } from '@mantine/hooks';
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
  IconChevronDown,
  IconUser,
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
  const [opened, { toggle, close }] = useDisclosure();

  return (
    <AuthGuard>
      <AppShell
        header={{ height: 60 }}
        navbar={{ 
          width: 260, 
          breakpoint: 'sm',
          collapsed: { mobile: !opened }
        }}
        padding="md"
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Group>
              <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
              <Title order={3} visibleFrom="xs">Platform Admin</Title>
              <Title order={4} hiddenFrom="xs">Admin</Title>
            </Group>

            <Menu shadow="md" width={200} position="bottom-end">
              <Menu.Target>
                <UnstyledButton>
                  <Group gap={7}>
                    <Avatar src={null} alt={userEmail || ''} radius="xl" size={30} color="blue">
                      {userEmail?.[0].toUpperCase()}
                    </Avatar>
                    <Box style={{ flex: 1 }} visibleFrom="sm">
                      <Text size="sm" fw={500}>
                        {userEmail?.split('@')[0]}
                      </Text>
                      <Text color="dimmed" size="xs">
                        Administrator
                      </Text>
                    </Box>
                    <IconChevronDown size={14} stroke={1.5} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>Application</Menu.Label>
                <Menu.Item
                  leftSection={<IconLayoutDashboard size={14} stroke={1.5} />}
                  component={Link}
                  href="/dashboard"
                >
                  User Dashboard
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconUser size={14} stroke={1.5} />}
                  component={Link}
                  href="/admin/profile"
                >
                  My Profile
                </Menu.Item>

                <Menu.Divider />

                <Menu.Label>Danger zone</Menu.Label>
                <Menu.Item
                  color="red"
                  leftSection={<IconLogout size={14} stroke={1.5} />}
                  onClick={logout}
                >
                  Sign Out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="md">
          <AppShell.Section grow component={ScrollArea}>
            <Stack gap="xs">
              {adminLinks.map((link) => (
                <NavLink
                  key={link.href}
                  component={Link}
                  href={link.href}
                  label={link.label}
                  leftSection={<link.icon size={20} stroke={1.5} />}
                  active={
                    link.href === '/admin' 
                      ? pathname === '/admin' 
                      : pathname.startsWith(link.href)
                  }
                  onClick={close}
                />
              ))}
            </Stack>
          </AppShell.Section>

          <Divider my="sm" />

          <AppShell.Section>
            <NavLink
              label="Sign Out"
              leftSection={<IconLogout size={20} stroke={1.5} />}
              onClick={logout}
              color="red"
              variant="light"
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
