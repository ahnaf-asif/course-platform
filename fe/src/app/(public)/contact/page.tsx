'use client';

import {
  Container,
  Title,
  Text,
  Stack,
  SimpleGrid,
  Card,
  Group,
  Button,
  Box,
  Badge,
  TextInput,
  Textarea,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import {
  IconMail,
  IconPhone,
  IconMapPin,
  IconClock,
  IconSend,
} from '@tabler/icons-react';
import { useState } from 'react';
import axios from 'axios';

export default function ContactPage() {
  const [loading, setLoading] = useState(false);

  const form = useForm({
    initialValues: {
      name: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
    },
    validate: {
      name: (value) => (value.length < 2 ? 'কমপক্ষে ২ অক্ষর লিখুন' : null),
      email: (value) => (/^\S+@\S+\.\S+$/.test(value) ? null : 'সঠিক ইমেইল লিখুন'),
      subject: (value) => (value.length < 3 ? 'কমপক্ষে ৩ অক্ষর লিখুন' : null),
      message: (value) => (value.length < 10 ? 'কমপক্ষে ১০ অক্ষর লিখুন' : null),
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    setLoading(true);
    try {
      await axios.post('/api/contact', values);
      notifications.show({
        title: 'বার্তা পাঠানো হয়েছে!',
        message: `ধন্যবাদ ${values.name}, আপনার বার্তা আমাদের কাছে পৌঁছেছে। আমরা দ্রুত আপনার সাথে যোগাযোগ করব!`,
        color: 'green',
      });
      form.reset();
    } catch (error) {
      let message = 'বার্তা পাঠাতে সমস্যা হয়েছে। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।';
      if (axios.isAxiosError(error)) {
        message = error.response?.data?.message || message;
      }
      notifications.show({
        title: 'বার্তা পাঠানো ব্যর্থ',
        message,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const contactInfo = [
    {
      icon: IconMapPin,
      title: 'আমাদের ঠিকানা',
      details: 'ঢাকা, বাংলাদেশ',
    },
    {
      icon: IconMail,
      title: 'ইমেইল ঠিকানা',
      details: 'support@eduverse.com',
    },
    {
      icon: IconPhone,
      title: 'ফোন নম্বর',
      details: '+৮৮০ ১৭০০-০০০০০০',
    },
    {
      icon: IconClock,
      title: 'কার্যক্রমের সময়',
      details: 'শনিবার - বৃহস্পতিবার: সকাল ১০:০০ - রাত ৭:০০',
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
            যোগাযোগ
          </Badge>
          <Title order={1} style={{ fontSize: 'clamp(28px, 6vw, 44px)', fontWeight: 900 }}>
            আমাদের সাথে যোগাযোগ করুন
          </Title>
          <Text size="lg" style={{ color: 'var(--mantine-color-gray-4)', lineHeight: 1.6, maxWidth: '640px', margin: '16px auto 0' }}>
            কোর্স এনরোলমেন্ট, পেমেন্ট অথবা প্ল্যাটফর্ম সংক্রান্ত যে কোনো সহায়তার জন্য আমাদের বার্তা পাঠান অথবা সরাসরি যোগাযোগ করুন।
          </Text>
        </Container>
      </Box>

      {/* Contact Content Grid */}
      <Container size="xl" py={{ base: '28px', md: '60px' }}>
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing={{ base: '24px', md: '50px' }}>
          {/* Left Column: Form */}
          <Card shadow="sm" p={{ base: 'md', sm: 'xl' }} radius="md" withBorder style={{ backgroundColor: 'white' }}>
            <Title order={2} style={{ fontSize: 'clamp(22px, 4vw, 26px)', fontWeight: 800 }} mb="lg">
              আমাদের কাছে বার্তা পাঠান
            </Title>
            <form onSubmit={form.onSubmit(handleSubmit)}>
              <Stack gap="md">
                <TextInput
                  required
                  label="আপনার নাম"
                  placeholder="আপনার নাম লিখুন"
                  size="md"
                  {...form.getInputProps('name')}
                />
                <TextInput
                  required
                  label="ইমেইল ঠিকানা"
                  placeholder="your.email@example.com"
                  size="md"
                  {...form.getInputProps('email')}
                />
                <TextInput
                  label="ফোন নম্বর (ঐচ্ছিক)"
                  placeholder="+৮৮০ ১৭০০-০০০০০০"
                  size="md"
                  {...form.getInputProps('phone')}
                />
                <TextInput
                  required
                  label="বিষয়"
                  placeholder="কী বিষয়ে জানতে চান?"
                  size="md"
                  {...form.getInputProps('subject')}
                />
                <Textarea
                  required
                  label="বার্তা"
                  placeholder="আপনার প্রশ্ন বা মতামত বিস্তারিত লিখুন..."
                  minRows={5}
                  size="md"
                  {...form.getInputProps('message')}
                />
                <Button
                  type="submit"
                  size="md"
                  variant="gradient"
                  gradient={{ from: 'blue', to: 'violet' }}
                  leftSection={<IconSend size={18} />}
                  loading={loading}
                  mt="md"
                  style={{ fontWeight: 700 }}
                >
                  বার্তা পাঠান
                </Button>
              </Stack>
            </form>
          </Card>

          {/* Right Column: Contact Details & Info */}
          <Stack gap="xl" justify="center">
            <div>
              <Title order={2} style={{ fontSize: 'clamp(22px, 4vw, 26px)', fontWeight: 800 }} mb="sm">
                সরাসরি যোগাযোগ
              </Title>
              <Text c="dimmed" size="md" style={{ lineHeight: 1.6 }}>
                যেকোনো সময় নিচে দেওয়া ঠিকানা, ইমেইল বা ফোন নম্বরের মাধ্যমে আমাদের সাথে যোগাযোগ করতে পারেন। আমরা ২৪ কার্যঘণ্টার মধ্যে উত্তর দিয়ে থাকি।
              </Text>
            </div>

            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              {contactInfo.map((info, i) => (
                <Card key={i} shadow="xs" padding="md" radius="md" withBorder style={{ backgroundColor: 'white' }}>
                  <Group gap="sm" align="flex-start" wrap="nowrap">
                    <Box
                      style={{
                        padding: '10px',
                        backgroundColor: 'var(--mantine-color-blue-0)',
                        color: 'var(--mantine-color-blue-6)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <info.icon size={20} />
                    </Box>
                    <div>
                      <Text fw={700} size="sm">
                        {info.title}
                      </Text>
                      <Text size="xs" c="dimmed" mt="2px">
                        {info.details}
                      </Text>
                    </div>
                  </Group>
                </Card>
              ))}
            </SimpleGrid>

            {/* Mock map placeholder */}
            <Box
              style={{
                height: '180px',
                borderRadius: '12px',
                background: 'linear-gradient(45deg, #f1f3f5, #e9ecef)',
                border: '1px solid var(--mantine-color-gray-3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
              }}
            >
              <IconMapPin size={36} color="var(--mantine-color-blue-6)" />
              <Text fw={700} size="sm" c="gray.8" mt="xs">
                EduVerse ঢাকা ক্যাম্পাস
              </Text>
              <Text size="xs" c="dimmed">
                বনানী, রোড ১১, ঢাকা
              </Text>
            </Box>
          </Stack>
        </SimpleGrid>
      </Container>
    </Box>
  );
}
