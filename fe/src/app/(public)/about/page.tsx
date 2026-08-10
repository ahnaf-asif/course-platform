'use client';

import {
  Container,
  Title,
  Text,
  Stack,
  SimpleGrid,
  ThemeIcon,
  Card,
  Button,
  Box,
  Badge,
  Image,
} from '@mantine/core';
import {
  IconTarget,
  IconFlame,
  IconCertificate,
  IconSchool,
  IconArrowRight,
} from '@tabler/icons-react';
import Link from 'next/link';

export default function AboutPage() {
  const values = [
    {
      icon: IconTarget,
      title: 'গোছানো সিলেবাস',
      description: 'প্রিলিমিনারির বিশাল সিলেবাসকে সহজ ও বোধগম্য চ্যাপ্টারে বিভক্ত করে সাজানো হয়েছে।',
      color: 'blue',
    },
    {
      icon: IconFlame,
      title: 'নিয়মিত আপডেট',
      description: 'নতুন তথ্য ও সাম্প্রতিক বিষয়াবলি নিয়মিত কারিকুলাম ও নোটসে যুক্ত করা হয়।',
      color: 'orange',
    },
    {
      icon: IconSchool,
      title: 'লাইভ মডেল টেস্ট',
      description: 'নেগেটিভ মার্কিং সহ আসল বিসিএস পরীক্ষার অনুকরণে নিয়মিত মডেল টেস্ট নেওয়ার ব্যবস্থা।',
      color: 'indigo',
    },
    {
      icon: IconCertificate,
      title: 'পারফরম্যান্স রিপোর্ট',
      description: 'অন্যান্য পরীক্ষার্থীদের সাপেক্ষে আপনার মেরিট পজিশন ও দুর্বল বিষয় শনাক্তের স্মার্ট অ্যানালাইসিস।',
      color: 'teal',
    },
  ];

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
            আমাদের সম্পর্কে
          </Badge>
          <Title order={1} style={{ fontSize: 'clamp(28px, 6vw, 44px)', fontWeight: 900 }}>
            বিসিএস প্রিলিমিনারি প্রস্তুতির আধুনিক প্ল্যাটফর্ম
          </Title>
          <Text size="lg" style={{ color: 'var(--mantine-color-gray-4)', lineHeight: 1.6, maxWidth: '640px', margin: '16px auto 0' }}>
            EduVerse হলো বিসিএস প্রিলি পরীক্ষার্থীদের জন্য তৈরি একটি বিশেষায়িত লার্নিং প্ল্যাটফর্ম, যেখানে সেরা ক্যাডার মেন্টরদের গাইডলাইনে পুঙ্খানুপুঙ্খ সিলেবাস কভার করা হয়।
          </Text>
        </Container>
      </Box>

      {/* Main Story Content */}
      <Container size="xl" py={{ base: '28px', md: '60px' }}>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing={{ base: '24px', md: '50px' }}>
          <Stack gap="lg">
            <Title order={2} style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 800 }}>
              আমাদের লক্ষ্য ও ভিশন
            </Title>
            <Text style={{ lineHeight: 1.7 }} size="md" c="gray.7">
              EduVerse প্রতিষ্ঠা করা হয়েছে বিসিএস প্রিলিমিনারি পরীক্ষার্থীদের সঠিক ও গোছানো গাইডলাইন প্রদানের লক্ষ্যে। আমরা বিশ্বাস করি এলোমেলো পড়াশোনার চেয়ে স্ট্রাকচার্ড সিলেবাস ও নিয়মিত মডেল টেস্টই প্রিলিতে সাফল্যের চাবিকাঠি।
            </Text>
            <Text style={{ lineHeight: 1.7 }} size="md" c="gray.7">
              বিষয়ভিত্তিক ভিডিও লেকচার, অধ্যায়ভিত্তিক কুইজ, নেগেটিভ মার্কিং সহ লাইভ প্রিলি মডেল টেস্ট এবং পারফরম্যান্স অ্যানালাইসিসের মাধ্যমে আমরা পরীক্ষার্থীদের দুর্বল দিকগুলো চিহ্নিত করতে সাহায্য করি।
            </Text>
            <Text style={{ lineHeight: 1.7 }} size="md" c="gray.7">
              আজ হাজার হাজার বিসিএস পরীক্ষার্থী আমাদের প্ল্যাটফর্ম ব্যবহার করে প্রতিদিন তাদের প্রস্তুতি যাচাই করছেন এবং স্বপ্নের ক্যাডার ক্যারিয়ারের দিকে এগিয়ে যাচ্ছেন।
            </Text>
          </Stack>

          <Box style={{ display: 'flex', alignItems: 'center' }}>
            <Image
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=600&q=80"
              alt="BCS Aspirants Studying"
              radius="lg"
              style={{ boxShadow: 'var(--mantine-shadow-lg)', width: '100%' }}
            />
          </Box>
        </SimpleGrid>
      </Container>

      {/* Core Values Section */}
      <Box style={{ backgroundColor: '#fafbfc', borderTop: '1px solid #f1f3f5', borderBottom: '1px solid #f1f3f5' }} py={{ base: '32px', md: '70px' }}>
        <Container size="xl">
          <Stack align="center" mb={{ base: '24px', md: '50px' }} gap="xs">
            <Badge variant="light" color="blue" size="md">
              মূল বৈশিষ্ট্যসমূহ
            </Badge>
            <Title order={2} style={{ fontSize: 'clamp(24px, 4vw, 32px)', fontWeight: 800 }}>
              আমাদের কাজের মূল নীতি
            </Title>
            <Text c="dimmed" size="md" style={{ maxWidth: '600px', textAlign: 'center' }}>
              এই নীতিগুলোর ওপর ভিত্তি করে আমরা প্রতিটি কোর্স কারিকুলাম ও ফিচার তৈরি করে থাকি।
            </Text>
          </Stack>

          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
            {values.map((v, i) => (
              <Card key={i} shadow="xs" padding="lg" radius="md" withBorder style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: 'white' }}>
                <ThemeIcon size={48} radius="md" color={v.color} variant="light" mb="md">
                  <v.icon size={24} />
                </ThemeIcon>
                <Text fw={800} style={{ fontSize: '18px' }} mb="xs">
                  {v.title}
                </Text>
                <Text size="sm" c="dimmed" style={{ lineHeight: 1.6, fontSize: '14px' }}>
                  {v.description}
                </Text>
              </Card>
            ))}
          </SimpleGrid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box
        py={{ base: '36px', md: '70px' }}
        style={{
          background: 'linear-gradient(135deg, #1c7ed6 0%, #7300e6 100%)',
          color: 'white',
          textAlign: 'center',
        }}
      >
        <Container size="md">
          <Stack gap="md" align="center">
            <Title order={2} style={{ fontSize: 'clamp(26px, 5vw, 36px)', fontWeight: 800 }}>
              আজই আপনার প্রিলি প্রস্তুতি শুরু করুন
            </Title>
            <Text size="lg" style={{ opacity: 0.85, maxWidth: '600px', lineHeight: 1.6 }}>
              আমাদের কোর্সগুলো এক্সপ্লোর করুন এবং সেরা মেন্টরদের তত্ত্বাবধানে আপনার বিসিএস প্রিলিমিনারি প্রস্তুতি সম্পন্ন করুন।
            </Text>
            <Button
              size="xl"
              variant="white"
              color="blue"
              mt="md"
              component={Link}
              href="/courses"
              rightSection={<IconArrowRight size={20} />}
              style={{ fontWeight: 700 }}
            >
              কোর্সসমূহ দেখুন
            </Button>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}
