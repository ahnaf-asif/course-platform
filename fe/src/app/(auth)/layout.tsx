'use client';

import { useAuthContext } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Box, Container, Group, Title, ThemeIcon } from '@mantine/core';
import { IconBooks, IconArrowLeft } from '@tabler/icons-react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      const searchParams = new URLSearchParams(window.location.search);
      const callbackUrl = searchParams.get('callbackUrl');
      router.push(callbackUrl || '/dashboard');
    }
  }, [isAuthenticated, router]);

  if (isAuthenticated) {
    return null;
  }

  return (
    <Box
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(circle at 80% 20%, #1e1b4b 0%, #0f172a 60%, #020617 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        padding: '24px 16px',
        overflow: 'hidden',
      }}
    >
      {/* Background glow effects */}
      <div
        className="glow-effect"
        style={{
          position: 'absolute',
          top: '15%',
          left: '20%',
          width: '380px',
          height: '380px',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />
      <div
        className="glow-effect"
        style={{
          position: 'absolute',
          bottom: '15%',
          right: '15%',
          width: '420px',
          height: '420px',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, transparent 70%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
        }}
      />

      <Container size="xs" style={{ width: '100%', maxWidth: '440px', zIndex: 10 }}>
        {/* Brand Header */}
        <Box mb="xl" style={{ textAlign: 'center' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-block' }}>
            <Group gap="xs" justify="center" align="center">
              <ThemeIcon
                size={42}
                radius="md"
                variant="gradient"
                gradient={{ from: 'blue', to: 'violet' }}
                style={{ boxShadow: '0 4px 16px rgba(59, 130, 246, 0.4)' }}
              >
                <IconBooks size={24} color="white" />
              </ThemeIcon>
              <Title
                order={2}
                style={{
                  background: 'linear-gradient(135deg, #60a5fa 0%, #a855f7 50%, #ec4899 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontWeight: 900,
                  fontSize: '26px',
                  letterSpacing: '-0.5px',
                }}
              >
                EduVerse
              </Title>
            </Group>
          </Link>
        </Box>

        {children}

        {/* Back to Home Link */}
        <Box mt="xl" style={{ textAlign: 'center' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <Group gap={6} justify="center" style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px', fontWeight: 600 }}>
              <IconArrowLeft size={16} />
              <span>হোমপেজে ফিরে যান</span>
            </Group>
          </Link>
        </Box>
      </Container>
    </Box>
  );
}
