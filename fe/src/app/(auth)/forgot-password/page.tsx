'use client';

import { useForm } from '@mantine/form';
import {
  TextInput,
  Paper,
  Title,
  Text,
  Button,
  Stack,
  Anchor,
  ThemeIcon,
  Box,
} from '@mantine/core';
import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import { IconMail, IconMailCheck, IconArrowLeft } from '@tabler/icons-react';
import Link from 'next/link';
import axios from 'axios';

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const form = useForm({
    initialValues: {
      email: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'সঠিক ইমেইল ঠিকানা দিন'),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/forgot-password`,
        { email: values.email },
        { withCredentials: true }
      );
      setSubmittedEmail(values.email);
    } catch (error) {
      let message = 'পাসওয়ার্ড রিসেট অনুরোধ ব্যর্থ হয়েছে';
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || message;
      }
      notifications.show({
        title: 'অনুরোধ ব্যর্থ',
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
      {submittedEmail ? (
        <Stack gap="lg" align="center" style={{ textAlign: 'center', padding: '10px 0' }}>
          <ThemeIcon
            size={64}
            radius="xl"
            variant="gradient"
            gradient={{ from: 'blue', to: 'violet' }}
            style={{ boxShadow: '0 10px 25px rgba(59, 130, 246, 0.35)' }}
          >
            <IconMailCheck size={32} color="white" />
          </ThemeIcon>

          <Box>
            <Title order={2} style={{ fontSize: '22px', fontWeight: 800, color: 'white' }}>
              রিসেট লিংক পাঠানো হয়েছে! ✉️
            </Title>
            <Text size="sm" c="gray.3" mt="xs" style={{ lineHeight: 1.6 }}>
              আমরা <strong style={{ color: '#60a5fa' }}>{submittedEmail}</strong> ঠিকানায় পাসওয়ার্ড রিসেটের নির্দেশাবলী পাঠিয়েছি। অনুগ্রহ করে আপনার ইনবক্স চেক করুন।
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
            leftSection={<IconArrowLeft size={18} />}
            style={{
              boxShadow: '0 8px 20px rgba(59, 130, 246, 0.35)',
              fontWeight: 700,
            }}
          >
            লগইন পেজে ফিরে যান
          </Button>
        </Stack>
      ) : (
        <>
          <Stack gap={0} mb="xl" style={{ textAlign: 'center' }}>
            <Title order={2} style={{ fontSize: '24px', fontWeight: 800, color: 'white' }}>
              পাসওয়ার্ড ভুলে গেছেন? 🔑
            </Title>
            <Text size="sm" c="gray.4" mt={4}>
              আপনার নিবন্ধিত ইমেইল ঠিকানা দিন। আমরা আপনাকে পাসওয়ার্ড রিসেটের লিংক পাঠাবো।
            </Text>
          </Stack>

          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
              <TextInput
                label={<Text component="span" size="sm" fw={600} c="gray.3">ইমেইল ঠিকানা</Text>}
                placeholder="you@example.com"
                leftSection={<IconMail size={16} style={{ color: '#94a3b8' }} />}
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
                রিসেট লিংক পাঠান
              </Button>
            </Stack>
          </form>

          <Text ta="center" mt="xl" size="sm" c="gray.4">
            পাসওয়ার্ড মনে পড়েছে?{' '}
            <Anchor component={Link} href="/login" size="sm" fw={700} style={{ color: '#60a5fa' }}>
              সাইন ইন করুন
            </Anchor>
          </Text>
        </>
      )}
    </Paper>
  );
}
