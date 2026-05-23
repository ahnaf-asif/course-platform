'use client';

import { Title, Text, Container } from '@mantine/core';

export default function UserDashboard() {
  return (
    <Container>
      <Title>Welcome to the Dashboard</Title>
      <Text size="lg" mt="md">
        Authentication is working correctly.
      </Text>
    </Container>
  );
}
