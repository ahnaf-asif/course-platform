'use client';

import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useEffect, useRef } from 'react';
import { Box, Tooltip } from '@mantine/core';

export default function MathNodeView(props: NodeViewProps) {
  const { node, updateAttributes, selected } = props;
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(node.attrs.latex || '', containerRef.current, {
          throwOnError: false,
          displayMode: false,
        });
      } catch (e) {
        console.error('KaTeX rendering error:', e);
      }
    }
  }, [node.attrs.latex]);

  const handleClick = () => {
    const newLatex = window.prompt('Edit LaTeX:', node.attrs.latex);
    if (newLatex !== null) {
      updateAttributes({ latex: newLatex });
    }
  };

  return (
    <NodeViewWrapper className="math-node" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <Tooltip label="Click to edit formula" position="top" withArrow>
        <Box
          component="span"
          ref={containerRef}
          onClick={handleClick}
          style={{
            cursor: 'pointer',
            padding: '2px 4px',
            borderRadius: '4px',
            backgroundColor: selected ? 'var(--mantine-color-blue-1)' : 'transparent',
            border: selected ? '1px solid var(--mantine-color-blue-4)' : '1px solid transparent',
            transition: 'all 0.1s ease',
          }}
        />
      </Tooltip>
    </NodeViewWrapper>
  );
}
