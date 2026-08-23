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
  Group,
} from '@mantine/core';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';
import axios from 'axios';

export default function LoginPage() {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      email: '',
      password: '',
    },

    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      password: (value) => (value.length > 0 ? null : 'Password is required'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
    } catch (error) {
      let message = 'Invalid email or password';
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || message;
      }
      notifications.show({
        title: 'Authentication Failed',
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
          সাইন ইন করুন
        </Title>
        <Text size="sm" c="gray.4" mt={4}>
          বিসিএস প্রিলিমিনারি প্রস্তুতি শুরু করতে সাইন ইন করুন
        </Text>
      </Stack>

      <form onSubmit={form.onSubmit(handleSubmit)} aria-label="login-form">
        <Stack gap="md">
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
            label={
              <Group justify="space-between" align="center" style={{ width: '100%' }}>
                <Text component="span" size="sm" fw={600} c="gray.3">পাসওয়ার্ড</Text>
                <Anchor component={Link} href="/forgot-password" size="xs" style={{ color: '#93c5fd' }}>
                  পাসওয়ার্ড ভুলে গেছেন?
                </Anchor>
              </Group>
            }
            placeholder="আপনার পাসওয়ার্ড লিখুন"
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
            সাইন ইন করুন
          </Button>
        </Stack>
      </form>

      <Text ta="center" mt="xl" size="sm" c="gray.4">
        অ্যাকাউন্ট নেই?{' '}
        <Anchor component={Link} href="/register" size="sm" fw={700} style={{ color: '#60a5fa' }}>
          নিবন্ধন করুন
        </Anchor>
      </Text>
    </Paper>
  );
}
