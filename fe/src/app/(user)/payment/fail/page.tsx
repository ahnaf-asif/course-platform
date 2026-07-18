'use client';

import { useSearchParams } from 'next/navigation';
import { Container, Card, Title, Text, Button, Stack, Group, ThemeIcon } from '@mantine/core';
import { IconAlertTriangle, IconRefresh, IconArrowLeft } from '@tabler/icons-react';
import Link from 'next/link';

export default function PaymentFailPage() {
  const searchParams = useSearchParams();
  const tranID = searchParams.get('tran_id') || 'N/A';
  const errorMsg = searchParams.get('error') || 'Transaction could not be completed';

  return (
    <Container size="sm" py={100}>
      <Card shadow="lg" p="xl" radius="md" withBorder>
        <Stack align="center" gap="xl">
          <ThemeIcon color="red" size={80} radius={40} variant="light">
            <IconAlertTriangle size={50} />
          </ThemeIcon>

          <Stack align="center" gap="xs">
            <Title order={2} ta="center" c="red">Payment Failed</Title>
            <Text c="dimmed" size="sm" ta="center">
              We encountered an issue while validating your payment transaction.
            </Text>
          </Stack>

          <Card withBorder p="md" radius="sm" style={{ width: '100%' }} bg="var(--mantine-color-gray-0)">
            <Group justify="space-between">
              <Text size="xs" fw={700} c="dimmed">TRANSACTION ID</Text>
              <Text size="xs" fw={700} ff="monospace">{tranID}</Text>
            </Group>
            <Group justify="space-between" mt="xs">
              <Text size="xs" fw={700} c="dimmed">ERROR MESSAGE</Text>
              <Text size="xs" fw={700} c="red">{errorMsg}</Text>
            </Group>
          </Card>

          <Group justify="center" gap="md" style={{ width: '100%' }}>
            <Button
              component={Link}
              href="/"
              variant="outline"
              leftSection={<IconArrowLeft size={16} />}
              style={{ flex: 1 }}
            >
              Back to Home
            </Button>
            <Button
              component={Link}
              href="/dashboard"
              leftSection={<IconRefresh size={16} />}
              style={{ flex: 1 }}
            >
              My Dashboard
            </Button>
          </Group>
        </Stack>
      </Card>
    </Container>
  );
}
