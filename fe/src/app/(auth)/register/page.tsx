'use client';

import { useForm } from '@mantine/form';
import {
  TextInput,
  PasswordInput,
  Paper,
  Title,
  Text,
  Button,
  Stack,
  Anchor,
} from '@mantine/core';
import { usePostAuthRegister } from '@/api/generated/authentication/authentication';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

export default function RegisterPage() {
  const registerMutation = usePostAuthRegister();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const form = useForm({
    initialValues: {
      full_name: '',
      email: '',
      password: '',
    },

    validate: {
      full_name: (value) => (value.length > 0 ? (value.length <= 100 ? null : 'Max 100 characters') : 'Name is required'),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      password: (value) => (value.length >= 8 ? (value.length <= 72 ? null : 'Max 72 characters') : 'Min 8 characters'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      await registerMutation.mutateAsync({
        data: values,
      });
      notifications.show({
        title: 'Account Created',
        message: 'Your account has been created successfully. You can now sign in.',
        color: 'green',
      });
      router.push('/login');
    } catch (error) {
      let message = 'Failed to create account';
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || message;
      }
      notifications.show({
        title: 'Registration Failed',
        message,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

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
      <Stack gap={0} mb="xl" style={{ textAlign: 'center' }}>
        <Title order={2} style={{ fontSize: '24px', fontWeight: 800, color: 'white' }}>
          নতুন অ্যাকাউন্ট খুলুন
        </Title>
        <Text size="sm" c="gray.4" mt={4}>
          আপনার বিসিএস প্রিলিমিনারি প্রস্তুতি এক ধাপ এগিয়ে রাখুন
        </Text>
      </Stack>

      <form onSubmit={form.onSubmit(handleSubmit)} aria-label="register-form">
        <Stack gap="md">
          <TextInput
            label={<Text component="span" size="sm" fw={600} c="gray.3">পূর্ণ নাম</Text>}
            placeholder="আপনার নাম লিখুন"
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
            }}
            {...form.getInputProps('full_name')}
          />

          <TextInput
            label={<Text component="span" size="sm" fw={600} c="gray.3">ইমেইল ঠিকানা</Text>}
            placeholder="you@example.com"
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
            }}
            {...form.getInputProps('email')}
          />

          <PasswordInput
            label={<Text component="span" size="sm" fw={600} c="gray.3">পাসওয়ার্ড</Text>}
            placeholder="কমপক্ষে ৮ অক্ষর"
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
            অ্যাকাউন্ট তৈরি করুন
          </Button>
        </Stack>
      </form>

      <Text ta="center" mt="xl" size="sm" c="gray.4">
        ইতিমধ্যে অ্যাকাউন্ট আছে?{' '}
        <Anchor component={Link} href="/login" size="sm" fw={700} style={{ color: '#60a5fa' }}>
          সাইন ইন করুন
        </Anchor>
      </Text>
    </Paper>
  );
}
