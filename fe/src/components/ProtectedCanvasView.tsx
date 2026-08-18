'use client';

import React, { useEffect, useRef } from 'react';
import { Box } from '@mantine/core';

interface ProtectedCanvasViewProps {
  content: string;
  userEmail?: string | null;
  className?: string;
}

interface TextBlock {
  type: 'h1' | 'h2' | 'h3' | 'p' | 'li' | 'hr';
  text: string;
}

/**
 * Parses raw HTML / text into structured layout blocks.
 */
function parseContentToBlocks(html: string): TextBlock[] {
  if (typeof window === 'undefined') return [];

  const temp = document.createElement('div');
  temp.innerHTML = html;

  const blocks: TextBlock[] = [];

  const traverse = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      const tagName = el.tagName.toLowerCase();

      if (tagName === 'h1') {
        blocks.push({ type: 'h1', text: el.textContent?.trim() || '' });
      } else if (tagName === 'h2') {
        blocks.push({ type: 'h2', text: el.textContent?.trim() || '' });
      } else if (tagName === 'h3') {
        blocks.push({ type: 'h3', text: el.textContent?.trim() || '' });
      } else if (tagName === 'hr') {
        blocks.push({ type: 'hr', text: '' });
      } else if (tagName === 'li') {
        blocks.push({ type: 'li', text: el.textContent?.trim() || '' });
      } else if (tagName === 'p') {
        const text = el.textContent?.trim() || '';
        if (text) {
          blocks.push({ type: 'p', text });
        }
      } else if (tagName === 'div' || tagName === 'section' || tagName === 'article') {
        for (let i = 0; i < el.childNodes.length; i++) {
          traverse(el.childNodes[i]);
        }
      } else {
        const text = el.textContent?.trim() || '';
        if (text && el.parentElement === temp) {
          blocks.push({ type: 'p', text });
        }
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text && node.parentElement === temp) {
        blocks.push({ type: 'p', text });
      }
    }
  };

  for (let i = 0; i < temp.childNodes.length; i++) {
    traverse(temp.childNodes[i]);
  }

  if (blocks.length === 0 && html.trim()) {
    const clean = html.replace(/<[^>]*>?/gm, '').trim();
    if (clean) {
      blocks.push({ type: 'p', text: clean });
    }
  }

  return blocks;
}

/**
 * Wraps text into lines that fit within maxWidth on Canvas 2D context.
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length > 0 ? lines : [text];
}

/**
 * ProtectedCanvasView: Renders lecture notes into a high-DPI Canvas element.
 * In DevTools Elements panel, there are ZERO HTML text nodes to copy.
 */
