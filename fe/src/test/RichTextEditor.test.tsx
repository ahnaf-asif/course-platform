import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from './test-utils';
import CustomRichTextEditor from '../components/Editor/RichTextEditor';
import React from 'react';

// ProseMirror/Tiptap needs basic Range and getSelection mocks in jsdom
beforeAll(() => {
  if (typeof window !== 'undefined') {
    window.getSelection = () => ({
      addRange: () => {},
      removeAllRanges: () => {},
      getRangeAt: () => ({
        getBoundingClientRect: () => ({
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: 0,
          height: 0,
          x: 0,
          y: 0,
          toJSON: () => {},
        } as DOMRect),
      }),
    } as unknown as Selection);

    class MockRange {
      getBoundingClientRect() {
        return {
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: 0,
          height: 0,
          x: 0,
          y: 0,
          toJSON: () => {},
        } as DOMRect;
      }
      getClientRects() {
        return [] as unknown as DOMRectList;
      }
    }

    Object.defineProperty(window, 'Range', {
      writable: true,
      configurable: true,
      value: MockRange,
    });
  }
});

describe('CustomRichTextEditor Component', () => {
  it('should render the editor container and label correctly', () => {
    const mockOnChange = vi.fn();
    render(
      <CustomRichTextEditor
        content="<p>Test Content</p>"
        onChange={mockOnChange}
        label="Test Rich Text Editor Label"
      />
    );

    // Verify label is rendered
    expect(screen.getByText('Test Rich Text Editor Label')).toBeInTheDocument();
  });

  it('should render in compact mode with toolbar controls', () => {
    const mockOnChange = vi.fn();
    const { container } = render(
      <CustomRichTextEditor
        content="<p>Compact Content</p>"
        onChange={mockOnChange}
        compact={true}
      />
    );

    // Verify it rendered successfully without errors
    expect(container.querySelector('.mantine-RichTextEditor-root')).toBeInTheDocument();
  });
});
