'use client';

import { Card, Image, Box, Group, Text, Badge, Button, Menu, ActionIcon } from '@mantine/core';
import { IconPhoto, IconEdit, IconDotsVertical, IconExternalLink, IconTrash } from '@tabler/icons-react';
import Link from 'next/link';
import { CourseResponse } from '@/api/model/components-schemas-course/courseResponse';

interface CourseCardProps {
  course: CourseResponse;
  onEditSettings: (course: CourseResponse) => void;
  onDelete: (id: string) => void;
}

export function CourseCard({ course, onEditSettings, onDelete }: CourseCardProps) {
  return (
    <Card shadow="sm" padding="lg" radius="md" withBorder>
      <Card.Section>
        {course.thumbnail_url ? (
          <Image
            src={course.thumbnail_url}
            height={160}
            alt={course.title}
            fallbackSrc="https://placehold.co/600x400?text=No+Thumbnail"
          />
        ) : (
          <Box
            h={160}
            bg="gray.1"
            display="flex"
            style={{ alignItems: 'center', justifyContent: 'center' }}
          >
            <IconPhoto size={48} color="gray" />
          </Box>
        )}
      </Card.Section>

      <Group justify="space-between" mt="md" mb="xs">
        <Text fw={500} truncate="end" style={{ flex: 1 }}>
          {course.title}
        </Text>
        <Badge color={course.is_published ? 'green' : 'gray'} variant="light">
          {course.is_published ? 'Published' : 'Draft'}
        </Badge>
      </Group>

      <Text size="xs" c="dimmed" mb="xs" style={{ fontStyle: 'italic' }}>
        slug: {course.slug}
      </Text>

      <Text size="sm" c="dimmed" lineClamp={2} mb="md" h={40}>
        {course.description}
      </Text>

      <Group gap="xs" mt="auto">
        <Button
          component={Link}
          href={`/admin/courses/${course.slug || course.id}/curriculum`}
          variant="light"
          style={{ flex: 1 }}
          leftSection={<IconEdit size={16} />}
        >
          Edit Content
        </Button>

        <Menu shadow="md" width={200} position="bottom-end">
          <Menu.Target>
            <ActionIcon variant="subtle" size="lg" aria-label="Course Options">
              <IconDotsVertical size={20} />
            </ActionIcon>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Label>Actions</Menu.Label>
            <Menu.Item
              leftSection={<IconExternalLink size={14} />}
              component={Link}
              href={'/courses/s/' + course.slug}
              target="_blank"
            >
              View Public Page
            </Menu.Item>
            <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => onEditSettings(course)}>
              Edit Settings
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item
              color="red"
              leftSection={<IconTrash size={14} />}
              onClick={() => onDelete(course.id)}
            >
              Delete Course
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Card>
  );
}
