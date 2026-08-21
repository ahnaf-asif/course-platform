'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Container, Card, Title, Text, Button, Stack, Group, ThemeIcon, Box, Badge, Divider, Loader } from '@mantine/core';
import { IconAlertTriangle, IconRefresh, IconHeadset, IconReceipt } from '@tabler/icons-react';
import Link from 'next/link';

function PaymentFailContent() {
  const searchParams = useSearchParams();
  const tranID = searchParams.get('tran_id') || 'N/A';
  const errorMsg = searchParams.get('error') || 'ট্রানজেকশন সফলভাবে সম্পন্ন করা সম্ভব হয়নি';

  return (
    <Box
      py={{ base: '60px', sm: '100px' }}
      style={{
        background: 'radial-gradient(circle at 80% 20%, #1e1b4b 0%, #0f172a 60%, #020617 100%)',
        minHeight: 'calc(100vh - 80px)',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      <div className="glow-effect" style={{ top: '20%', right: '20%', opacity: 0.8 }} />
      <Container size="sm" style={{ position: 'relative', zIndex: 10, width: '100%' }}>
        <Card
          shadow="xl"
          p={{ base: 'xl', sm: '2.5rem' }}
          radius="24px"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: 'white',
          }}
        >
          <Stack align="center" gap="xl">
            <Box style={{ position: 'relative' }}>
              <ThemeIcon color="red" size={90} radius={45} variant="light" style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <IconAlertTriangle size={54} color="#f87171" />
              </ThemeIcon>
            </Box>

            <Stack align="center" gap="xs" style={{ textAlign: 'center' }}>
              <Badge variant="light" color="red" size="lg" radius="sm">
                পেমেন্ট স্ট্যাটাস: ব্যর্থ
              </Badge>
              <Title order={1} style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 900 }}>
                পেমেন্ট সম্পন্ন করা যায়নি
              </Title>
              <Text size="sm" c="gray.4" maw={460} style={{ lineHeight: 1.6 }}>
                দুঃখিত! আপনার পেমেন্ট প্রক্রিয়াকরণে একটি সমস্যা দেখা দিয়েছে। আপনার অ্যাকাউন্ট থেকে টাকা কাটা হয়ে থাকলে আগামী ২৪ ঘণ্টার মধ্যে তা স্বয়ংক্রিয়ভাবে রিফান্ড হবে।
              </Text>
            </Stack>

            <Card
              p="md"
              radius="md"
              style={{
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <IconReceipt size={16} color="#94a3b8" />
                  <Text size="xs" fw={700} c="gray.4">ত্রুটি বিবরণী</Text>
                </Group>
                <Badge size="xs" color="red" variant="light">FAILED</Badge>
              </Group>
              <Divider color="rgba(255, 255, 255, 0.08)" mb="xs" />
              <Group justify="space-between" py={2}>
                <Text size="xs" c="gray.4">ট্রানজেকশন আইডি:</Text>
                <Text size="xs" fw={700} c="red.3" style={{ fontFamily: 'monospace' }}>{tranID}</Text>
              </Group>
              <Group justify="space-between" py={2}>
                <Text size="xs" c="gray.4">কারণ:</Text>
                <Text size="xs" fw={600} c="gray.3" maw={260} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {errorMsg}
                </Text>
              </Group>
            </Card>

            <Group justify="center" gap="md" style={{ width: '100%' }}>
              <Button
                component={Link}
                href="/courses"
                variant="gradient"
                gradient={{ from: 'blue', to: 'violet' }}
                size="md"
                radius="md"
                leftSection={<IconRefresh size={18} />}
                style={{ flex: 1, fontWeight: 700, boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)' }}
              >
                পুনরায় চেষ্টা করুন
              </Button>
              <Button
                component={Link}
                href="/contact"
                variant="outline"
                color="gray.4"
                size="md"
                radius="md"
                leftSection={<IconHeadset size={18} />}
                style={{ flex: 1, borderColor: 'rgba(255, 255, 255, 0.2)', color: 'white', fontWeight: 600 }}
              >
                সাপোর্টে কথা বলুন
              </Button>
            </Group>
          </Stack>
        </Card>
      </Container>
    </Box>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={<Box py={100} ta="center"><Loader size="xl" /></Box>}>
      <PaymentFailContent />
    </Suspense>
  );
}
