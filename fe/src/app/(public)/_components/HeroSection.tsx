'use client';

import { Container, Title, Text, Button, Group, Stack, SimpleGrid, Box, ThemeIcon } from '@mantine/core';
import { IconArrowRight, IconBooks } from '@tabler/icons-react';
import Link from 'next/link';

export default function HeroSection() {
  return (
    <Box
      py={{ base: '60px', sm: '90px', md: '120px' }}
      style={{
        background: 'radial-gradient(circle at 80% 20%, #1e1b4b 0%, #0f172a 60%, #020617 100%)',
        position: 'relative',
        color: 'white',
      }}
    >
      {/* Glow effect vectors */}
      <div className="glow-effect" style={{ top: '10%', right: '15%', opacity: 0.8 }} />
      <div className="glow-effect" style={{ bottom: '5%', left: '5%', background: 'radial-gradient(circle, rgba(115, 0, 230, 0.1) 0%, transparent 80%)', opacity: 0.6 }} />

      <Container size="xl" style={{ position: 'relative', zIndex: 10 }}>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing={{ base: '30px', md: '50px' }}>
          <Stack gap="xl">
            <Title
              order={1}
              style={{
                fontSize: 'clamp(32px, 6vw, 54px)',
                fontWeight: 900,
                lineHeight: 1.15,
                letterSpacing: '-1px',
              }}
            >
              সেরাদের নির্দেশনায় হোক আপনার,{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #a855f7 50%, #ec4899 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                বিসিএস প্রিলি প্রস্তুতি
              </span>
            </Title>

            <Text size="lg" style={{ color: 'var(--mantine-color-gray-4)', lineHeight: 1.7, maxWidth: '520px' }}>
              দেশের সেরা ক্যাডার এবং অভিজ্ঞ মেন্টরদের তৈরি করা কোর্স দিয়ে শুরু করুন আপনার বিসিএস প্রিলির প্রস্তুতি। হাজারো পরীক্ষার্থীর সাথে নিজেকে এগিয়ে রাখুন আজই।
            </Text>

            <Group gap="md" mt="md" className="hero-buttons">
              <Button
                size="xl"
                variant="gradient"
                gradient={{ from: 'blue', to: 'violet' }}
                rightSection={<IconArrowRight size={20} />}
                component={Link}
                href="/courses"
                className="hero-btn"
                style={{ boxShadow: '0 10px 25px rgba(59, 130, 246, 0.35)' }}
              >
                প্রস্তুতি শুরু করুন
              </Button>
              <Button
                size="xl"
                variant="outline"
                color="gray.4"
                component={Link}
                href="/about"
                className="hero-btn"
                styles={{
                  root: {
                    borderColor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    '&:hover': {
                      backgroundColor: 'rgba(255,255,255,0.1) !important',
                    }
                  }
                }}
              >
                আমাদের সম্পর্কে
              </Button>
            </Group>
          </Stack>

          {/* CSS for full width mobile buttons */}
          <style jsx global>{`
            @media (max-width: 576px) {
              .hero-buttons {
                flex-direction: column !important;
                width: 100% !important;
              }
              .hero-btn {
                width: 100% !important;
              }
            }
          `}</style>

          {/* High fidelity interactive visuals box */}
          <Box style={{ display: 'flex', justifyContent: 'center' }}>
            <Box
              className="visual-card"
              style={{
                width: '100%',
                maxWidth: '480px',
                borderRadius: '24px',
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(15, 23, 42, 0.45)',
                backdropFilter: 'blur(16px)',
                padding: '40px 24px',
                boxShadow: '0 30px 60px rgba(0, 0, 0, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                flexDirection: 'column',
                textAlign: 'center',
                zIndex: 2,
              }}
            >
              <ThemeIcon size={80} radius="xl" color="blue" variant="light" mb="md" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}>
                <IconBooks size={40} />
              </ThemeIcon>
              <Title order={2} style={{ fontSize: '24px', fontWeight: 800 }}>আপনার স্বপ্নের ক্যারিয়ার</Title>
              <Text mt="xs" size="sm" style={{ opacity: 0.8, maxWidth: '320px', lineHeight: 1.5 }}>
                আনলক করুন বিষয়ভিত্তিক চ্যাপ্টার, প্রিলি মডেল টেস্ট এবং প্রিমিয়াম লেকচার।
              </Text>
            </Box>
          </Box>
        </SimpleGrid>
      </Container>
    </Box>
  );
}
