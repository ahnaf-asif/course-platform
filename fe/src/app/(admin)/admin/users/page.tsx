'use client';

import {
  Title,
  Text,
  Stack,
  Group,
  TextInput,
  Table,
  Badge,
  ActionIcon,
  Menu,
  LoadingOverlay,
  Avatar,
  Select,
  Paper,
  Box,
} from '@mantine/core';
import {
  IconSearch,
  IconDotsVertical,
  IconShieldCheck,
  IconUser,
  IconFilter,
} from '@tabler/icons-react';
import { useGetAdminUsers, usePatchAdminUsersIdRole } from '@/api/generated/admin-user/admin-user';
import { useState, useMemo } from 'react';
import { notifications } from '@mantine/notifications';

export default function UsersManagement() {
  const { data: users, isLoading, refetch } = useGetAdminUsers();
  const { mutateAsync: updateRole, isPending: isUpdating } = usePatchAdminUsersIdRole();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | null>('ALL');

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((user) => {
      const matchesSearch = 
        user.email.toLowerCase().includes(search.toLowerCase()) || 
        user.full_name.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const handleUpdateRole = async (userId: string, newRole: 'ADMIN' | 'USER') => {
    const action = newRole === 'ADMIN' ? 'promote' : 'demote';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      await updateRole({ id: userId, data: { role: newRole } });
      notifications.show({
        title: 'Success',
        message: `User ${action}d successfully`,
        color: 'green',
      });
      refetch();
    } catch {
      notifications.show({
        title: 'Error',
        message: `Failed to ${action} user`,
        color: 'red',
      });
    }
  };

  const rows = filteredUsers.map((user) => (
    <Table.Tr key={user.id}>
      <Table.Td>
        <Group gap="sm">
          <Avatar src={user.avatar_url || undefined} radius="xl" size="sm">
            {user.full_name.charAt(0)}
          </Avatar>
          <div>
            <Text size="sm" fw={500}>
              {user.full_name}
            </Text>
            <Text size="xs" c="dimmed">
              {user.email}
            </Text>
          </div>
        </Group>
      </Table.Td>
      <Table.Td>
        <Badge 
          color={user.role === 'ADMIN' ? 'red' : 'blue'} 
          variant="light"
          leftSection={user.role === 'ADMIN' ? <IconShieldCheck size={12} /> : <IconUser size={12} />}
        >
          {user.role}
        </Badge>
      </Table.Td>
      <Table.Td>
        <Text size="sm">{new Date(user.created_at).toLocaleDateString()}</Text>
      </Table.Td>
      <Table.Td>
        <Menu shadow="md" width={200} position="bottom-end" withArrow>
          <Menu.Target>
            <ActionIcon variant="subtle" color="gray">
              <IconDotsVertical size={16} />
            </ActionIcon>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Manage Role</Menu.Label>
            {user.role === 'USER' ? (
              <Menu.Item 
                leftSection={<IconShieldCheck size={16} />} 
                onClick={() => handleUpdateRole(user.id, 'ADMIN')}
              >
                Promote to Admin
              </Menu.Item>
            ) : (
              <Menu.Item 
                leftSection={<IconUser size={16} />} 
                onClick={() => handleUpdateRole(user.id, 'USER')}
              >
                Demote to User
              </Menu.Item>
            )}
          </Menu.Dropdown>
        </Menu>
      </Table.Td>
    </Table.Tr>
  ));

  return (
    <Stack gap="xl" pos="relative">
      <LoadingOverlay visible={isLoading || isUpdating} />
      
      <Group justify="space-between">
        <Title order={2}>Users Management</Title>
      </Group>

      <Paper withBorder p="md" radius="md">
        <Group mb="md" justify="space-between">
          <Group style={{ flex: 1 }}>
            <TextInput
              placeholder="Search by name or email..."
              leftSection={<IconSearch size={16} />}
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              style={{ flex: 1, maxWidth: 400 }}
            />
            <Select
              placeholder="Filter by role"
              leftSection={<IconFilter size={16} />}
              data={[
                { value: 'ALL', label: 'All Roles' },
                { value: 'ADMIN', label: 'Admins' },
                { value: 'USER', label: 'Users' },
              ]}
              value={roleFilter}
              onChange={setRoleFilter}
              allowDeselect={false}
              w={150}
            />
          </Group>
          <Text size="sm" c="dimmed">
            {filteredUsers.length} users found
          </Text>
        </Group>

        <Box style={{ overflowX: 'auto' }}>
          <Table verticalSpacing="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>User</Table.Th>
                <Table.Th>Role</Table.Th>
                <Table.Th>Joined</Table.Th>
                <Table.Th w={50} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {rows.length > 0 ? (
                rows
              ) : (
                <Table.Tr>
                  <Table.Td colSpan={4}>
                    <Text ta="center" py="xl" c="dimmed">
                      No users found matching your criteria
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </Box>
      </Paper>
    </Stack>
  );
}
