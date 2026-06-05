'use client';

import { useEffect } from 'react';
import {
  Title,
  Text,
  Stack,
  TextInput,
  Textarea,
  Button,
  Group,
  Avatar,
  Paper,
  Tabs,
  PasswordInput,
  LoadingOverlay,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useGetMe, useUpdateMe, useUpdatePassword } from '@/api/generated/user/user';
import { IconUser, IconLock, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import axios from 'axios';

export default function AdminProfilePage() {
  const { data: user, isLoading, refetch } = useGetMe();
  const { mutateAsync: updateProfile, isPending: isUpdatingProfile } = useUpdateMe();
  const { mutateAsync: updatePassword, isPending: isUpdatingPassword } = useUpdatePassword();

  const profileForm = useForm({
    initialValues: {
      full_name: '',
      email: '',
      bio: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      full_name: (value) => (value.length > 0 ? null : 'Name is required'),
    },
  });

  useEffect(() => {
    if (user) {
      profileForm.setValues({
        full_name: user.full_name || '',
        email: user.email || '',
        bio: user.bio || '',
      });
      profileForm.resetDirty();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const passwordForm = useForm({
    initialValues: {
      old_password: '',
      new_password: '',
      confirm_password: '',
    },
    validate: {
      new_password: (value) => (value.length >= 8 ? null : 'Password must be at least 8 characters'),
      confirm_password: (value, values) =>
        value === values.new_password ? null : 'Passwords do not match',
    },
  });

  const handleUpdateProfile = async (values: typeof profileForm.values) => {
    try {
      await updateProfile({
        data: {
          full_name: values.full_name,
          email: values.email,
          bio: values.bio,
        },
      });
      notifications.show({
        title: 'Profile Updated',
        message: 'Your profile information has been saved.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      refetch();
    } catch (error) {
      let message = 'Failed to update profile';
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || message;
      }
      notifications.show({
        title: 'Update Failed',
        message,
        color: 'red',
      });
    }
  };

  const handleUpdatePassword = async (values: typeof passwordForm.values) => {
    try {
      await updatePassword({
        data: {
          old_password: values.old_password,
          new_password: values.new_password,
        },
      });
      notifications.show({
        title: 'Password Changed',
        message: 'Your password has been updated successfully.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      passwordForm.reset();
    } catch (error) {
      let message = 'Failed to change password';
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || message;
      }
      notifications.show({
        title: 'Update Failed',
        message,
        color: 'red',
      });
    }
  };

  return (
    <Stack gap="xl">
      <Title order={2}>Account Settings</Title>

      <div style={{ position: 'relative' }}>
        <LoadingOverlay visible={isLoading} />
        
        <Tabs defaultValue="profile">
          <Tabs.List mb="md">
            <Tabs.Tab value="profile" leftSection={<IconUser size={16} />}>
              Profile
            </Tabs.Tab>
            <Tabs.Tab value="security" leftSection={<IconLock size={16} />}>
              Security
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="profile">
            <Paper withBorder p="xl" radius="md">
              <form onSubmit={profileForm.onSubmit(handleUpdateProfile)}>
                <Stack gap="lg">
                  <Group align="center">
                    <Avatar
                      src={user?.avatar_url}
                      size={80}
                      radius={80}
                      color="blue"
                    >
                      {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                    </Avatar>
                    <div>
                      <Text size="lg" fw={500}>
                        {user?.full_name}
                      </Text>
                      <Text color="dimmed" size="sm">
                        {user?.role} • Account created {user?.created_at && new Date(user.created_at).toLocaleDateString()}
                      </Text>
                    </div>
                  </Group>

                  <TextInput
                    label="Full Name"
                    placeholder="Your name"
                    required
                    {...profileForm.getInputProps('full_name')}
                  />

                  <TextInput
                    label="Email Address"
                    placeholder="you@example.com"
                    required
                    {...profileForm.getInputProps('email')}
                  />

                  <Textarea
                    label="Bio"
                    placeholder="Tell us about yourself"
                    minRows={3}
                    {...profileForm.getInputProps('bio')}
                  />

                  <Group justify="flex-end">
                    <Button type="submit" loading={isUpdatingProfile}>
                      Save Changes
                    </Button>
                  </Group>
                </Stack>
              </form>
            </Paper>
          </Tabs.Panel>

          <Tabs.Panel value="security">
            <Paper withBorder p="xl" radius="md">
              <form onSubmit={passwordForm.onSubmit(handleUpdatePassword)}>
                <Stack gap="lg">
                  <Title order={4}>Change Password</Title>
                  <Text size="sm" color="dimmed">
                    Ensure your account is using a long, random password to stay secure.
                  </Text>

                  <PasswordInput
                    label="Current Password"
                    placeholder="Your current password"
                    required
                    {...passwordForm.getInputProps('old_password')}
                  />

                  <PasswordInput
                    label="New Password"
                    placeholder="At least 8 characters"
                    required
                    {...passwordForm.getInputProps('new_password')}
                  />

                  <PasswordInput
                    label="Confirm New Password"
                    placeholder="Repeat new password"
                    required
                    {...passwordForm.getInputProps('confirm_password')}
                  />

                  <Group justify="flex-end">
                    <Button type="submit" loading={isUpdatingPassword}>
                      Update Password
                    </Button>
                  </Group>
                </Stack>
              </form>
            </Paper>
          </Tabs.Panel>
        </Tabs>
      </div>
    </Stack>
  );
}
