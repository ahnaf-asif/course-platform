'use client';

import { Container, Box, SimpleGrid, Title, Text } from '@mantine/core';

export default function StatsSection() {
  const stats = [
    { number: '15,000+', label: 'সক্রিয় পরীক্ষার্থী', grad: 'linear-gradient(45deg, #1c7ed6, #7300e6)' },
    { number: '50+', label: 'ক্যাডার মেন্টর', grad: 'linear-gradient(45deg, #7300e6, #e64980)' },
    { number: '120+', label: 'প্রিলি মডেল টেস্ট', grad: 'linear-gradient(45deg, #e64980, #12a678)' },
    { number: '99.4%', label: 'সিলেবাস কভারেজ', grad: 'linear-gradient(45deg, #12a678, #1c7ed6)' },
  ];

  return (
    <Container size="xl" mt={{ base: '-35px', md: '-45px' }} style={{ position: 'relative', zIndex: 30 }}>
      <Box
        px={{ base: 'md', sm: 'xl' }}
        py={{ base: 'lg', sm: 'xl' }}
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(230, 235, 245, 0.8)',
          borderRadius: '24px',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.06)',
        }}
      >
        <SimpleGrid cols={{ base: 2, md: 4 }} spacing={{ base: 'md', sm: 'xl' }} style={{ textAlign: 'center' }}>
          {stats.map((stat, i) => (
            <div key={i}>
              <Title
                order={2}
                fz={{ base: '26px', sm: '32px', md: '40px' }}
                style={{
                  fontWeight: 900,
                  background: stat.grad,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  lineHeight: 1.1,
                }}
              >
                {stat.number}
              </Title>
              <Text size="xs" c="dimmed" fw={700} style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }} mt="xs">
                {stat.label}
              </Text>
            </div>
          ))}
        </SimpleGrid>
      </Box>
    </Container>
  );
}
