'use client';

import { Box } from '@mantine/core';
import HeroSection from './_components/HeroSection';
import CoursesSection from './_components/CoursesSection';
import FeaturesSection from './_components/FeaturesSection';
import CTASection from './_components/CTASection';

export default function Homepage() {
  return (
    <Box style={{ overflow: 'hidden' }}>
      <HeroSection />
      <CoursesSection />
      <FeaturesSection />
      <CTASection />
    </Box>
  );
}
