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
      badgeText: 'সম্পূর্ণ সিলেবাস',
      bgGrad: 'linear-gradient(135deg, #172554 0%, #1e3a8a 60%, #0f172a 100%)',
      glowColor: 'rgba(59, 130, 246, 0.45)',
      borderColor: 'rgba(96, 165, 250, 0.35)',
      shadowColor: 'rgba(30, 58, 138, 0.35)',
      iconBg: 'rgba(59, 130, 246, 0.25)',
      iconColor: '#93c5fd',
    },
    {
      icon: IconQrcode,
      title: 'লাইভ মডেল টেস্ট',
      description: 'নেগেティブ মার্কিং সহ হুবহু বিসিএস স্টাইলে তৈরি মডেল টেস্ট দিয়ে নিজেকে যাচাই করুন।',
      badgeText: 'রিয়েল-টাইম এক্সাম',
      bgGrad: 'linear-gradient(135deg, #2e1065 0%, #4c1d95 60%, #1e1b4b 100%)',
      glowColor: 'rgba(168, 85, 247, 0.45)',
      borderColor: 'rgba(192, 132, 252, 0.35)',
      shadowColor: 'rgba(76, 29, 149, 0.35)',
      iconBg: 'rgba(168, 85, 247, 0.25)',
      iconColor: '#d8b4fe',
    },
    {
      icon: IconCertificate,
      title: 'পারফরম্যান্স অ্যানালাইসিস',
      description: 'অন্যান্য পরীক্ষার্থীদের তুলনায় আপনার অবস্থান এবং দুর্বল দিকগুলো শনাক্ত করার স্মার্ট মেট্রিক্স।',
      badgeText: 'স্মার্ট অ্যানালিটিক্স',
      bgGrad: 'linear-gradient(135deg, #042f2e 0%, #065f46 60%, #022c22 100%)',
      glowColor: 'rgba(20, 184, 166, 0.45)',
      borderColor: 'rgba(45, 212, 191, 0.35)',
      shadowColor: 'rgba(6, 95, 70, 0.35)',
      iconBg: 'rgba(20, 184, 166, 0.25)',
      iconColor: '#5eead4',
    },
    {
      icon: IconShieldLock,
      title: 'নিরাপদ পেমেন্ট',
      description: 'বিকাশ, নগদ এবং কার্ডের মাধ্যমে সহজেই কোর্সে এনরোল করার সুবিধা।',
      badgeText: 'ইনস্ট্যান্ট অ্যাক্টিভেশন',
      bgGrad: 'linear-gradient(135deg, #4c0519 0%, #831843 60%, #370617 100%)',
      glowColor: 'rgba(244, 63, 94, 0.45)',
      borderColor: 'rgba(251, 113, 133, 0.35)',
      shadowColor: 'rgba(131, 24, 67, 0.35)',
      iconBg: 'rgba(244, 63, 94, 0.25)',
      iconColor: '#fda4af',
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
                    background: feature.bgGrad,
                    border: `1px solid ${feature.borderColor}`,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: `0 10px 25px -5px ${feature.shadowColor}`,
                    transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                  className="feature-card"
                >
                  {/* Glowing ambient light orb */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '-30px',
                      right: '-30px',
                      width: '130px',
                      height: '130px',
                      borderRadius: '50%',
                      background: feature.glowColor,
                      filter: 'blur(35px)',
                      pointerEvents: 'none',
                      zIndex: 0,
                    }}
                  />

                  <Box style={{ position: 'relative', zIndex: 1 }}>
                    <Group justify="space-between" align="center" mb="md">
                      <ThemeIcon
                        size={48}
                        radius="md"
                        style={{
                          backgroundColor: feature.iconBg,
                          color: feature.iconColor,
                          border: `1px solid ${feature.borderColor}`,
                        }}
                      >
                        <feature.icon size={26} stroke={2} />
                      </ThemeIcon>
                      <Badge
                        size="sm"
                        variant="outline"
                        style={{
                          color: feature.iconColor,
                          borderColor: feature.borderColor,
                          backgroundColor: 'rgba(255, 255, 255, 0.06)',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        {feature.badgeText}
                      </Badge>
                    </Group>

                    <Text fw={800} style={{ fontSize: '19px', lineHeight: 1.3, color: '#ffffff' }} mb="xs">
                      {feature.title}
                    </Text>
                    <Text size="sm" style={{ lineHeight: 1.65, fontSize: '14.5px', color: 'rgba(255, 255, 255, 0.82)' }}>
                      {feature.description}
                    </Text>
                  </Box>
                </Card>
              ))}
            </SimpleGrid>
          </Grid.Col>
        </Grid>
      </Container>
      
      {/* Custom feature card styling */}
      <style jsx global>{`
        .feature-card:hover {
          transform: translateY(-6px) scale(1.01);
          box-shadow: 0 20px 35px -5px rgba(15, 23, 42, 0.35);
          border-color: rgba(255, 255, 255, 0.45) !important;
        }
      `}</style>
    </Box>
  );
}
