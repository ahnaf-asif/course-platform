'use client';

import { useSearchParams } from 'next/navigation';
import { Container, Card, Title, Text, Button, Stack, Group, ThemeIcon } from '@mantine/core';
import { IconCircleCheck, IconArrowRight, IconBook } from '@tabler/icons-react';
import Link from 'next/link';

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const tranID = searchParams.get('tran_id') || 'N/A';

  return (
    <Container size="sm" py={100}>
      <Card shadow="lg" p="xl" radius="md" withBorder>
        <Stack align="center" gap="xl">
          <ThemeIcon color="green" size={80} radius={40} variant="light">
            <IconCircleCheck size={50} />
          </ThemeIcon>

          <Stack align="center" gap="xs">
            <Title order={2} ta="center">Payment Successful!</Title>
            <Text c="dimmed" size="sm" ta="center">
              Thank you for your purchase. Your payment was validated successfully.
            </Text>
          </Stack>

          <Card withBorder p="md" radius="sm" style={{ width: '100%' }} bg="var(--mantine-color-gray-0)">
            <Group justify="space-between">
              <Text size="xs" fw={700} c="dimmed">TRANSACTION ID</Text>
              <Text size="xs" fw={700} ff="monospace">{tranID}</Text>
            </Group>
            <Group justify="space-between" mt="xs">
              <Text size="xs" fw={700} c="dimmed">STATUS</Text>
              <Text size="xs" fw={700} c="green">PAID / COMPLETED</Text>
            </Group>
          </Card>

          <Group justify="center" gap="md" style={{ width: '100%' }}>
            <Button
              component={Link}
              href="/dashboard"
              variant="outline"
              leftSection={<IconBook size={16} />}
              style={{ flex: 1 }}
            >
              My Dashboard
            </Button>
            <Button
              component={Link}
              href="/"
              leftSection={<IconArrowRight size={16} />}
              style={{ flex: 1 }}
            >
              Back to Home
            </Button>
          </Group>
        </Stack>
      </Card>
    </Container>
  );
}
