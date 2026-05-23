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
    <Paper withBorder shadow="md" p={30} radius="md">
      <Title order={2} ta="center" mb="lg">
        Create Account
      </Title>

      <form onSubmit={form.onSubmit(handleSubmit)} aria-label="register-form">
        <Stack>
          <TextInput
            label="Full Name"
            placeholder="John Doe"
            required
            {...form.getInputProps('full_name')}
          />

          <TextInput
            label="Email"
            placeholder="you@example.com"
            required
            {...form.getInputProps('email')}
          />

          <PasswordInput
            label="Password"
            placeholder="Min 8 characters"
            required
            {...form.getInputProps('password')}
          />

          <Button type="submit" fullWidth loading={loading}>
            Create Account
          </Button>
        </Stack>
      </form>

      <Text ta="center" mt="md" size="sm">
        Already have an account?{' '}
        <Anchor component={Link} href="/login" size="sm">
          Sign in
        </Anchor>
      </Text>
    </Paper>
  );
}
