import React from 'react';
import { Box, Button, Card, Divider, Grid, Stack, Text, Title, Badge, Group, Container } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import { QuizResponse } from '@/api/model/components-schemas-assessment/quizResponse';

interface QuizListProps {
  quizzesData: QuizResponse[];
  setActiveQuizId: (id: string | null) => void;
}

export function QuizList({ quizzesData, setActiveQuizId }: QuizListProps) {
  return (
    <Box py={{ base: 'md', md: 'xl' }} px={{ base: 'xs', sm: 'md' }} style={{ width: '100%' }}>
      <Container size="md" px={{ base: 0, sm: 'md' }} style={{ maxWidth: '840px', width: '100%' }}>
        <Stack gap="xl">
          <Box px={{ base: 'md', sm: 0 }}>
            <Text
              size="xs"
              fw={700}
              c="blue.6"
              style={{ textTransform: 'uppercase', letterSpacing: '1px' }}
            >
              Assessments
            </Text>
            <Title order={1} size="h2" mt={4} style={{ fontWeight: 800 }}>
              Lesson Quizzes
            </Title>
            <Text c="dimmed" size="sm" mt="xs">
              Please complete the following quizzes to test your understanding of this lesson.
            </Text>
          </Box>

          <Divider />

          <Grid gap="md" px={{ base: 'md', sm: 0 }}>
            {quizzesData.map((quiz) => (
              <Grid.Col key={quiz.id} span={{ base: 12, sm: 6 }}>
                <Card
                  withBorder
                  radius="md"
                  p={{ base: 'md', sm: 'lg' }}
                  style={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <Stack gap="xs">
                    <Title order={3} size="h4">
                      {quiz.title}
                    </Title>
                    <Group gap="xs" style={{ display: 'flex', gap: '8px' }}>
                      <Badge color="blue" variant="light">
                        Passing score: {quiz.passing_score}%
                      </Badge>
                    </Group>
                  </Stack>
                  <Button
                    mt="xl"
                    fullWidth
                    onClick={() => setActiveQuizId(quiz.id)}
                    rightSection={<IconChevronRight size={16} />}
                  >
                    View Quiz
                  </Button>
                </Card>
              </Grid.Col>
            ))}
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
}


