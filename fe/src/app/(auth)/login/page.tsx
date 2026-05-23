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
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import Link from 'next/link';

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
    } catch (error: any) {
      notifications.show({
        title: 'Authentication Failed',
        message: error.response?.data?.message || 'Invalid email or password',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper withBorder shadow="md" p={30} radius="md">
      <Title order={2} ta="center" mb="lg">
        Sign In
      </Title>

      <form onSubmit={form.onSubmit(handleSubmit)} aria-label="login-form">
        <Stack>
          <TextInput
            label="Email"
            placeholder="you@example.com"
            required
            {...form.getInputProps('email')}
          />

          <PasswordInput
            label="Password"
            placeholder="Your password"
            required
            {...form.getInputProps('password')}
          />

          <Button type="submit" fullWidth loading={loading}>
            Sign In
          </Button>
        </Stack>
      </form>

      <Text ta="center" mt="md" size="sm">
        Do not have an account?{' '}
        <Anchor component={Link} href="/register" size="sm">
          Register
        </Anchor>
      </Text>
    </Paper>
  );
}
