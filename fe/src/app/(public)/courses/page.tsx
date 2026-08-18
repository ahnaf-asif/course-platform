'use client';

import {
  Container,
  Title,
  Text,
  Stack,
  SimpleGrid,
  Card,
  Image,
  Badge,
  Button,
  Box,
  TextInput,
  Group,
  Skeleton,
} from '@mantine/core';
import { IconSearch, IconBook, IconArrowRight } from '@tabler/icons-react';
import Link from 'next/link';
import { useListPublishedCourses } from '@/api/generated/course/course';
import { useGetEnrolledCourses } from '@/api/generated/commerce/commerce';
import { useAuthContext } from '@/context/AuthContext';
import { CourseResponse } from '@/api/model/components-schemas-course/courseResponse';
import { useState, useMemo } from 'react';

const MOCK_COURSES = [
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

export default function CoursesPage() {
  const { isAuthenticated, isHydrated } = useAuthContext();
  const isUserLoggedIn = isHydrated && isAuthenticated;

  const { data: nodes, isLoading } = useListPublishedCourses();
  const { data: enrolledCourses } = useGetEnrolledCourses({
    query: {
      enabled: isUserLoggedIn,
    },
  });

  const [search, setSearch] = useState('');

  const isEnrolled = (courseId: string) => {
    if (!isUserLoggedIn || !enrolledCourses) return false;
    return enrolledCourses.some((c) => c.id === courseId);
  };

  // Filter nodes to only show actual course products
  const courses: CourseResponse[] = useMemo(() => {
    return nodes?.filter((node) => node.node_type === 'COURSE') || [];
  }, [nodes]);

  // Filter courses by search input
  const filteredCourses = useMemo(() => {
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase())
    );
  }, [courses, search]);

  const renderCourses = useMemo(() => {
    if (courses.length > 0) {
      if (filteredCourses.length > 0) {
        return filteredCourses;
      }
      return []; // search results empty
    }
    // Fallback to mock list if database has no courses yet
    return MOCK_COURSES.filter(
      (c) =>
        c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.description.toLowerCase().includes(search.toLowerCase())
    );
  }, [courses, filteredCourses, search]);

  return (
    <Box>
      {/* Hero Section */}
      <Box
        py={{ base: '36px', sm: '60px', md: '90px' }}
        style={{
          background: 'radial-gradient(circle at 80% 20%, #1e1b4b 0%, #0f172a 60%, #020617 100%)',
          color: 'white',
          position: 'relative',
        }}
      >
        <div className="glow-effect" style={{ top: '10%', right: '15%', opacity: 0.7 }} />
        <Container size="md" style={{ textAlign: 'center', position: 'relative', zIndex: 10 }}>
          <Badge variant="gradient" gradient={{ from: 'blue', to: 'violet' }} size="lg" mb="md" radius="sm">
            কোর্স ক্যাটালগ
          </Badge>
          <Title order={1} style={{ fontSize: 'clamp(28px, 6vw, 44px)', fontWeight: 900 }}>
            আপনার বিসিএস প্রিলি প্রস্তুতির কোর্সসমূহ
          </Title>
          <Text size="lg" style={{ color: 'var(--mantine-color-gray-4)', lineHeight: 1.6, maxWidth: '640px', margin: '16px auto 0' }}>
            বিসিএস প্রিলিমিনারি পরীক্ষার সিলেবাস কভার করতে আমাদের প্রিমিয়াম ও বিষয়ভিত্তিক কোর্সগুলো এক্সপ্লোর করুন। সেরা মেন্টরদের গাইডলাইনে বিষয়ভিত্তিক প্রস্তুতি নিয়ে নিজেকে এগিয়ে রাখুন।
          </Text>

          {/* Search bar */}
          <Container size="sm" mt="xl" p={0}>
            <TextInput
              leftSection={<IconSearch size={18} />}
              placeholder="কোর্সের নাম বা বিষয় দিয়ে খুঁজুন..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="md"
              radius="xl"
              styles={{
                input: {
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  '&:focus': {
                    borderColor: '#60a5fa',
                  },
                },
              }}
            />
          </Container>
        </Container>
      </Box>

      {/* Courses Catalog Section */}
      <Container size="xl" py={{ base: '28px', md: '60px' }}>
        {isLoading ? (
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
            {[1, 2, 3].map((n) => (
              <Card key={n} shadow="sm" padding="lg" radius="md" withBorder>
                <Skeleton height={160} radius="md" mb="md" />
                <Skeleton height={20} width="60%" mb="xs" />
                <Skeleton height={10} radius="xl" mb="xs" />
                <Skeleton height={10} radius="xl" mb="xs" />
                <Skeleton height={10} radius="xl" width="70%" mb="md" />
                <Skeleton height={36} radius="md" />
              </Card>
            ))}
          </SimpleGrid>
        ) : renderCourses.length > 0 ? (
          <Stack gap="xl">
            {courses.length === 0 && (
              <Box
                style={{
                  padding: '16px',
                  backgroundColor: 'rgba(255, 249, 219, 0.9)',
                  border: '1px solid #ffe066',
                  borderRadius: '12px',
                }}
              >
                <Text size="sm" c="yellow.9" fw={600} style={{ textAlign: 'center' }}>
                  💡 ডেমো ক্যাটালগ: ডাটাবেজে এখনো লাইভ কোর্স প্রকাশিত হয়নি। নিচে ডেমো কোর্সগুলো প্রদর্শিত হচ্ছে।
                </Text>
              </Box>
            )}
            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="xl">
              {renderCourses.map((c) => {
                const isMock = c.id.startsWith('mock-');
                const enrolled = isEnrolled(c.id);
                const coursePrice = parseFloat(c.price || '0');
                const isFree = coursePrice === 0;
                const priceText = enrolled ? 'এনরোল করা আছে' : isFree ? 'ফ্রি' : `${c.price} ${c.currency || 'BDT'}`;

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
                            backgroundColor: enrolled || isFree ? 'rgba(13, 148, 136, 0.85)' : 'rgba(15, 23, 42, 0.85)',
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
                        variant={enrolled ? 'outline' : 'gradient'}
                        gradient={enrolled ? undefined : { from: 'blue', to: 'violet' }}
                        color={enrolled ? 'green' : undefined}
                        fullWidth
                        radius="md"
                        size="md"
                        rightSection={<IconArrowRight size={16} />}
                        component={Link}
                        href={isMock ? '/login' : enrolled ? `/courses/s/${c.slug}/learn` : `/courses/s/${c.slug}`}
                        style={{
                          fontWeight: 700,
                          boxShadow: enrolled ? undefined : '0 4px 12px rgba(59, 130, 246, 0.25)',
                        }}
                      >
                        {isMock ? 'কোর্সটি দেখুন' : enrolled ? 'কোর্সে যান' : 'বিস্তারিত দেখুন'}
                      </Button>
                    </Box>
                  </Card>
                );
              })}
            </SimpleGrid>
          </Stack>
        ) : (
          <Box style={{ textAlign: 'center', padding: '60px 0' }}>
            <IconBook size={48} color="var(--mantine-color-gray-4)" style={{ marginBottom: '15px' }} />
            <Title order={3} c="gray.7" mb="xs">
              কোনো কোর্স পাওয়া যায়নি
            </Title>
            <Text c="dimmed" size="sm">
              আপনার অনুসন্ধানের সাথে মেলে এমন কোনো কোর্স খুঁজে পাওয়া যায়নি। অন্য কিছু লিখে অনুসন্ধান করার চেষ্টা করুন।
            </Text>
          </Box>
        )}
      </Container>
    </Box>
  );
}
