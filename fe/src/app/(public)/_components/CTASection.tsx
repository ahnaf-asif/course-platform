'use client';

import { Container, Stack, Title, Text, Button, Box } from '@mantine/core';
import { IconArrowRight } from '@tabler/icons-react';
import Link from 'next/link';
import { useAuthContext } from '@/context/AuthContext';

export default function CTASection() {
  const { isAuthenticated, isHydrated } = useAuthContext();
  const isUserLoggedIn = isHydrated && isAuthenticated;

  return (
    <Box
      py={{ base: '50px', sm: '70px', md: '100px' }}
      style={{
        background: 'linear-gradient(135deg, #1c7ed6 0%, #7300e6 100%)',
        color: 'white',
        textAlign: 'center',
        position: 'relative',
      }}
    >
      <div className="glow-effect" style={{ top: '-20%', left: '30%', width: '400px', height: '400px', opacity: 0.15 }} />
      
      <Container size="md" style={{ position: 'relative', zIndex: 10 }}>
        <Stack gap="md" align="center">
          <Title order={2} style={{ fontSize: 'clamp(26px, 5vw, 40px)', fontWeight: 900, letterSpacing: '-0.5px' }}>
            ক্যাডার হওয়ার স্বপ্ন পূরণ করুন আজই
          </Title>
          <Text size="lg" style={{ opacity: 0.85, maxWidth: '580px', lineHeight: 1.7 }}>
            আমাদের প্ল্যাটফর্মে যুক্ত হয়ে প্রিলিমিনারি প্রস্তুতির সেরা ম্যাটেরিয়ালগুলোর অ্যাক্সেস নিন। আপনার স্বপ্নের ক্যারিয়ার গড়ার প্রথম ধাপ শুরু হোক এখান থেকেই।
          </Text>
          <Button
            size="xl"
            variant="white"
            color="blue"
            mt="lg"
            component={Link}
            href={isUserLoggedIn ? '/courses' : '/register'}
            rightSection={<IconArrowRight size={20} />}
            style={{
              boxShadow: '0 15px 30px rgba(0, 0, 0, 0.15)',
              fontWeight: 700,
            }}
          >
            {isUserLoggedIn ? 'কোর্সসমূহ দেখুন' : 'রেজিস্ট্রেশন করুন'}
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}
