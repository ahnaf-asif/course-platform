'use client';

import { useParams, useRouter } from 'next/navigation';
import {
  Container,
  Title,
  Text,
  Stack,
  Group,
  Badge,
  Card,
  Image,
  Skeleton,
  Button,
  Box,
  Divider,
  TextInput,
  SimpleGrid,
  Accordion,
  ThemeIcon,
} from '@mantine/core';
import { useGetCourseBySlug, useGetCourseTreeBySlug } from '@/api/generated/course/course';
import { useCheckAccess, useCheckout } from '@/api/generated/commerce/commerce';
import { useGetMe } from '@/api/generated/user/user';
import {
  IconClock,
  IconUsers,
  IconCertificate,
  IconArrowLeft,
  IconBooks,
  IconFolder,
  IconFileText,
  IconCheck,
  IconPlayerPlay,
  IconAward,
  IconChevronRight,
  IconTag,
  IconDeviceLaptop,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CourseTreeResponse } from '@/api/model/components-schemas-curriculum/courseTreeResponse';

interface ExtendedNode extends CourseTreeResponse {
  children: ExtendedNode[];
}

export default function PublicCoursePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [couponCode, setCouponCode] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);

  const { data: user } = useGetMe();
  const { data: course, isLoading: isLoadingCourse, isError: isCourseError } = useGetCourseBySlug(slug);

  // Only fetch access status if user is logged in and course is loaded
  const { data: accessData } = useCheckAccess(slug, {
    query: {
      enabled: !!user && !!course?.id,
    },
  });

  const hasAccess = accessData?.has_access ?? false;

  // Only fetch tree if course is loaded
  const { data: tree } = useGetCourseTreeBySlug(slug, {
    query: {
      enabled: !!course?.slug,
    },
  });

  const organizedTree = useMemo(() => {
    if (!tree) return [];
    const map: Record<string, ExtendedNode> = {};
    const roots: ExtendedNode[] = [];
    tree.forEach((node) => {
      map[node.id] = { ...node, children: [] };
    });
    tree.forEach((node) => {
      const mappedNode = map[node.id];
      if (node.level === 1) roots.push(mappedNode);
      if (node.parent_id && map[node.parent_id]) map[node.parent_id].children.push(mappedNode);
    });
    return roots.sort((a, b) => (a.sequence_order ?? 0) - (b.sequence_order ?? 0));
  }, [tree]);

  const { mutateAsync: checkout, isPending: isCheckingOut } = useCheckout();

  const handleEnroll = async () => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (!course?.id) return;

    try {
      const res = await checkout({
        data: {
          node_id: course.id,
          coupon_code: couponCode,
        },
      });

      if (res.enrolled) {
        router.push(`/courses/s/${slug}/learn`);
      } else if (res.checkout_url) {
        setIsRedirecting(true);
        window.location.href = res.checkout_url;
      }
    } catch (err) {
      console.error('Checkout failed:', err);
    }
  };

  if (isLoadingCourse) {
    return (
      <Box py="xl">
        <Container size="xl">
          <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
            <Box style={{ gridColumn: 'span 2' }}>
              <Stack gap="lg">
                <Skeleton height={40} width="40%" radius="md" />
                <Skeleton height={60} radius="md" />
                <Skeleton height={20} width="80%" radius="sm" />
                <Skeleton height={250} radius="lg" mt="md" />
              </Stack>
            </Box>
            <Skeleton height={400} radius="lg" />
          </SimpleGrid>
        </Container>
      </Box>
    );
  }

  if (isCourseError || !course) {
    return (
      <Box py={{ base: '60px', md: '100px' }} style={{ backgroundColor: '#0f172a', color: 'white', minHeight: '60vh' }}>
        <Container size="md">
          <Stack align="center" gap="md" style={{ textAlign: 'center' }}>
            <ThemeIcon size={64} radius="xl" color="red" variant="light">
              <IconBooks size={32} />
            </ThemeIcon>
            <Title order={2} style={{ fontSize: '28px', fontWeight: 800 }}>
              কোর্সটি খুঁজে পাওয়া যায়নি
            </Title>
            <Text c="dimmed" size="md" maw={500}>
              আপনি যে কোর্সটি খুঁজছেন তা হয়তো মুছে ফেলা হয়েছে অথবা ইউআরএলটি পরিবর্তন করা হয়েছে।
            </Text>
            <Button
              component={Link}
              href="/courses"
              variant="gradient"
              gradient={{ from: 'blue', to: 'violet' }}
              leftSection={<IconArrowLeft size={18} />}
              size="md"
              radius="md"
              mt="md"
            >
              কোর্স ক্যাটালগে ফিরে যান
            </Button>
          </Stack>
        </Container>
      </Box>
    );
  }

  const isPaid = course.price && parseFloat(course.price) > 0;
  const priceDisplay = isPaid ? `${course.price} ${course.currency || 'BDT'}` : 'ফ্রি';

  return (
    <Box pb={{ base: '50px', md: '80px' }} style={{ backgroundColor: '#f8fafc' }}>
      {/* Dark Radial Hero Section */}
      <Box
        py={{ base: '40px', sm: '60px', md: '75px' }}
        style={{
          background: 'radial-gradient(circle at 80% 20%, #1e1b4b 0%, #0f172a 60%, #020617 100%)',
          color: 'white',
          position: 'relative',
          marginBottom: '40px',
        }}
      >
        <div className="glow-effect" style={{ top: '10%', right: '15%', opacity: 0.7 }} />
        <Container size="xl" style={{ position: 'relative', zIndex: 10 }}>
          <Stack gap="md">
            {/* Breadcrumb */}
            <Group gap="xs">
              <Link href="/" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}>
                হোম
              </Link>
              <IconChevronRight size={12} color="#64748b" />
              <Link href="/courses" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}>
                কোর্সসমূহ
              </Link>
              <IconChevronRight size={12} color="#64748b" />
              <Text size="xs" c="blue.4" fw={600} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                {course.title}
              </Text>
            </Group>

            <Badge variant="gradient" gradient={{ from: 'blue', to: 'violet' }} size="lg" radius="sm" style={{ width: 'fit-content' }}>
              বিসিএস প্রিলিমিনারি স্পেশাল কোর্স
            </Badge>

            <Title order={1} style={{ fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 900, lineHeight: 1.25, maxWidth: '800px' }}>
              {course.title}
            </Title>

            <Text size="lg" style={{ color: 'var(--mantine-color-gray-4)', lineHeight: 1.6, maxWidth: '780px' }}>
              {course.description || 'বিসিএস প্রিলিমিনারি পরীক্ষার শতভাগ সিলেবাস কাভার করে বিষয়ভিত্তিক ভিডিও লেকচার, রিভিশন শিট ও প্রিলি মডেল টেস্ট।'}
            </Text>

            {/* Quick Micro Specs */}
            <Group gap="lg" mt="sm" style={{ flexWrap: 'wrap' }}>
              <Group gap={6} align="center">
                <ThemeIcon size={28} radius="xl" color="blue" variant="light">
                  <IconUsers size={15} />
                </ThemeIcon>
                <Text size="sm" fw={600} c="gray.3">২,৫০০+ শিক্ষার্থী</Text>
              </Group>
              <Group gap={6} align="center">
                <ThemeIcon size={28} radius="xl" color="orange" variant="light">
                  <IconClock size={15} />
                </ThemeIcon>
                <Text size="sm" fw={600} c="gray.3">বিষয়ভিত্তিক ভিডিও লেকচার</Text>
              </Group>
              <Group gap={6} align="center">
                <ThemeIcon size={28} radius="xl" color="teal" variant="light">
                  <IconCertificate size={15} />
                </ThemeIcon>
                <Text size="sm" fw={600} c="gray.3">মডেল টেস্ট সহ</Text>
              </Group>
            </Group>
          </Stack>
        </Container>
      </Box>

      {/* Main Grid Content */}
      <Container size="xl">
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
          {/* Left Column: Details & Syllabus */}
          <Box style={{ gridColumn: 'span 2' }}>
            <Stack gap="xl">
              {/* Course Highlights Grid */}
              <Card radius="lg" p={{ base: 'lg', sm: 'xl' }} withBorder shadow="xs">
                <Title order={3} style={{ fontSize: '20px', fontWeight: 800 }} mb="lg">
                  এই কোর্সে যা যা থাকছে
                </Title>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                  <Group align="flex-start" gap="md">
                    <ThemeIcon size={36} radius="md" color="blue" variant="light">
                      <IconBooks size={20} />
                    </ThemeIcon>
                    <div style={{ flex: 1 }}>
                      <Text fw={700} size="sm">শতভাগ সিলেবাস কাভারেজ</Text>
                      <Text size="xs" c="dimmed" style={{ lineHeight: 1.5 }}>বিসিএস প্রিলির সকল বিষয় ও অধ্যায়ের পুঙ্খানুপুঙ্খ আলোচনা।</Text>
                    </div>
                  </Group>
                  <Group align="flex-start" gap="md">
                    <ThemeIcon size={36} radius="md" color="violet" variant="light">
                      <IconPlayerPlay size={20} />
                    </ThemeIcon>
                    <div style={{ flex: 1 }}>
                      <Text fw={700} size="sm">হাই-কোয়ালিটি রেকর্ড করা ক্লাস</Text>
                      <Text size="xs" c="dimmed" style={{ lineHeight: 1.5 }}>যেকোনো সময়ে আপনার সুবিধামতো রিপিট করে দেখার সুবিধা।</Text>
                    </div>
                  </Group>
                  <Group align="flex-start" gap="md">
                    <ThemeIcon size={36} radius="md" color="teal" variant="light">
                      <IconAward size={20} />
                    </ThemeIcon>
                    <div style={{ flex: 1 }}>
                      <Text fw={700} size="sm">অধ্যায়ভিত্তিক মডেল টেস্ট</Text>
                      <Text size="xs" c="dimmed" style={{ lineHeight: 1.5 }}>পড়াশোনা শেষে নিজেকে যাচাই করতে আনলিমিটেড কুইজ ও প্র্যাকটিস।</Text>
                    </div>
                  </Group>
                  <Group align="flex-start" gap="md">
                    <ThemeIcon size={36} radius="md" color="orange" variant="light">
                      <IconDeviceLaptop size={20} />
                    </ThemeIcon>
                    <div style={{ flex: 1 }}>
                      <Text fw={700} size="sm">আজীবন অ্যাক্সেস</Text>
                      <Text size="xs" c="dimmed" style={{ lineHeight: 1.5 }}>একবার এনরোল করলে কোনো মেয়াদ ছাড়াই আজীবন অ্যাক্সেস পাবেন।</Text>
                    </div>
                  </Group>
                </SimpleGrid>
              </Card>

              {/* Course Curriculum */}
              <Card radius="lg" p={{ base: 'lg', sm: 'xl' }} withBorder shadow="xs">
                <Group justify="space-between" align="center" mb="lg">
                  <div>
                    <Title order={3} style={{ fontSize: '20px', fontWeight: 800 }}>
                      কোর্স সিলেবাস ও অধ্যায়সমূহ
                    </Title>
                    <Text size="xs" c="dimmed" mt={4}>
                      নিচে ক্লিক করে বিষয় ও অধ্যায়সমূহের লেকচার কন্টেন্ট দেখে নিন
                    </Text>
                  </div>
                  <Badge variant="light" color="blue" size="md">
                    {organizedTree.length > 0 ? `${organizedTree.length} টি বিষয়` : 'সিলেবাস আপডেট হচ্ছে'}
                  </Badge>
                </Group>

                {organizedTree.length > 0 ? (
                  <Accordion variant="separated" radius="md">
                    {organizedTree.map((subject) => (
                      <Accordion.Item key={subject.id} value={subject.id} style={{ borderColor: '#e2e8f0' }}>
                        <Accordion.Control>
                          <Group justify="space-between" align="center" pr="xs">
                            <Group gap="sm">
                              <IconBooks size={20} color="var(--mantine-color-blue-6)" />
                              <Text fw={700} size="md" c="gray.9">{subject.title}</Text>
                            </Group>
                            <Badge variant="subtle" color="gray" size="xs">
                              {subject.children.length} টি অধ্যায়
                            </Badge>
                          </Group>
                        </Accordion.Control>
                        <Accordion.Panel>
                          <Stack gap="sm" pt="xs">
                            {subject.children.map((chapter: ExtendedNode) => (
                              <Box
                                key={chapter.id}
                                p="sm"
                                style={{
                                  backgroundColor: '#f8fafc',
                                  borderRadius: '8px',
                                  border: '1px solid #f1f5f9',
                                }}
                              >
                                <Group justify="space-between" align="center" mb="xs">
                                  <Group gap="xs">
                                    <IconFolder size={16} color="var(--mantine-color-orange-5)" />
                                    <Text size="sm" fw={700} c="gray.8">{chapter.title}</Text>
                                  </Group>
                                  <Badge size="xs" variant="light" color="blue">
                                    {chapter.children.length} টি লেকচার
                                  </Badge>
                                </Group>

                                <Stack gap={6} pl="md">
                                  {chapter.children.map((lesson: ExtendedNode) => (
                                    <Group key={lesson.id} justify="space-between" align="center" py={2}>
                                      <Group gap="xs">
                                        <IconFileText size={14} color="var(--mantine-color-teal-6)" />
                                        <Text size="xs" fw={500} c="gray.7">{lesson.title}</Text>
                                      </Group>
                                      {lesson.has_quizzes && (
                                        <Badge size="xs" color="violet" variant="dot">
                                          কুইজ রয়েছে
                                        </Badge>
                                      )}
                                    </Group>
                                  ))}
                                </Stack>
                              </Box>
                            ))}
                          </Stack>
                        </Accordion.Panel>
                      </Accordion.Item>
                    ))}
                  </Accordion>
                ) : (
                  <Stack gap="sm">
                    <Box p="md" style={{ backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                      <Group gap="md">
                        <ThemeIcon size={32} radius="md" color="blue" variant="light">
                          <IconBooks size={18} />
                        </ThemeIcon>
                        <div>
                          <Text fw={700} size="sm">বিষয়ভিত্তিক সম্পূর্ণ সিলেবাস লেকচার</Text>
                          <Text size="xs" c="dimmed">বিসিএস প্রিলির ১০টি বিষয়ের সম্পূর্ণ লেকচার ভিডিও এবং অধ্যায়ভিত্তিক রিভিশন নোট।</Text>
                        </div>
                      </Group>
                    </Box>
                    <Box p="md" style={{ backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                      <Group gap="md">
                        <ThemeIcon size={32} radius="md" color="violet" variant="light">
                          <IconAward size={18} />
                        </ThemeIcon>
                        <div>
                          <Text fw={700} size="sm">প্রিলিমিনারি মডেল টেস্ট ও প্রশ্ন ব্যাংক</Text>
                          <Text size="xs" c="dimmed">বিগত বছরের বিসিএস প্রিলি প্রশ্নপত্র ও আনলিমিটেড কুইজ অনুশীলন।</Text>
                        </div>
                      </Group>
                    </Box>
                  </Stack>
                )}
              </Card>
            </Stack>
          </Box>

          {/* Right Column: Sticky Floating Purchase Card */}
          <Box>
            <Card
              shadow="lg"
              padding="lg"
              radius="xl"
              withBorder
              style={{
                position: 'sticky',
                top: '90px',
                borderColor: '#cbd5e1',
                backgroundColor: '#ffffff',
              }}
            >
              <Card.Section style={{ position: 'relative', overflow: 'hidden' }}>
                <Image
                  src={course.thumbnail_url || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80'}
                  alt={course.title}
                  height={220}
                  fallbackSrc="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80"
                />
                <Box
                  style={{
                    position: 'absolute',
                    bottom: 12,
                    left: 12,
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    borderRadius: '100px',
                    padding: '4px 12px',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '12px',
                  }}
                >
                  বিসিএস প্রিলিমিনারি
                </Box>
              </Card.Section>

              <Stack gap="md" mt="lg">
                {/* Price Display */}
                <Group justify="space-between" align="baseline">
                  <Text size="xs" c="dimmed" fw={700} style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    কোর্স ফি:
                  </Text>
                  <Text size="26px" fw={900} style={{ color: isPaid ? '#2563eb' : '#0d9488' }}>
                    {priceDisplay}
                  </Text>
                </Group>

                {/* Promo Code Input if paid and user does not have access */}
                {!hasAccess && isPaid && user && (
                  <TextInput
                    placeholder="প্রোমো কোড (যদি থাকে)"
                    leftSection={<IconTag size={16} />}
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.currentTarget.value)}
                    size="sm"
                    radius="md"
                  />
                )}

                {/* Enrollment Button */}
                {hasAccess ? (
                  <Button
                    size="lg"
                    radius="md"
                    component={Link}
                    href={`/courses/s/${slug}/learn`}
                    variant="gradient"
                    gradient={{ from: 'teal', to: 'green' }}
                    fullWidth
                    leftSection={<IconPlayerPlay size={20} />}
                    style={{ fontWeight: 700, boxShadow: '0 4px 14px rgba(13, 148, 136, 0.35)' }}
                  >
                    পড়াশোনা শুরু করুন
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    radius="md"
                    onClick={handleEnroll}
                    loading={isCheckingOut || isRedirecting}
                    variant="gradient"
                    gradient={{ from: 'blue', to: 'violet' }}
                    fullWidth
                    style={{ fontWeight: 700, boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)' }}
                  >
                    {isPaid ? 'এনরোল করুন' : 'বিনামূল্যে এনরোল করুন'}
                  </Button>
                )}

                <Divider color="#f1f5f9" my="xs" />

                {/* Guarantee List */}
                <Stack gap="xs">
                  <Text size="xs" fw={700} c="dimmed" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    কোর্সের সাথে অন্তর্ভুক্ত:
                  </Text>
                  <Group gap="xs">
                    <IconCheck size={16} color="#22c55e" />
                    <Text size="xs" fw={600} c="gray.7">১০০% সিলেবাস কাভারেজ</Text>
                  </Group>
                  <Group gap="xs">
                    <IconCheck size={16} color="#22c55e" />
                    <Text size="xs" fw={600} c="gray.7">অধ্যায়ভিত্তিক লেকচার ও রিভিশন নোট</Text>
                  </Group>
                  <Group gap="xs">
                    <IconCheck size={16} color="#22c55e" />
                    <Text size="xs" fw={600} c="gray.7">নিয়মিত বিসিএস প্রিলি মডেল টেস্ট</Text>
                  </Group>
                  <Group gap="xs">
                    <IconCheck size={16} color="#22c55e" />
                    <Text size="xs" fw={600} c="gray.7">আজীবন অ্যাক্সেস ও সাপোর্ট</Text>
                  </Group>
                </Stack>
              </Stack>
            </Card>
          </Box>
        </SimpleGrid>
      </Container>
    </Box>
  );
}
