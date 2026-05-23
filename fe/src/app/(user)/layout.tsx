'use client';

import { AppShell, Group, Title, Menu, UnstyledButton, Text, Avatar } from '@mantine/core';
import { useAuth } from '@/hooks/useAuth';
import { AuthGuard } from '@/components/guards/AuthGuard';
import { IconLogout, IconChevronDown } from '@tabler/icons-react';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { logout, accessToken } = useAuth();
  
  // Decoding email from JWT for display (crude but works for placeholder)
  const decodeEmail = (token: string | null) => {
    if (!token) return '';
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      return payload.email || '';
    } catch {
      return '';
    }
  };

  const userEmail = decodeEmail(accessToken);

  return (
    <AuthGuard>
      <AppShell
        header={{ height: 60 }}
        padding="md"
      >
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Title order={3}>Course Platform</Title>
            
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <UnstyledButton>
                  <Group gap={7}>
                    <Avatar src={null} alt={userEmail} radius="xl" size={24} />
                    <Text size="sm" fw={500} visibleFrom="xs">
                      {userEmail}
                    </Text>
                    <IconChevronDown size={12} stroke={1.5} />
                  </Group>
                </UnstyledButton>
              </Menu.Target>

              <Menu.Dropdown>
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

        <AppShell.Main>
          {children}
        </AppShell.Main>
      </AppShell>
    </AuthGuard>
  );
}
