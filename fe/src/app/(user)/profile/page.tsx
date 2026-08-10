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
  Container,
  Box,
  Badge,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { useGetMe, useUpdateMe, useUpdatePassword } from '@/api/generated/user/user';
import { IconUser, IconLock, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import axios from 'axios';

export default function UserProfilePage() {
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
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'সঠিক ইমেইল ঠিকানা লিখুন'),
      full_name: (value) => (value.length > 0 ? null : 'নামের ঘরটি পূরণ করুন'),
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
      new_password: (value) => (value.length >= 8 ? null : 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে'),
      confirm_password: (value, values) =>
        value === values.new_password ? null : 'পাসওয়ার্ড দুটি মিলছে না',
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
        title: 'প্রোফাইল আপডেট হয়েছে',
        message: 'আপনার প্রোফাইলের তথ্য সফলভাবে সংরক্ষণ করা হয়েছে।',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      refetch();
    } catch (error) {
      let message = 'প্রোফাইল আপডেট করা যায়নি';
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || message;
      }
      notifications.show({
        title: 'আপডেট ব্যর্থ হয়েছে',
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
        title: 'পাসওয়ার্ড পরিবর্তিত হয়েছে',
        message: 'আপনার নতুন পাসওয়ার্ড সফলভাবে আপডেট করা হয়েছে।',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      passwordForm.reset();
    } catch (error) {
      let message = 'পাসওয়ার্ড পরিবর্তন করা যায়নি';
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || message;
      }
      notifications.show({
        title: 'আপডেট ব্যর্থ হয়েছে',
        message,
        color: 'red',
      });
    }
  };

  return (
    <Box pb="xl">
      {/* Hero Section */}
      <Box
        py={{ base: '32px', sm: '50px', md: '75px' }}
        style={{
          background: 'radial-gradient(circle at 80% 20%, #1e1b4b 0%, #0f172a 60%, #020617 100%)',
          color: 'white',
          position: 'relative',
        }}
        mb={{ base: '20px', sm: '36px' }}
      >
        <div className="glow-effect" style={{ top: '10%', right: '15%', opacity: 0.7 }} />
        <Container size="xl" style={{ position: 'relative', zIndex: 10 }}>
          <Stack gap="xs">
            <Badge variant="gradient" gradient={{ from: 'blue', to: 'violet' }} size="lg" radius="sm" style={{ width: 'fit-content' }}>
              অ্যাকাউন্ট সেটিংস
            </Badge>
            <Title order={1} style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 900 }}>
              আমার প্রোফাইল ও নিরাপত্তা
            </Title>
            <Text size="md" style={{ color: 'var(--mantine-color-gray-4)', lineHeight: 1.6, maxWidth: '600px' }}>
              আপনার অ্যাকাউন্ট সম্পর্কিত ব্যক্তিগত তথ্য ও সিকিউরিটি পাসওয়ার্ড পরিবর্তন ও নিয়ন্ত্রণ করুন।
            </Text>
          </Stack>
        </Container>
      </Box>

      {/* Profile Form Container */}
      <Container size="xl">
        <div style={{ position: 'relative' }}>
          <LoadingOverlay visible={isLoading} />
          
          <Tabs defaultValue="profile" variant="outline" radius="md">
            <Tabs.List mb="xl">
              <Tabs.Tab
                value="profile"
                leftSection={<IconUser size={18} />}
                style={{ fontWeight: 700, fontSize: '14px' }}
                py={{ base: '8px', sm: '12px' }}
                px={{ base: '12px', sm: '24px' }}
              >
                প্রোফাইল তথ্য
              </Tabs.Tab>
              <Tabs.Tab
                value="security"
                leftSection={<IconLock size={18} />}
                style={{ fontWeight: 700, fontSize: '14px' }}
                py={{ base: '8px', sm: '12px' }}
                px={{ base: '12px', sm: '24px' }}
              >
                সিকিউরিটি
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="profile">
              <Paper p={{ base: 'lg', sm: 'xl' }} radius="lg" withBorder shadow="xs">
                <form onSubmit={profileForm.onSubmit(handleUpdateProfile)}>
                  <Stack gap="lg">
                    <Group align="center" gap="md">
                      <Avatar
                        src={user?.avatar_url}
                        size={80}
                        radius="xl"
                        variant="gradient"
                        gradient={{ from: 'blue', to: 'violet' }}
                        fw={800}
                        style={{ fontSize: '28px' }}
                      >
                        {user?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase()}
                      </Avatar>
                      <div>
                        <Title order={3} style={{ fontSize: '22px', fontWeight: 800 }}>
                          {user?.full_name || 'ইউজার প্রোফাইল'}
                        </Title>
                        <Group gap="xs" mt="xs">
                          <Badge color="blue" variant="light" size="sm">
                            {user?.role || 'STUDENT'}
                          </Badge>
                          <Text c="dimmed" size="xs">
                            অ্যাকাউন্ট খোলার তারিখ: {user?.created_at && new Date(user.created_at).toLocaleDateString('bn-BD')}
                          </Text>
                        </Group>
                      </div>
                    </Group>

                    <TextInput
                      label={<Text component="span" fw={600} size="sm">পূর্ণ নাম</Text>}
                      placeholder="আপনার নাম লিখুন"
                      required
                      size="md"
                      {...profileForm.getInputProps('full_name')}
                    />

                    <TextInput
                      label={<Text component="span" fw={600} size="sm">ইমেইল ঠিকানা</Text>}
                      placeholder="you@example.com"
                      required
                      size="md"
                      {...profileForm.getInputProps('email')}
                    />

                    <Textarea
                      label={<Text component="span" fw={600} size="sm">বায়ো / নিজের সম্পর্কে</Text>}
                      placeholder="আপনার সম্পর্কে সংক্ষেপে লিখুন..."
                      minRows={3}
                      size="md"
                      {...profileForm.getInputProps('bio')}
                    />

                    <Group justify="flex-end">
                      <Button
                        type="submit"
                        variant="gradient"
                        gradient={{ from: 'blue', to: 'violet' }}
                        size="md"
                        radius="md"
                        loading={isUpdatingProfile}
                        style={{ fontWeight: 700 }}
                      >
                        পরিবর্তন সংরক্ষণ করুন
                      </Button>
                    </Group>
                  </Stack>
                </form>
              </Paper>
            </Tabs.Panel>

            <Tabs.Panel value="security">
              <Paper p={{ base: 'lg', sm: 'xl' }} radius="lg" withBorder shadow="xs">
                <form onSubmit={passwordForm.onSubmit(handleUpdatePassword)}>
                  <Stack gap="lg">
                    <div>
                      <Title order={3} style={{ fontSize: '22px', fontWeight: 800 }} mb="xs">
                        পাসওয়ার্ড পরিবর্তন করুন
                      </Title>
                      <Text size="sm" c="dimmed" style={{ lineHeight: 1.6 }}>
                        আপনার অ্যাকাউন্ট নিরাপদ রাখতে একটি শক্তিশালী এবং দীর্ঘ পাসওয়ার্ড ব্যবহার করুন।
                      </Text>
                    </div>

                    <PasswordInput
                      label={<Text component="span" fw={600} size="sm">বর্তমান পাসওয়ার্ড</Text>}
                      placeholder="আপনার বর্তমান পাসওয়ার্ড লিখুন"
                      required
                      size="md"
                      {...passwordForm.getInputProps('old_password')}
                    />

                    <PasswordInput
                      label={<Text component="span" fw={600} size="sm">নতুন পাসওয়ার্ড</Text>}
                      placeholder="কমপক্ষে ৮ অক্ষর"
                      required
                      size="md"
                      {...passwordForm.getInputProps('new_password')}
                    />

                    <PasswordInput
                      label={<Text component="span" fw={600} size="sm">নতুন পাসওয়ার্ড নিশ্চিত করুন</Text>}
                      placeholder="পুনরায় নতুন পাসওয়ার্ড লিখুন"
                      required
                      size="md"
                      {...passwordForm.getInputProps('confirm_password')}
                    />

                    <Group justify="flex-end">
                      <Button
                        type="submit"
                        variant="gradient"
                        gradient={{ from: 'blue', to: 'violet' }}
                        size="md"
                        radius="md"
                        loading={isUpdatingPassword}
                        style={{ fontWeight: 700 }}
                      >
                        পাসওয়ার্ড হালনাগাদ করুন
                      </Button>
                    </Group>
                  </Stack>
                </form>
              </Paper>
            </Tabs.Panel>
          </Tabs>
        </div>
      </Container>
    </Box>
  );
}
