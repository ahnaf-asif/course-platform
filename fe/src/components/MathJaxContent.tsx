'use client';

import { useEffect, useRef } from 'react';
import { Box } from '@mantine/core';

interface MathJaxContentProps {
  html: string;
}

export function MathJaxContent({ html }: MathJaxContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && typeof window !== 'undefined' && window.MathJax) {
      window.MathJax.typesetPromise?.([containerRef.current]);
    }
  }, [html]);

  return (
    <Box 
      ref={containerRef} 
      dangerouslySetInnerHTML={{ __html: html }} 
      className="mathjax-content"
      style={{ lineHeight: 1.6 }}
    />
  );
}