export function ProtectedCanvasView({
  content,
  userEmail,
  className,
}: ProtectedCanvasViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || typeof window === 'undefined') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const blocks = parseContentToBlocks(content);
    const dpr = window.devicePixelRatio || 2;
    const containerWidth = container.clientWidth || 800;
    const padding = 24;
    const contentWidth = containerWidth - padding * 2;

    // First pass: measure total required height
    ctx.font = '16px "Hind Siliguri", "Segoe UI", sans-serif';
    let totalHeight = padding * 2;

    for (const block of blocks) {
      if (block.type === 'h1') {
        ctx.font = 'bold 24px "Hind Siliguri", "Segoe UI", sans-serif';
        const lines = wrapText(ctx, block.text, contentWidth);
        totalHeight += lines.length * 34 + 20;
      } else if (block.type === 'h2') {
        ctx.font = 'bold 20px "Hind Siliguri", "Segoe UI", sans-serif';
        const lines = wrapText(ctx, block.text, contentWidth);
        totalHeight += lines.length * 28 + 16;
      } else if (block.type === 'h3') {
        ctx.font = 'bold 18px "Hind Siliguri", "Segoe UI", sans-serif';
        const lines = wrapText(ctx, block.text, contentWidth);
        totalHeight += lines.length * 26 + 14;
      } else if (block.type === 'hr') {
        totalHeight += 24;
      } else if (block.type === 'li') {
        ctx.font = '16px "Hind Siliguri", "Segoe UI", sans-serif';
        const lines = wrapText(ctx, block.text, contentWidth - 24);
        totalHeight += lines.length * 26 + 8;
      } else {
        ctx.font = '16px "Hind Siliguri", "Segoe UI", sans-serif';
        const lines = wrapText(ctx, block.text, contentWidth);
        totalHeight += lines.length * 28 + 14;
      }
    }

    totalHeight = Math.max(totalHeight, 300);

    // Set canvas dimensions with DPR scaling for Retina displays
    canvas.width = containerWidth * dpr;
    canvas.height = totalHeight * dpr;
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${totalHeight}px`;

    ctx.scale(dpr, dpr);

    // Background fill
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, containerWidth, totalHeight);

    // Draw repeating subtle watermark directly on canvas pixels
    const stamp = userEmail || 'EduVerse Protected Content';
    ctx.save();
    ctx.fillStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.font = '15px sans-serif';
    ctx.rotate((-25 * Math.PI) / 180);

    for (let x = -totalHeight; x < containerWidth * 2; x += 260) {
      for (let y = -containerWidth; y < totalHeight * 2; y += 140) {
        ctx.fillText(stamp, x, y);
      }
    }
    ctx.restore();

    // Draw typography blocks
    let currentY = padding + 20;

    for (const block of blocks) {
      if (block.type === 'h1') {
        ctx.font = 'bold 24px "Hind Siliguri", "Segoe UI", sans-serif';
        ctx.fillStyle = '#0f172a';
        const lines = wrapText(ctx, block.text, contentWidth);
        for (const line of lines) {
          ctx.fillText(line, padding, currentY);
          currentY += 34;
        }
        currentY += 10;
      } else if (block.type === 'h2') {
        ctx.font = 'bold 20px "Hind Siliguri", "Segoe UI", sans-serif';
        ctx.fillStyle = '#1e293b';
        const lines = wrapText(ctx, block.text, contentWidth);
        for (const line of lines) {
          ctx.fillText(line, padding, currentY);
          currentY += 28;
        }
        currentY += 8;
      } else if (block.type === 'h3') {
        ctx.font = 'bold 18px "Hind Siliguri", "Segoe UI", sans-serif';
        ctx.fillStyle = '#334155';
        const lines = wrapText(ctx, block.text, contentWidth);
        for (const line of lines) {
          ctx.fillText(line, padding, currentY);
          currentY += 26;
        }
        currentY += 6;
      } else if (block.type === 'hr') {
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, currentY);
        ctx.lineTo(padding + contentWidth, currentY);
        ctx.stroke();
        currentY += 24;
      } else if (block.type === 'li') {
        ctx.font = '16px "Hind Siliguri", "Segoe UI", sans-serif';
        ctx.fillStyle = '#334155';
        // Draw bullet dot
        ctx.beginPath();
        ctx.arc(padding + 6, currentY - 5, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#3b82f6';
        ctx.fill();
        ctx.fillStyle = '#334155';

        const lines = wrapText(ctx, block.text, contentWidth - 24);
        for (let idx = 0; idx < lines.length; idx++) {
          ctx.fillText(lines[idx], padding + 20, currentY);
          currentY += 26;
        }
        currentY += 4;
      } else {
        ctx.font = '16px "Hind Siliguri", "Segoe UI", sans-serif';
        ctx.fillStyle = '#334155';
        const lines = wrapText(ctx, block.text, contentWidth);
        for (const line of lines) {
          ctx.fillText(line, padding, currentY);
          currentY += 28;
        }
        currentY += 8;
      }
    }
  }, [content, userEmail]);

  return (
    <Box
      ref={containerRef}
      className={className}
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      data-testid="protected-canvas-container"
    >
      <canvas
        ref={canvasRef}
        data-testid="protected-canvas-element"
        style={{
          display: 'block',
          maxWidth: '100%',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          pointerEvents: 'none',
        }}
      />
    </Box>
  );
}
