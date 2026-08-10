'use client';

import { Container, Stack, Badge, Title, Text, SimpleGrid, Card, Skeleton, Image, Group, Button, Box } from '@mantine/core';
import { IconArrowRight, IconBook } from '@tabler/icons-react';
import Link from 'next/link';
import { useListPublishedCourses } from '@/api/generated/course/course';
import { CourseResponse } from '@/api/model/components-schemas-course/courseResponse';

export default function CoursesSection() {
  const { data: nodes, isLoading } = useListPublishedCourses();

  // Filter nodes to only show actual course products
  const courses: CourseResponse[] =
    nodes?.filter((node) => node.node_type === 'COURSE') || [];

  const mockCourses = [
    {
      id: 'mock-1',
      title: 'বাংলাদেশ বিষয়াবলি: প্রিলি মাস্টারক্লাস',
      slug: 'bangladesh-affairs-masterclass',
      description: 'বিসিএস প্রিলিমিনারি পরীক্ষার বাংলাদেশ বিষয়াবলির সম্পূর্ণ সিলেবাস কভার করে তৈরি করা আমাদের স্পেশাল কোর্স।',
      price: '1200',
      currency: 'BDT',
      thumbnail_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'mock-2',
      title: 'ইংরেজি ভাষা ও সাহিত্য: প্রিলি ক্র্যাশ কোর্স',
      slug: 'english-language-literature',
      description: 'ইংরেজি গ্রামার এবং সাহিত্যের কঠিন বিষয়গুলো সহজে আয়ত্ত করার এক্সক্লুসিভ গাইডলাইন।',
      price: '0.00',
      currency: 'BDT',
      thumbnail_url: 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&w=600&q=80',
    },
    {
      id: 'mock-3',
      title: 'গাণিতিক যুক্তি ও মানসিক দক্ষতা',
      slug: 'math-mental-ability',
      description: 'শর্টকাট টেকনিক ও বিগত বছরের প্রশ্ন সমাধানের মাধ্যমে গণিতে পূর্ণাঙ্গ প্রস্তুতি।',
      price: '800',
      currency: 'BDT',
      thumbnail_url: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80',
    },
  ];

  const displayCourses = courses.length > 0 ? courses.slice(0, 3) : mockCourses;

  return (
    <Box py={{ base: '50px', sm: '70px', md: '100px' }} style={{ backgroundColor: '#fdfdfe' }}>
      <Container size="xl">
        <Stack align="center" gap="xs" mb={{ base: '32px', md: '60px' }}>
          <Badge variant="light" color="blue" size="md">
            কোর্সসমূহ
          </Badge>
          <Title
            order={2}
            style={{
              fontSize: 'clamp(26px, 5vw, 38px)',
              fontWeight: 900,
              letterSpacing: '-0.5px',
            }}
          >
            বেছে নিন আপনার{' '}
            <span style={{ background: 'linear-gradient(45deg, #1c7ed6, #7300e6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              কাঙ্ক্ষিত প্রিলিমিনারি
            </span>{' '}
            কোর্সসমূহ
          </Title>
          <Text c="dimmed" size="md" style={{ maxWidth: '580px', textAlign: 'center', lineHeight: 1.6 }}>
            বিসিএস প্রিলি সিলেবাসের প্রতিটি বিষয়ের উপর পুঙ্খানুপুঙ্খ প্রস্তুতি নিতে আমাদের প্রিমিয়াম কোর্সগুলো এক্সপ্লোর করুন।
          </Text>
        </Stack>

        {isLoading ? (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {[1, 2, 3].map((n) => (
              <Card key={n} shadow="sm" padding="lg" radius="lg" withBorder>
                <Skeleton height={180} radius="md" mb="md" />
                <Skeleton height={20} width="60%" mb="xs" />
                <Skeleton height={10} radius="xl" mb="xs" />
                <Skeleton height={10} radius="xl" mb="xs" />
                <Skeleton height={10} radius="xl" width="70%" mb="md" />
                <Skeleton height={36} radius="md" />
              </Card>
            ))}
          </SimpleGrid>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="xl">
            {displayCourses.map((c) => {
              const isMock = 'id' in c && typeof c.id === 'string' && c.id.startsWith('mock-');
              const isFree = !c.price || parseFloat(c.price) === 0;
              const priceText = isFree ? 'ফ্রি' : `${c.price} ${c.currency || 'BDT'}`;

              return (
                <Card
                  key={c.id}
                  shadow="xs"
                  padding="lg"
                  radius="20px"
                  withBorder
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    height: '100%',
                    borderColor: '#e2e8f0',
                    backgroundColor: '#ffffff',
                  }}
                  className="modern-course-card"
                >
                  <div>
                    {/* Image Container with Floating Price Badge */}
                    <Card.Section style={{ position: 'relative', overflow: 'hidden' }}>
                      <Image
                        src={c.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80'}
                        height={190}
                        alt={c.title}
                        fallbackSrc="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80"
                        className="card-img"
                      />
                      <Box
                        style={{
                          position: 'absolute',
                          top: 12,
                          right: 12,
                          backgroundColor: isFree ? 'rgba(13, 148, 136, 0.85)' : 'rgba(15, 23, 42, 0.85)',
                          backdropFilter: 'blur(8px)',
                          WebkitBackdropFilter: 'blur(8px)',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          borderRadius: '100px',
                          padding: '4px 14px',
                          color: 'white',
                          fontWeight: 800,
                          fontSize: '12px',
                        }}
                      >
                        {priceText}
                      </Box>
                    </Card.Section>

                    <Stack gap="xs" mt="md">
                      <Group justify="space-between" align="center">
                        <Badge variant="light" color="blue" size="xs" radius="sm">
                          বিসিএস প্রিলিমিনারি
                        </Badge>
                        <Group gap={4} align="center">
                          <IconBook size={13} style={{ color: '#64748b' }} />
                          <Text size="xs" c="dimmed" fw={600}>
                            বিষয়ভিত্তিক
                          </Text>
                        </Group>
                      </Group>

                      <Title order={3} style={{ fontSize: '18px', fontWeight: 800, lineHeight: 1.35 }} lineClamp={2} c="gray.9">
                        {c.title}
                      </Title>

                      <Text size="sm" c="dimmed" lineClamp={2} style={{ lineHeight: 1.6, minHeight: '44px' }}>
                        {c.description || 'এই কোর্সের বিস্তারিত বিবরণ এখনো যোগ করা হয়নি। এখনই শেখা শুরু করুন।'}
                      </Text>
                    </Stack>
                  </div>

                  <Box mt="md" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                    <Button
                      variant="gradient"
                      gradient={{ from: 'blue', to: 'violet' }}
                      fullWidth
                      radius="md"
                      size="md"
                      rightSection={<IconArrowRight size={16} />}
                      component={Link}
                      href={isMock ? '/courses' : `/courses/s/${c.slug}`}
                      style={{ fontWeight: 700, boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)' }}
                    >
                      কোর্সটি দেখুন
                    </Button>
                  </Box>
                </Card>
              );
            })}
          </SimpleGrid>
        )}

        <Group justify="center" mt={{ base: '36px', sm: '50px' }}>
          <Button
            size="md"
            variant="outline"
            color="blue"
            radius="xl"
            rightSection={<IconArrowRight size={16} />}
            component={Link}
            href="/courses"
            style={{ fontWeight: 700, borderWidth: '1.5px' }}
          >
            সবগুলো কোর্স দেখুন
          </Button>
        </Group>
      </Container>

      {/* Styles for modern card hover effects */}
      <style jsx global>{`
        .modern-course-card {
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s ease !important;
        }
        .modern-course-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08) !important;
          border-color: #93c5fd !important;
        }
        .modern-course-card:hover .card-img {
          transform: scale(1.04);
        }
      `}</style>
    </Box>
  );
}
