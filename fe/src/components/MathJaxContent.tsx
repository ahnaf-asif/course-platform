'use client';

import { useEffect, useRef } from 'react';
import { Box } from '@mantine/core';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathJaxContentProps {
  html: string;
}

export function MathJaxContent({ html }: MathJaxContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Instantly render math nodes with KaTeX (replaces raw $latex$ with crisp math glyphs)
    const mathElements = containerRef.current.querySelectorAll<HTMLElement>(
      'span[data-type="math"], span.math, span.math-inline, span.math-display, div[data-type="math"]'
    );

    mathElements.forEach((el) => {
      const latex =
        el.getAttribute('data-latex') ||
        el.textContent?.replace(/^\$+|\$+$/g, '').trim() ||
        '';

      if (latex) {
        try {
          const isDisplay =
            el.tagName.toLowerCase() === 'div' ||
            el.classList.contains('math-display') ||
            (el.textContent || '').startsWith('$$');

          katex.render(latex, el, {
            throwOnError: false,
            displayMode: isDisplay,
          });
        } catch (e) {
          console.error('KaTeX rendering error:', e);
        }
      }
    });

    // 2. Typeset any additional TeX/MathML equations if MathJax is active
    if (typeof window !== 'undefined' && window.MathJax) {
      window.MathJax.typesetPromise?.([containerRef.current]);
    }
  }, [html]);

  return (
    <>
      <style>{`
        .mathjax-content {
          font-family: inherit;
          color: #1e293b;
          font-size: 15px;
          line-height: 1.75;
          word-break: break-word;
        }
        .mathjax-content h1 {
          font-size: 1.65rem;
          font-weight: 800;
          color: #0f172a;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          line-height: 1.3;
        }
        .mathjax-content h2 {
          font-size: 1.35rem;
          font-weight: 700;
          color: #1e293b;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
          line-height: 1.35;
        }
        .mathjax-content h3 {
          font-size: 1.15rem;
          font-weight: 700;
          color: #334155;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }
        .mathjax-content h4, .mathjax-content h5, .mathjax-content h6 {
          font-size: 1.05rem;
          font-weight: 600;
          color: #475569;
          margin-top: 0.75rem;
          margin-bottom: 0.25rem;
        }
        .mathjax-content p {
          margin-top: 0;
          margin-bottom: 1rem;
        }
        .mathjax-content strong, .mathjax-content b {
          font-weight: 700;
          color: #0f172a;
        }
        .mathjax-content em, .mathjax-content i {
          font-style: italic;
        }
        .mathjax-content u {
          text-decoration: underline;
        }
        .mathjax-content s {
          text-decoration: line-through;
        }
        .mathjax-content ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-top: 0.25rem;
          margin-bottom: 1rem;
        }
        .mathjax-content ol {
          list-style-type: decimal;
          padding-left: 1.5rem;
          margin-top: 0.25rem;
          margin-bottom: 1rem;
        }
        .mathjax-content li {
          margin-bottom: 0.35rem;
        }
        .mathjax-content blockquote {
          border-left: 4px solid #3b82f6;
          background-color: #f8fafc;
          padding: 0.75rem 1rem;
          margin: 1rem 0;
          border-radius: 0 6px 6px 0;
          color: #475569;
          font-style: italic;
        }
        .mathjax-content pre {
          background-color: #0f172a;
          color: #f8fafc;
          padding: 1rem;
          border-radius: 8px;
          overflow-x: auto;
          margin: 1rem 0;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 13.5px;
          line-height: 1.5;
        }
        .mathjax-content code {
          background-color: #f1f5f9;
          color: #0f172a;
          padding: 0.15rem 0.35rem;
          border-radius: 4px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 13.5px;
        }
        .mathjax-content pre code {
          background-color: transparent;
          color: inherit;
          padding: 0;
        }
        .mathjax-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
          font-size: 14px;
        }
        .mathjax-content th, .mathjax-content td {
          border: 1px solid #e2e8f0;
          padding: 0.6rem 0.8rem;
          text-align: left;
        }
        .mathjax-content th {
          background-color: #f8fafc;
          font-weight: 700;
          color: #0f172a;
        }
        .mathjax-content tr:nth-child(even) {
          background-color: #fbfcfe;
        }
        .mathjax-content img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 1rem 0;
          display: block;
        }
        .mathjax-content a {
          color: #2563eb;
          text-decoration: underline;
        }
        .mathjax-content hr {
          border: none;
          border-top: 1px solid #e2e8f0;
          margin: 1.5rem 0;
        }
        .mathjax-content mark {
          background-color: #fef08a;
          padding: 0.1rem 0.25rem;
          border-radius: 2px;
        }
      `}</style>
      <Box 
        ref={containerRef} 
        dangerouslySetInnerHTML={{ __html: html }} 
        className="mathjax-content"
        data-testid="mathjax-content-container"
      />
    </>
  );
}
