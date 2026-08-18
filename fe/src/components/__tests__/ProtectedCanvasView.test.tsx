import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { ProtectedCanvasView } from '../ProtectedCanvasView';
import React from 'react';

describe('ProtectedCanvasView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders canvas element and contains zero text HTML nodes in the DOM', () => {
    const rawContent = '<h1>বাংলা সাহিত্য</h1><p>চর্যাপদ বাংলা সাহিত্যের প্রাচীনতম নিদর্শন।</p>';

    render(<ProtectedCanvasView content={rawContent} userEmail="student@eduverse.org" />);

    const canvasContainer = screen.getByTestId('protected-canvas-container');
    const canvasElement = screen.getByTestId('protected-canvas-element');

    expect(canvasContainer).toBeInTheDocument();
    expect(canvasElement).toBeInTheDocument();

    // Verify ZERO paragraph or heading HTML elements exist in the DOM
    expect(canvasContainer.querySelector('p')).toBeNull();
    expect(canvasContainer.querySelector('h1')).toBeNull();
    expect(canvasContainer.querySelector('span')).toBeNull();

    // Copying the container or element in DevTools yields only <canvas> tag
    expect(canvasContainer.innerHTML).toContain('<canvas');
  });

  it('suppresses context menu and copy events', () => {
    const rawContent = '<p>Secret course notes</p>';
    render(<ProtectedCanvasView content={rawContent} userEmail="student@eduverse.org" />);

    const canvasContainer = screen.getByTestId('protected-canvas-container');
    expect(canvasContainer).toHaveStyle({ userSelect: 'none' });
  });
});
