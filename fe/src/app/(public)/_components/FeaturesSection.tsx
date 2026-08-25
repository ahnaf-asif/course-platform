'use client';

import { Container, Grid, Stack, Badge, Title, Text, SimpleGrid, Card, ThemeIcon, Box, Group } from '@mantine/core';
import { IconBooks, IconQrcode, IconCertificate, IconShieldLock, IconChevronRight } from '@tabler/icons-react';
import Link from 'next/link';
import { useAuthContext } from '@/context/AuthContext';

export default function FeaturesSection() {
  const { isAuthenticated, isHydrated } = useAuthContext();
  const isUserLoggedIn = isHydrated && isAuthenticated;

  const features = [
    {
      icon: IconBooks,
      title: 'গোছানো সিলেবাস',
      description: 'প্রিলিমিনারির বিশাল সিলেবাসকে সহজ ও বোধগম্য করে সাজানো হয়েছে।',
      color: 'blue',
      borderColor: 'rgba(59, 130, 246, 0.25)',
      iconBg: 'rgba(59, 130, 246, 0.15)',
    },
    {
      icon: IconQrcode,
      title: 'লাইভ মডেল টেস্ট',
      description: 'নেগেティブ মার্কিং সহ হুবহু বিসিএস স্টাইলে তৈরি মডেল টেস্ট দিয়ে নিজেকে যাচাই করুন।',
      color: 'violet',
      borderColor: 'rgba(139, 92, 246, 0.25)',
      iconBg: 'rgba(139, 92, 246, 0.15)',
    },
    {
      icon: IconCertificate,
      title: 'পারফরম্যান্স অ্যানালাইসিস',
      description: 'অন্যান্য পরীক্ষার্থীদের তুলনায় আপনার অবস্থান এবং দুর্বল দিকগুলো শনাক্ত করার স্মার্ট মেট্রিক্স।',
      color: 'teal',
      borderColor: 'rgba(20, 184, 166, 0.25)',
      iconBg: 'rgba(20, 184, 166, 0.15)',
    },
    {
      icon: IconShieldLock,
      title: 'নিরাপদ পেমেন্ট',
      description: 'বিকাশ, নগদ এবং কার্ডের মাধ্যমে সহজেই কোর্সে এনরোল করার সুবিধা।',
      color: 'pink',
      borderColor: 'rgba(236, 72, 153, 0.25)',
      iconBg: 'rgba(236, 72, 153, 0.15)',
    },
  ];

  return (
    <Box py={{ base: '50px', sm: '70px', md: '100px' }} style={{ backgroundColor: '#fafbfc', borderTop: '1px solid #f1f3f5', borderBottom: '1px solid #f1f3f5' }}>
      <Container size="xl">
        <Grid gap={{ base: 'lg', md: 'xl' }} align="stretch">
          {/* Left Column (Asymmetric Heading) */}
          <Grid.Col span={{ base: 12, md: 5 }} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Stack gap="md" style={{ position: 'sticky', top: '100px' }}>
              <Badge variant="light" color="violet" size="md">
                আমাদের বৈশিষ্ট্য
              </Badge>
              <Title order={2} style={{ fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 900, lineHeight: 1.25 }}>
                আমরা নিয়ে এসেছি{' '}
                <span style={{ background: 'linear-gradient(45deg, var(--mantine-color-violet-6), var(--mantine-color-pink-6))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  স্মার্ট প্রিলিমিনারি
                </span>{' '}
                প্রস্তুতির প্ল্যাটফর্ম
              </Title>
              <Text c="dimmed" size="md" style={{ lineHeight: 1.7 }}>
                বিসিএস প্রস্তুতি কোনো এলোমেলো বিষয় নয়। আমাদের প্ল্যাটফর্মটি এমনভাবে ডিজাইন করা হয়েছে যাতে প্রতিটি পরীক্ষার্থী সঠিক গাইডলাইন এবং নিয়মিত মডেল টেস্টের মাধ্যমে নিজেকে যাচাই করতে পারে।
              </Text>
              <Link href={isUserLoggedIn ? '/courses' : '/register'} style={{ textDecoration: 'none' }}>
                <Group gap="xs" style={{ color: 'var(--mantine-color-blue-6)', fontWeight: 700, cursor: 'pointer' }}>
                  <span>{isUserLoggedIn ? 'সকল কোর্স দেখুন' : 'আজই বিনামূল্যে অ্যাকাউন্ট খুলুন'}</span>
                  <IconChevronRight size={16} />
                </Group>
              </Link>
            </Stack>
          </Grid.Col>

          {/* Right Column (2x2 Feature Cards with custom gradients) */}
          <Grid.Col span={{ base: 12, md: 7 }}>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              {features.map((feature, index) => (
                <Card
                  key={index}
                  padding="xl"
                  radius="lg"
                  style={{
                    background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
                    border: `1px solid ${feature.borderColor}`,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.12)',
                  }}
                  className="feature-card"
                >
                  <ThemeIcon
                    size={50}
                    radius="md"
                    color={feature.color}
                    variant="light"
                    mb="md"
                    style={{ backgroundColor: feature.iconBg }}
                  >
                    <feature.icon size={26} />
                  </ThemeIcon>
                  <Text fw={800} style={{ fontSize: '19px', lineHeight: 1.3, color: '#ffffff' }} mb="sm">
                    {feature.title}
                  </Text>
                  <Text size="sm" style={{ lineHeight: 1.65, fontSize: '14.5px', color: '#94a3b8' }}>
                    {feature.description}
                  </Text>
                </Card>
              ))}
            </SimpleGrid>
          </Grid.Col>
        </Grid>
      </Container>
      
      {/* Custom feature card styling */}
      <style jsx global>{`
        .feature-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 30px -5px rgba(15, 23, 42, 0.3);
          border-color: rgba(255, 255, 255, 0.25) !important;
        }
      `}</style>
    </Box>
  );
}
