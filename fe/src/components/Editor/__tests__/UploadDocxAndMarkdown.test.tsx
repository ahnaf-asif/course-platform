import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@/test/test-utils';
import React from 'react';
import type { Editor } from '@tiptap/react';
import { UploadDocxButton } from '../UploadDocxButton';
import { UploadMarkdownButton } from '../UploadMarkdownButton';
import { handleDocxUpload } from '../uploadDocx';
import { handleMarkdownUpload, transformMathSyntaxToHtml, uploadBase64ImagesInHtml } from '../uploadMarkdown';
import mammoth from 'mammoth';
import { marked } from 'marked';
import { notifications } from '@mantine/notifications';

vi.mock('mammoth', () => ({
  default: {
    convertToHtml: vi.fn(),
    images: {
      imgElement: vi.fn((fn) => fn),
    },
  },
}));

vi.mock('marked', () => ({
  marked: {
    parse: vi.fn(),
  },
}));

vi.mock('../uploadImage', () => ({
  uploadImageFileToStorage: vi.fn().mockResolvedValue('/media-api/p/mocked_image.png'),
}));

vi.mock('@mantine/notifications', () => ({
  notifications: {
    show: vi.fn().mockReturnValue('mock-notif-id'),
    update: vi.fn(),
  },
}));

describe('UploadDocx and UploadMarkdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleDocxUpload', () => {
    it('returns null if file is null', async () => {
      const result = await handleDocxUpload(null);
      expect(result).toBeNull();
    });

    it('converts docx arrayBuffer to html and sets editor content', async () => {
      const mockSetContent = vi.fn();
      const mockEditor = {
        commands: {
          setContent: mockSetContent,
        },
      } as unknown as Editor;

      const mockFile = new File(['fake docx content'], 'lecture.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      vi.mocked(mammoth.convertToHtml).mockResolvedValue({
        value: '<h1>Parsed DOCX Header</h1><p>Lesson text from Word</p>',
        messages: [],
      });

      const html = await handleDocxUpload(mockFile, mockEditor);

      expect(html).toBe('<h1>Parsed DOCX Header</h1><p>Lesson text from Word</p>');
      expect(mockSetContent).toHaveBeenCalledWith('<h1>Parsed DOCX Header</h1><p>Lesson text from Word</p>');
      expect(notifications.update).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'DOCX ফাইল আপলোড সফল',
          color: 'green',
        })
      );
    });

    it('shows error notification when docx conversion fails', async () => {
      const mockFile = new File(['corrupted'], 'corrupted.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      vi.mocked(mammoth.convertToHtml).mockRejectedValue(new Error('Corrupted zip archive'));

      const html = await handleDocxUpload(mockFile);

      expect(html).toBeNull();
      expect(notifications.update).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'DOCX ফাইল লোড ব্যর্থ',
          color: 'red',
        })
      );
    });
  });

  describe('handleMarkdownUpload', () => {
    it('returns null if file is null', async () => {
      const result = await handleMarkdownUpload(null);
      expect(result).toBeNull();
    });

    it('converts markdown text to html and sets editor content', async () => {
      const mockSetContent = vi.fn();
      const mockEditor = {
        commands: {
          setContent: mockSetContent,
        },
      } as unknown as Editor;

      const mockFile = new File(['# Markdown Title\n\n**Bold Text**'], 'notes.md', {
        type: 'text/markdown',
      });

      vi.mocked(marked.parse).mockResolvedValue('<h1>Markdown Title</h1><p><strong>Bold Text</strong></p>');

      const html = await handleMarkdownUpload(mockFile, mockEditor);

      expect(html).toBe('<h1>Markdown Title</h1><p><strong>Bold Text</strong></p>');
      expect(mockSetContent).toHaveBeenCalledWith('<h1>Markdown Title</h1><p><strong>Bold Text</strong></p>');
      expect(notifications.update).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Markdown ফাইল আপলোড সফল',
          color: 'green',
        })
      );
    });

    it('shows error notification when markdown parsing fails', async () => {
      const mockFile = new File(['error'], 'error.md', {
        type: 'text/markdown',
      });

      vi.mocked(marked.parse).mockRejectedValue(new Error('Parse error'));

      const html = await handleMarkdownUpload(mockFile);

      expect(html).toBeNull();
      expect(notifications.update).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Markdown ফাইল লোড ব্যর্থ',
          color: 'red',
        })
      );
    });
  });

  describe('UploadDocxButton Component', () => {
    it('renders button with label and icon', () => {
      render(<UploadDocxButton label="Import DOCX Document" />);
      expect(screen.getByText('Import DOCX Document')).toBeInTheDocument();
      expect(screen.getByTestId('upload-docx-button')).toBeInTheDocument();
    });
  });

  describe('UploadMarkdownButton Component', () => {
    it('renders button with label and icon', () => {
      render(<UploadMarkdownButton label="Import Markdown File" />);
      expect(screen.getByText('Import Markdown File')).toBeInTheDocument();
      expect(screen.getByTestId('upload-markdown-button')).toBeInTheDocument();
    });
  });

  describe('transformMathSyntaxToHtml', () => {
    it('transforms inline $...$ and display $$...$$ into math span elements', () => {
      const raw = 'Formula: $E=mc^2$ and display: $$\\int_0^1 x dx$$';
      const transformed = transformMathSyntaxToHtml(raw);

      expect(transformed).toContain('data-type="math"');
      expect(transformed).toContain('data-latex="E=mc^2"');
      expect(transformed).toContain('data-latex="\\int_0^1 x dx"');
    });

    it('ignores plain currency values like $100', () => {
      const raw = 'Price: $100 and $25.50';
      const transformed = transformMathSyntaxToHtml(raw);

      expect(transformed).toBe('Price: $100 and $25.50');
    });
  });

  describe('uploadBase64ImagesInHtml', () => {
    it('replaces base64 data URIs with storage URLs', async () => {
      const htmlWithBase64 = '<p>Test</p><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=" alt="dot" />';
      const result = await uploadBase64ImagesInHtml(htmlWithBase64);

      expect(result).toContain('src="/media-api/p/mocked_image.png"');
      expect(result).not.toContain('data:image/png;base64');
    });
  });
});
