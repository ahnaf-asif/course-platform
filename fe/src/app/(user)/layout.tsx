'use client';

import { AppShell, Group, Title, Menu, UnstyledButton, Text, Avatar } from '@mantine/core';
import { useAuth } from '@/hooks/useAuth';
import { useAuthContext } from '@/context/AuthContext';
import { AuthGuard } from '@/components/guards/AuthGuard';
import { IconLogout, IconChevronDown } from '@tabler/icons-react';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useAuth();
  const { userEmail } = useAuthContext();

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
                    <Avatar src={null} alt={userEmail || ''} radius="xl" size={24} />
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
