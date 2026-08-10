'use client';

import { Container, Stack, Badge, Title, Text, SimpleGrid, Card, Group, Image, Box } from '@mantine/core';
import { IconStar } from '@tabler/icons-react';

export default function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Sharif Ahmed',
      role: 'Full Stack Engineer',
      text: 'The interactive quizzes and secure payment setup made buying and learning Go on this platform an absolute breeze!',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80',
      offset: '0px',
    },
    {
      name: 'Nusrat Jahan',
      role: 'UI/UX Designer',
      text: 'I love how clean the course viewer is. Zero distractions, responsive interface, and high-quality structured videos.',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80',
      offset: '24px', // Staggered layout offset
    },
    {
      name: 'Tanvir Hossain',
      role: 'DevOps Engineer',
      text: 'Highly professional material. The certificate is a great addition to my LinkedIn profile. Will purchase again.',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80',
      offset: '12px', // Staggered layout offset
    },
  ];

  return (
    <Box py={{ base: '40px', sm: '70px', md: '100px' }} style={{ backgroundColor: '#ffffff' }}>
      <Container size="xl">
        <Stack align="center" gap="xs" mb={{ base: '28px', md: '60px' }}>
          <Badge variant="light" color="teal" size="md">
            সফল শিক্ষার্থীরা
          </Badge>
          <Title order={2} style={{ fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 900 }}>
            পরীক্ষার্থীদের অভিজ্ঞতা
          </Title>
          <Text c="dimmed" size="md" style={{ maxWidth: '580px', textAlign: 'center', lineHeight: 1.6 }}>
            হাজার হাজার বিসিএস পরীক্ষার্থী আমাদের প্ল্যাটফর্ম ব্যবহার করে প্রতিনিয়ত নিজেদের প্রস্তুত করছেন।
          </Text>
        </Stack>

        {/* Testimonial Staggered Grid */}
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
          {testimonials.map((t, i) => (
            <Card
              key={i}
              shadow="xs"
              padding="xl"
              radius="lg"
              withBorder
              className="premium-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                backgroundColor: 'white',
                border: '1px solid #f1f3f5',
              }}
            >
              <div>
                <Group gap={2} mb="md">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <IconStar key={s} size={15} fill="var(--mantine-color-yellow-5)" color="var(--mantine-color-yellow-5)" />
                  ))}
                </Group>
                <Text size="sm" style={{ fontStyle: 'italic', lineHeight: 1.7 }} mb="xl" c="gray.8">
                  &ldquo;{t.text}&rdquo;
                </Text>
              </div>
              <Group gap="sm">
                <Image src={t.avatar} width={40} height={40} radius="xl" alt={t.name} />
                <div>
                  <Text size="sm" fw={800} c="gray.9">{t.name}</Text>
                  <Text size="xs" c="dimmed" fw={600}>{t.role}</Text>
                </div>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}
