'use client';

import { useState } from 'react';
import {
  Container,
  Title,
  Text,
  SimpleGrid,
  Card,
  Image,
  Badge,
  Button,
  Group,
  Stack,
  Skeleton,
  Tabs,
  ThemeIcon,
  Box,
} from '@mantine/core';
import { useGetEnrolledCourses } from '@/api/generated/commerce/commerce';
import { useListPublishedCourses } from '@/api/generated/course/course';
import { IconBooks, IconCompass, IconBook, IconCalendar, IconArrowRight } from '@tabler/icons-react';
import Link from 'next/link';

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState<string | null>('my-courses');

  // Query enrolled courses
  const { data: enrolledCourses, isLoading: isLoadingEnrolled } = useGetEnrolledCourses();
  
  // Query all published courses
  const { data: allCourses, isLoading: isLoadingAll } = useListPublishedCourses();

  // Helper to check if user is enrolled in a course
  const isEnrolled = (courseId: string) => {
    return enrolledCourses?.some((c) => c.id === courseId) ?? false;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('bn-BD', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Box pb="xl">
      {/* Hero Section */}
      <Box
        py={{ base: '32px', sm: '50px', md: '75px' }}
        style={{
          background: 'radial-gradient(circle at 80% 20%, #1e1b4b 0%, #0f172a 60%, #020617 100%)',
          color: 'white',
          position: 'relative',
        }}
        mb={{ base: '20px', sm: '36px' }}
      >
        <div className="glow-effect" style={{ top: '10%', right: '15%', opacity: 0.7 }} />
        <Container size="xl" style={{ position: 'relative', zIndex: 10 }}>
          <Stack gap="xs">
            <Badge variant="gradient" gradient={{ from: 'blue', to: 'violet' }} size="lg" radius="sm" style={{ width: 'fit-content' }}>
              লার্নিং সেন্টার
            </Badge>
            <Title order={1} style={{ fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 900 }}>
              আমার ড্যাশবোর্ড
            </Title>
            <Text size="md" style={{ color: 'var(--mantine-color-gray-4)', lineHeight: 1.6, maxWidth: '600px' }}>
              আপনার বিসিএস প্রিলি প্রস্তুতির অগ্রগতি ট্র্যাক করুন এবং বিষয়ভিত্তিক কোর্সগুলোতে সরাসরি প্রবেশ করুন।
            </Text>
          </Stack>
        </Container>
      </Box>

      {/* Main Content Area */}
      <Container size="xl">
        {/* Tabs Menu */}
        <Tabs value={activeTab} onChange={setActiveTab} variant="outline" radius="md">
          <Tabs.List mb="xl">
            <Tabs.Tab 
              value="my-courses" 
              leftSection={<IconBooks size={18} />}
              style={{ fontWeight: 700, fontSize: '14px' }}
              py={{ base: '8px', sm: '12px' }}
              px={{ base: '12px', sm: '24px' }}
            >
              আমার কোর্সসমূহ
            </Tabs.Tab>
            <Tabs.Tab 
              value="discover" 
              leftSection={<IconCompass size={18} />}
              style={{ fontWeight: 700, fontSize: '14px' }}
              py={{ base: '8px', sm: '12px' }}
              px={{ base: '12px', sm: '24px' }}
            >
              কোর্স এক্সপ্লোর করুন
            </Tabs.Tab>
          </Tabs.List>

          {/* Tab 1: My Courses */}
          <Tabs.Panel value="my-courses">
            {isLoadingEnrolled ? (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} p="md" radius="md" withBorder>
                    <Skeleton height={160} radius="md" mb="md" />
                    <Skeleton height={20} radius="sm" width="70%" mb="xs" />
                    <Skeleton height={14} radius="sm" width="90%" mb="md" />
                    <Skeleton height={36} radius="sm" />
                  </Card>
                ))}
              </SimpleGrid>
            ) : !enrolledCourses || enrolledCourses.length === 0 ? (
              <Card 
                p={{ base: 'xl', sm: '40px' }} 
                radius="lg" 
                withBorder 
                style={{ 
                  textAlign: 'center', 
                  backgroundColor: '#fafbfc',
                  borderStyle: 'dashed',
                  borderWidth: '2px',
                  borderColor: '#cbd5e1',
                }}
              >
                <Stack align="center" gap="md" py="lg">
                  <ThemeIcon size={64} radius="xl" color="blue" variant="light">
                    <IconBook size={32} />
                  </ThemeIcon>
                  <Title order={3} style={{ fontWeight: 800 }}>কোনো এনরোল করা কোর্স নেই</Title>
                  <Text c="dimmed" maw={500} mx="auto" size="sm" style={{ lineHeight: 1.6 }}>
                    আপনি এখনো কোনো প্রিলি কোর্সে এনরোল করেননি। সেরা প্রস্তুতির জন্য আজই আমাদের বিষয়ভিত্তিক কোর্স ক্যাটালগ এক্সপ্লোর করুন।
                  </Text>
                  <Button
                    onClick={() => setActiveTab('discover')}
                    variant="gradient"
                    gradient={{ from: 'blue', to: 'violet' }}
                    size="md"
                    radius="md"
                    mt="xs"
                    style={{ fontWeight: 700 }}
                  >
                    কোর্সসমূহ এক্সপ্লোর করুন
                  </Button>
                </Stack>
              </Card>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="xl">
                {enrolledCourses.map((course) => (
                  <Card 
                    key={course.id} 
                    shadow="xs"
                    padding="lg" 
                    radius="20px" 
                    withBorder 
                    className="modern-course-card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      height: '100%',
                      borderColor: '#e2e8f0',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <div>
                      <Card.Section style={{ position: 'relative', overflow: 'hidden' }}>
                        <Image
                          src={course.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80'}
                          height={190}
                          alt={course.title}
                          fallbackSrc="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80"
                          className="card-img"
                        />
                        <Box
                          style={{
                            position: 'absolute',
                            top: 12,
                            right: 12,
                            backgroundColor: 'rgba(13, 148, 136, 0.85)',
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
                          এনরোল করা আছে
                        </Box>
                      </Card.Section>

                      <Stack gap="xs" mt="md">
                        <Group justify="space-between" align="center">
                          <Badge variant="light" color="blue" size="xs" radius="sm">
                            বিসিএস প্রিলিমিনারি
                          </Badge>
                          <Group gap={4} align="center">
                            <IconCalendar size={13} style={{ color: '#64748b' }} />
                            <Text size="xs" c="dimmed" fw={600}>
                              {formatDate(course.enrolled_at)}
                            </Text>
                          </Group>
                        </Group>

                        <Title order={3} style={{ fontSize: '18px', fontWeight: 800, lineHeight: 1.35 }} lineClamp={2} c="gray.9">
                          {course.title}
                        </Title>

                        <Text size="sm" c="dimmed" lineClamp={2} style={{ lineHeight: 1.6, minHeight: '44px' }}>
                          {course.description || 'এই কোর্সের বিস্তারিত পড়াশোনা শুরু করতে নিচে ক্লিক করুন।'}
                        </Text>
                      </Stack>
                    </div>

                    <Box mt="md" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                      <Button 
                        variant="gradient"
                        gradient={{ from: 'teal', to: 'green' }}
                        fullWidth 
                        radius="md"
                        size="md"
                        leftSection={<IconBook size={18} />}
                        component={Link}
                        href={`/courses/s/${course.slug}/learn`}
                        style={{ fontWeight: 700, boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)' }}
                      >
                        পড়াশোনা চালিয়ে যান
                      </Button>
                    </Box>
                  </Card>
                ))}
              </SimpleGrid>
            )}
          </Tabs.Panel>

          {/* Tab 2: Discover Courses */}
          <Tabs.Panel value="discover">
            {isLoadingAll ? (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} p="md" radius="md" withBorder>
                    <Skeleton height={160} radius="md" mb="md" />
                    <Skeleton height={20} radius="sm" width="70%" mb="xs" />
                    <Skeleton height={14} radius="sm" width="90%" mb="md" />
                    <Skeleton height={36} radius="sm" />
                  </Card>
                ))}
              </SimpleGrid>
            ) : !allCourses || allCourses.length === 0 ? (
              <Card p="xl" radius="md" withBorder style={{ textAlign: 'center' }}>
                <Text c="dimmed">বর্তমানে এনরোলমেন্টের জন্য কোনো নতুন কোর্স উপলব্ধ নেই।</Text>
              </Card>
            ) : (
              <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="xl">
                {allCourses.map((course) => {
                  const enrolled = isEnrolled(course.id);
                  const isPaid = course.price && course.price !== '0.00';
                  const priceText = enrolled ? 'এনরোল করা আছে' : isPaid ? `${course.price} ${course.currency || 'BDT'}` : 'ফ্রি';

                  return (
                    <Card 
                      key={course.id} 
                      shadow="xs"
                      padding="lg" 
                      radius="20px" 
                      withBorder 
                      className="modern-course-card"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        height: '100%',
                        borderColor: '#e2e8f0',
                        backgroundColor: '#ffffff',
                      }}
                    >
                      <div>
                        <Card.Section style={{ position: 'relative', overflow: 'hidden' }}>
                          <Image
                            src={course.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80'}
                            height={190}
                            alt={course.title}
                            fallbackSrc="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80"
                            className="card-img"
                          />
                          <Box
                            style={{
                              position: 'absolute',
                              top: 12,
                              right: 12,
                              backgroundColor: enrolled || !isPaid ? 'rgba(13, 148, 136, 0.85)' : 'rgba(15, 23, 42, 0.85)',
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
                            {course.title}
                          </Title>

                          <Text size="sm" c="dimmed" lineClamp={2} style={{ lineHeight: 1.6, minHeight: '44px' }}>
                            {course.description || 'বিসিএস প্রিলিমিনারি পরীক্ষার শতভাগ সিলেবাস কাভার করে তৈরি করা আমাদের স্পেশাল কোর্স।'}
                          </Text>
                        </Stack>
                      </div>

                      <Box mt="md" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
                        <Button 
                          component={Link}
                          href={enrolled ? `/courses/s/${course.slug}/learn` : `/courses/s/${course.slug}`}
                          variant={enrolled ? 'outline' : 'gradient'}
                          gradient={enrolled ? undefined : { from: 'blue', to: 'violet' }}
                          color={enrolled ? 'green' : undefined}
                          fullWidth 
                          radius="md"
                          size="md"
                          rightSection={<IconArrowRight size={16} />}
                          style={{ fontWeight: 700, boxShadow: enrolled ? undefined : '0 4px 12px rgba(59, 130, 246, 0.25)' }}
                        >
                          {enrolled ? 'কোর্সে যান' : 'বিস্তারিত দেখুন'}
                        </Button>
                      </Box>
                    </Card>
                  );
                })}
              </SimpleGrid>
            )}
          </Tabs.Panel>
        </Tabs>
      </Container>
    </Box>
  );
}
