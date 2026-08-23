'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from '@mantine/form';
import {
  PasswordInput,
  Paper,
  Title,
  Text,
  Button,
  Stack,
  Anchor,
  Alert,
  ThemeIcon,
  Box,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconLock, IconCheck, IconAlertCircle, IconArrowLeft } from '@tabler/icons-react';
import Link from 'next/link';
import axios from 'axios';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const form = useForm({
    initialValues: {
      password: '',
      confirmPassword: '',
    },
    validate: {
      password: (value) =>
        value.length >= 8 ? null : 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে',
      confirmPassword: (value, values) =>
        value === values.password ? null : 'পাসওয়ার্ড দুটি মিলছে না',
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    if (!token) {
      notifications.show({
        title: 'ত্রুটি',
        message: 'রিসেট টোকেন পাওয়া যায়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।',
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/reset-password`,
        {
          token,
          new_password: values.password,
        },
        { withCredentials: true }
      );
      setSuccess(true);
      notifications.show({
        title: 'সফল',
        message: 'আপনার পাসওয়ার্ড সফলভাবে রিসেট করা হয়েছে!',
        color: 'green',
      });
      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } catch (error) {
      let message = 'পাসওয়ার্ড রিসেট করতে সমস্যা হয়েছে বা লিংকটির মেয়াদ শেষ হয়েছে';
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || message;
      }
      notifications.show({
        title: 'পাসওয়ার্ড রিসেট ব্যর্থ',
        message,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <Paper
        shadow="xl"
        p={{ base: 'xl', sm: '32px' }}
        radius="24px"
        style={{
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          color: 'white',
        }}
      >
        <Stack gap="lg" align="center" style={{ textAlign: 'center' }}>
          <Alert
            icon={<IconAlertCircle size={20} />}
            title="অবৈধ বা মেয়াদোত্তীর্ণ লিংক"
            color="red"
            variant="light"
            radius="md"
            style={{ width: '100%', textAlign: 'left' }}
          >
            পাসওয়ার্ড রিসেট টোকেনটি খুঁজে পাওয়া যায়নি। লিংকটি হয়তো অসম্পূর্ণ অথবা এর মেয়াদ শেষ হয়ে গেছে।
          </Alert>

          <Button
            component={Link}
            href="/forgot-password"
            fullWidth
            size="md"
            radius="md"
            variant="gradient"
            gradient={{ from: 'blue', to: 'violet' }}
            leftSection={<IconArrowLeft size={18} />}
            style={{ fontWeight: 700 }}
          >
            নতুন রিসেট লিংক পাঠান
          </Button>
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper
      shadow="xl"
      p={{ base: 'xl', sm: '32px' }}
      radius="24px"
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        color: 'white',
      }}
    >
      {success ? (
        <Stack gap="lg" align="center" style={{ textAlign: 'center', padding: '10px 0' }}>
          <ThemeIcon
            size={64}
            radius="xl"
            variant="gradient"
            gradient={{ from: 'teal', to: 'blue' }}
            style={{ boxShadow: '0 10px 25px rgba(20, 184, 166, 0.35)' }}
          >
            <IconCheck size={32} color="white" />
          </ThemeIcon>

          <Box>
            <Title order={2} style={{ fontSize: '22px', fontWeight: 800, color: 'white' }}>
              পাসওয়ার্ড পরিবর্তিত হয়েছে! 🎉
            </Title>
            <Text size="sm" c="gray.3" mt="xs" style={{ lineHeight: 1.6 }}>
              আপনার অ্যাকাউন্টটি নতুন পাসওয়ার্ড দিয়ে আপডেট করা হয়েছে। কিছুক্ষণের মধ্যে আপনাকে লগইন পেজে নিয়ে যাওয়া হচ্ছে...
            </Text>
          </Box>

          <Button
            component={Link}
            href="/login"
            fullWidth
            size="md"
            radius="md"
            variant="gradient"
            gradient={{ from: 'blue', to: 'violet' }}
            style={{ fontWeight: 700 }}
          >
            লগইন পেজে যান
          </Button>
        </Stack>
      ) : (
        <>
          <Stack gap={0} mb="xl" style={{ textAlign: 'center' }}>
            <Title order={2} style={{ fontSize: '24px', fontWeight: 800, color: 'white' }}>
              নতুন পাসওয়ার্ড নির্ধারণ করুন 🔒
            </Title>
            <Text size="sm" c="gray.4" mt={4}>
              আপনার অ্যাকাউন্টের জন্য একটি শক্তিশালী নতুন পাসওয়ার্ড লিখুন
            </Text>
          </Stack>

          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <PasswordInput
                label={<Text component="span" size="sm" fw={600} c="gray.3">নতুন পাসওয়ার্ড</Text>}
                placeholder="কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড"
                leftSection={<IconLock size={16} style={{ color: '#94a3b8' }} />}
                required
                styles={{
                  input: {
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    color: 'white',
                    '&:focus': {
                      borderColor: '#60a5fa',
                    },
                  },
                  innerInput: {
                    color: 'white',
                  },
                }}
                {...form.getInputProps('password')}
              />

              <PasswordInput
                label={<Text component="span" size="sm" fw={600} c="gray.3">পাসওয়ার্ড নিশ্চিত করুন</Text>}
                placeholder="নতুন পাসওয়ার্ডটি পুনরায় লিখুন"
                leftSection={<IconLock size={16} style={{ color: '#94a3b8' }} />}
                required
                styles={{
                  input: {
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    color: 'white',
                    '&:focus': {
                      borderColor: '#60a5fa',
                    },
                  },
                  innerInput: {
                    color: 'white',
                  },
                }}
                {...form.getInputProps('confirmPassword')}
              />

              <Button
                type="submit"
                fullWidth
                size="md"
                radius="md"
                variant="gradient"
                gradient={{ from: 'blue', to: 'violet' }}
                loading={loading}
                mt="sm"
                style={{
                  boxShadow: '0 8px 20px rgba(59, 130, 246, 0.35)',
                  fontWeight: 700,
                }}
              >
                পাসওয়ার্ড রিসেট করুন
              </Button>
            </Stack>
          </form>

          <Text ta="center" mt="xl" size="sm" c="gray.4">
            লগইন করতে চান?{' '}
            <Anchor component={Link} href="/login" size="sm" fw={700} style={{ color: '#60a5fa' }}>
              সাইন ইন পেজে যান
            </Anchor>
          </Text>
        </>
      )}
    </Paper>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <Paper
          shadow="xl"
          p="xl"
          radius="24px"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: 'white',
            textAlign: 'center',
          }}
        >
          <Text size="sm" c="gray.4">লোড হচ্ছে...</Text>
        </Paper>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
