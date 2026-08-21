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
  Modal,
  Paper,
  Table,
  Alert,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useGetCourseBySlug, useGetCourseTreeBySlug } from '@/api/generated/course/course';
import { useCheckAccess, useCheckout } from '@/api/generated/commerce/commerce';
import { useGetReferralsValidate } from '@/api/generated/referral/referral';
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
  IconGift,
  IconDeviceLaptop,
  IconCreditCard,
  IconLock,
  IconSparkles,
} from '@tabler/icons-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { CourseTreeResponse } from '@/api/model/components-schemas-curriculum/courseTreeResponse';

interface ExtendedNode extends CourseTreeResponse {
  children: ExtendedNode[];
  has_quiz?: boolean;
}

export default function PublicCoursePage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [isRedirecting, setIsRedirecting] = useState(false);
  const [confirmModalOpened, { open: openConfirmModal, close: closeConfirmModal }] = useDisclosure(false);

  const [referralInput, setReferralInput] = useState('');
  const [appliedReferralCode, setAppliedReferralCode] = useState('');
  const [referralError, setReferralError] = useState<string | null>(null);

  // Validate applied referral code
  const {
    data: validationResult,
    isLoading: isValidatingReferral,
  } = useGetReferralsValidate(
    { code: appliedReferralCode },
    {
      query: {
        enabled: !!appliedReferralCode && appliedReferralCode.trim().length === 6,
      },
    }
  );

  const isReferralValid = !!(appliedReferralCode && validationResult?.valid);
  const buyerDiscountPct = isReferralValid ? validationResult.buyer_discount_percentage : 0;

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

  // Financial calculations
  const isPaid = !!course?.price && parseFloat(course.price) > 0;
  const rawPrice = isPaid ? parseFloat(course.price as string) : 0;
  const discountAmount = isReferralValid ? (rawPrice * buyerDiscountPct) / 100 : 0;
  const finalPayable = Math.max(0, rawPrice - discountAmount);
  const currency = course?.currency || 'BDT';

  const handleApplyReferral = () => {
    const clean = referralInput.trim().toUpperCase();
    if (clean.length !== 6) {
      setReferralError('রেফারাল কোডটি অবশ্যই ৬ অক্ষরের হতে হবে');
      return;
    }
    setReferralError(null);
    setAppliedReferralCode(clean);
  };

  const handleClearReferral = () => {
    setAppliedReferralCode('');
    setReferralInput('');
    setReferralError(null);
  };

  const handleEnrollClick = () => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (!course?.id) return;

    if (!isPaid || finalPayable <= 0) {
      // Free course or 100% discount, execute directly
      handleConfirmCheckout();
    } else {
      // Open transaction confirmation modal
      openConfirmModal();
    }
  };

  const handleConfirmCheckout = async () => {
    if (!user) {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (!course?.id) return;

    try {
      const res = await checkout({
        data: {
          node_id: course.id,
          referral_code: isReferralValid ? appliedReferralCode : undefined,
        },
      });

      if (res.enrolled) {
        closeConfirmModal();
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
                <Text size="sm" fw={600} c="gray.3">৬০+ ঘণ্টার ভিডিও লেকচার</Text>
              </Group>
              <Group gap={6} align="center">
                <ThemeIcon size={28} radius="xl" color="teal" variant="light">
                  <IconCertificate size={15} />
                </ThemeIcon>
                <Text size="sm" fw={600} c="gray.3">কোর্স সমাপনী সার্টিফিকেট</Text>
              </Group>
              <Group gap={6} align="center">
                <ThemeIcon size={28} radius="xl" color="violet" variant="light">
                  <IconDeviceLaptop size={15} />
                </ThemeIcon>
                <Text size="sm" fw={600} c="gray.3">লাইফটাইম অ্যাক্সেস</Text>
              </Group>
            </Group>
          </Stack>
        </Container>
      </Box>

      {/* Main Grid Content */}
      <Container size="xl">
        <SimpleGrid cols={{ base: 1, md: 3 }} spacing="xl">
          {/* Left Column: Syllabus and Details */}
          <Box style={{ gridColumn: 'span 2' }}>
            <Stack gap="xl">
              {/* Features Banner */}
              <Card p="lg" radius="lg" withBorder style={{ backgroundColor: '#ffffff' }}>
                <Title order={3} fw={800} mb="md" style={{ color: '#0f172a' }}>
                  এই কোর্সে যা যা থাকছে
                </Title>
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <Group gap="sm" align="flex-start">
                    <ThemeIcon color="teal" size={24} radius="xl">
                      <IconCheck size={14} />
                    </ThemeIcon>
                    <div>
                      <Text fw={700} size="sm">অধ্যায়ভিত্তিক এইচডি ভিডিও লেকচার</Text>
                      <Text size="xs" c="dimmed">প্রতিটি টপিকের বিস্তারিত আলোচনা ও কনসেপ্ট ক্লিয়ারিং।</Text>
                    </div>
                  </Group>
                  <Group gap="sm" align="flex-start">
                    <ThemeIcon color="blue" size={24} radius="xl">
                      <IconCheck size={14} />
                    </ThemeIcon>
                    <div>
                      <Text fw={700} size="sm">ডাউনলোডযোগ্য লেকচার শিট ও নোট</Text>
                      <Text size="xs" c="dimmed">রিভিশন দেওয়ার জন্য সহায়ক প্রিমিয়াম পিডিএফ শিট।</Text>
                    </div>
                  </Group>
                  <Group gap="sm" align="flex-start">
                    <ThemeIcon color="indigo" size={24} radius="xl">
                      <IconCheck size={14} />
                    </ThemeIcon>
                    <div>
                      <Text fw={700} size="sm">টপিকভিত্তিক কুইজ ও প্র্যাকটিস টেস্ট</Text>
                      <Text size="xs" c="dimmed">পড়া শেষে নিজের প্রস্তুতি যাচাই করার তাৎক্ষণিক ফলাফল।</Text>
                    </div>
                  </Group>
                  <Group gap="sm" align="flex-start">
                    <ThemeIcon color="violet" size={24} radius="xl">
                      <IconCheck size={14} />
                    </ThemeIcon>
                    <div>
                      <Text fw={700} size="sm">সার্বক্ষণিক ইন্সট্রাক্টর সাপোর্ট</Text>
                      <Text size="xs" c="dimmed">যেকোনো প্রশ্ন ও সমস্যা সমাধানের জন্য ডেডিকেটেড ডিসকাশন।</Text>
                    </div>
                  </Group>
                </SimpleGrid>
              </Card>

              {/* Course Curriculum Accordion */}
              <Card p="lg" radius="lg" withBorder style={{ backgroundColor: '#ffffff' }}>
                <Group justify="space-between" align="center" mb="lg">
                  <div>
                    <Title order={3} fw={800} style={{ color: '#0f172a' }}>
                      কোর্স কারিকুলাম ও সূচিপত্র
                    </Title>
                    <Text size="xs" c="dimmed" mt={4}>
                      সম্পূর্ণ সিলেবাস অনুযায়ী সাজানো বিষয়ভিত্তিক পাঠ্যসূচি
                    </Text>
                  </div>
                  <Badge variant="light" color="blue" size="lg">
                    {organizedTree.length} টি বিষয় অন্তর্ভুক্ত
                  </Badge>
                </Group>

                {organizedTree.length > 0 ? (
                  <Accordion variant="separated" radius="md">
                    {organizedTree.map((subject) => (
                      <Accordion.Item key={subject.id} value={subject.id} style={{ borderColor: '#e2e8f0' }}>
                        <Accordion.Control icon={<IconFolder size={20} color="#2563eb" />}>
                          <Group justify="space-between" pr="md">
                            <Text fw={700} size="sm" style={{ color: '#1e293b' }}>
                              {subject.title}
                            </Text>
                            <Badge size="xs" variant="light" color="gray">
                              {subject.children.length} টি অধ্যায়
                            </Badge>
                          </Group>
                        </Accordion.Control>
                        <Accordion.Panel>
                          <Stack gap="xs">
                            {subject.children.map((chapter) => (
                              <Box
                                key={chapter.id}
                                p="sm"
                                style={{
                                  backgroundColor: '#f8fafc',
                                  borderRadius: '8px',
                                  border: '1px solid #f1f5f9',
                                }}
                              >
                                <Text fw={600} size="xs" c="blue.7" mb={4}>
                                  {chapter.title}
                                </Text>
                                <Stack gap={4} pl="sm">
                                  {chapter.children.map((lesson) => (
                                    <Group key={lesson.id} justify="space-between">
                                      <Group gap={6}>
                                        <IconFileText size={14} color="#64748b" />
                                        <Text size="xs" c="dimmed">
                                          {lesson.title}
                                        </Text>
                                      </Group>
                                      {lesson.has_quiz && (
                                        <Badge size="xs" color="orange" variant="dot">
                                          কুইজ
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
                  <Stack gap="md">
                    <Box p="md" style={{ backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px dashed #cbd5e1' }}>
                      <Group gap="md">
                        <ThemeIcon size={32} radius="md" color="blue" variant="light">
                          <IconBooks size={18} />
                        </ThemeIcon>
                        <div>
                          <Text fw={700} size="sm">বিষয়ভিত্তিক সম্পূর্ণ প্রিলিমিনারি সিলেবাস</Text>
                          <Text size="xs" c="dimmed">বাংলা, ইংরেজি, গণিত, সাধারণ জ্ঞান, বিজ্ঞান ও কম্পিউটার বিষয়ের পুঙ্খানুপুঙ্খ আলোচনা।</Text>
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
                <div>
                  <Group justify="space-between" align="baseline">
                    <Text size="xs" c="dimmed" fw={700} style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      কোর্স ফি:
                    </Text>
                    {isPaid ? (
                      <Group gap="xs" align="baseline">
                        {isReferralValid && (
                          <Text size="md" td="line-through" c="dimmed" fw={600}>
                            ৳{rawPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </Text>
                        )}
                        <Text size="26px" fw={900} style={{ color: isReferralValid ? '#0d9488' : '#2563eb' }}>
                          ৳{finalPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}
                        </Text>
                      </Group>
                    ) : (
                      <Text size="26px" fw={900} style={{ color: '#0d9488' }}>
                        ফ্রি
                      </Text>
                    )}
                  </Group>

                  {/* Savings Ribbon */}
                  {isReferralValid && isPaid && (
                    <Group gap={6} mt={4}>
                      <Badge size="sm" variant="filled" color="teal" leftSection={<IconSparkles size={12} />}>
                        {buyerDiscountPct}% রেফারাল ডিসকাউন্ট প্রযোজ্য
                      </Badge>
                      <Text size="xs" fw={700} c="teal.8">
                        (৳{discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} সাশ্রয়)
                      </Text>
                    </Group>
                  )}
                </div>

                {/* Referral Code Box (Only shown if paid and user does not have access yet) */}
                {!hasAccess && isPaid && (
                  <Paper p="sm" radius="md" withBorder style={{ backgroundColor: '#f8fafc' }}>
                    <Stack gap={6}>
                      <Text size="xs" fw={700} c="gray.7">
                        রেফারাল কোড (Referral Code):
                      </Text>
                      <Group gap="xs">
                        <TextInput
                          placeholder="৬ অক্ষরের কোড"
                          leftSection={<IconGift size={16} color="#0d9488" />}
                          value={referralInput}
                          maxLength={6}
                          onChange={(e) => {
                            const val = e.currentTarget.value.toUpperCase().trim();
                            setReferralInput(val);
                            setReferralError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleApplyReferral();
                            }
                          }}
                          size="sm"
                          radius="md"
                          style={{ flex: 1 }}
                          disabled={isReferralValid}
                          data-testid="input-referral-code"
                        />
                        {isReferralValid ? (
                          <Button
                            size="sm"
                            variant="light"
                            color="red"
                            onClick={handleClearReferral}
                            data-testid="btn-clear-referral"
                          >
                            মুছুন
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            color="teal"
                            loading={isValidatingReferral}
                            disabled={referralInput.trim().length !== 6}
                            onClick={handleApplyReferral}
                            data-testid="btn-apply-referral"
                          >
                            প্রয়োগ
                          </Button>
                        )}
                      </Group>

                      {/* Live Validation Feedback */}
                      {isReferralValid && (
                        <Text size="xs" fw={700} c="teal.7">
                          ✓ {validationResult.message}
                        </Text>
                      )}

                      {appliedReferralCode && !isValidatingReferral && validationResult && !validationResult.valid && (
                        <Text size="xs" fw={700} c="red.6">
                          ✗ {validationResult.message}
                        </Text>
                      )}

                      {referralError && (
                        <Text size="xs" fw={700} c="red.6">
                          ✗ {referralError}
                        </Text>
                      )}
                    </Stack>
                  </Paper>
                )}

                {/* Enrollment Main Button */}
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
                    onClick={handleEnrollClick}
                    loading={isCheckingOut || isRedirecting}
                    variant="gradient"
                    gradient={{ from: 'blue', to: 'violet' }}
                    fullWidth
                    style={{ fontWeight: 700, boxShadow: '0 4px 14px rgba(59, 130, 246, 0.35)' }}
                    data-testid="btn-enroll-course"
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

      {/* Transaction & Order Confirmation Modal */}
      <Modal
        opened={confirmModalOpened}
        onClose={closeConfirmModal}
        title={
          <Group gap="xs">
            <IconCreditCard size={22} color="#2563eb" />
            <Title order={4} fw={800} style={{ color: '#0f172a' }}>
              অর্ডার কনফার্মেশন ও পেমেন্ট বিবরণ
            </Title>
          </Group>
        }
        centered
        radius="lg"
        size="md"
        transitionProps={{ duration: 0 }}
      >
        <Stack gap="md">
          {/* Course Summary Snippet */}
          <Paper p="sm" radius="md" style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <Group align="center" gap="sm">
              <ThemeIcon size={40} radius="md" color="blue" variant="light">
                <IconBooks size={22} />
              </ThemeIcon>
              <div style={{ flex: 1 }}>
                <Text size="xs" c="dimmed">নির্বাচিত কোর্স:</Text>
                <Text size="sm" fw={700} style={{ color: '#0f172a' }}>{course.title}</Text>
              </div>
            </Group>
          </Paper>

          {/* Invoice / Pricing Breakdown Table */}
          <Paper p="md" radius="md" withBorder>
            <Stack gap="xs">
              <Text size="xs" fw={700} c="dimmed" tt="uppercase">
                পেমেন্ট রসিদ বিবরণ (Bill Breakdown)
              </Text>

              <Table verticalSpacing={6}>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td>
                      <Text size="sm">কোর্স ফি (Original Price)</Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text size="sm" fw={600}>
                        ৳{rawPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </Text>
                    </Table.Td>
                  </Table.Tr>

                  {isReferralValid && (
                    <Table.Tr style={{ color: '#0d9488' }}>
                      <Table.Td>
                        <Group gap={6}>
                          <Text size="sm" fw={600}>রেফারাল ডিসকাউন্ট ({buyerDiscountPct}%)</Text>
                          <Badge size="xs" color="teal" variant="filled">{appliedReferralCode}</Badge>
                        </Group>
                      </Table.Td>
                      <Table.Td style={{ textAlign: 'right' }}>
                        <Text size="sm" fw={700}>
                          -৳{discountAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  )}

                  <Table.Tr style={{ borderTop: '2px solid #e2e8f0' }}>
                    <Table.Td>
                      <Text size="md" fw={800} style={{ color: '#0f172a' }}>
                        সর্বমোট প্রদেয় (Payable Total)
                      </Text>
                    </Table.Td>
                    <Table.Td style={{ textAlign: 'right' }}>
                      <Text size="lg" fw={900} style={{ color: '#2563eb' }}>
                        ৳{finalPayable.toLocaleString('en-US', { minimumFractionDigits: 2 })} {currency}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Stack>
          </Paper>

          {/* SSLCommerz Gateway Notice */}
          <Alert color="blue" radius="md" icon={<IconLock size={18} />}>
            <Text size="xs" fw={500}>
              <b>SSLCommerz</b> এর মাধ্যমে বিকাশ (bKash), নগদ (Nagad), রকেট (Rocket), ভিসা/মাস্টারকার্ড অথবা যেকোনো ব্যাংকিং চ্যানেলে নিরাপদে পেমেন্ট সম্পন্ন করতে পারবেন।
            </Text>
          </Alert>

          {/* Action Buttons */}
          <Group justify="flex-end" gap="sm" mt="xs">
            <Button variant="default" onClick={closeConfirmModal} disabled={isCheckingOut || isRedirecting}>
              বাতিল
            </Button>
            <Button
              color="blue"
              leftSection={<IconCreditCard size={18} />}
              loading={isCheckingOut || isRedirecting}
              onClick={handleConfirmCheckout}
              data-testid="btn-proceed-sslcommerz"
            >
              পেমেন্ট এগিয়ে যান (Pay with SSLCommerz)
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
