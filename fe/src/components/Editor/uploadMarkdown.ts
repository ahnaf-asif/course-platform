import { marked } from 'marked';
import type { Editor } from '@tiptap/react';
import { notifications } from '@mantine/notifications';

/**
 * Converts inline $...$ and display $$...$$ LaTeX syntax to <span data-type="math"> tags
 * so Tiptap / KaTeX can parse and render them natively.
 */
export function transformMathSyntaxToHtml(raw: string): string {
  if (!raw) return raw;
  // Convert display math $$...$$
  let transformed = raw.replace(/\$\$([\s\S]+?)\$\$/g, (_match, formula) => {
    const clean = formula.trim();
    return `<span data-type="math" data-latex="${clean.replace(/"/g, '&quot;')}">$$${clean}$$</span>`;
  });
  // Convert inline math $...$ (avoiding currency like $100, trailing digits, or empty $$)
  transformed = transformed.replace(/(?<!\$)\$(?!\$)(?!\s)([^$\n\r]+?)(?<!\s)(?<!\$)\$(?!\$)(?!\d)/g, (_match, formula) => {
    const clean = formula.trim();
    if (/^\d+(\.\d+)?$/.test(clean)) {
      return `$${formula}$`;
    }
    return `<span data-type="math" data-latex="${clean.replace(/"/g, '&quot;')}">$${clean}$</span>`;
  });
  return transformed;
}

/**
 * Reads a markdown (.md / .markdown) file, converts markdown text to semantic HTML, and loads it into the editor.
 */
export async function handleMarkdownUpload(file: File | null, editor?: Editor | null): Promise<string | null> {
  if (!file) return null;

  try {
    const text = await file.text();
    const parsedHtml = await marked.parse(text);
    const html = transformMathSyntaxToHtml(parsedHtml);

    if (editor) {
      editor.commands.setContent(html);
    }

    notifications.show({
      title: 'Markdown ফাইল আপলোড সফল',
      message: `${file.name} ফাইলটি এডিটরে লোড করা হয়েছে।`,
      color: 'green',
    });

    return html;
  } catch (error) {
    console.error('Failed to parse Markdown file:', error);
    notifications.show({
      title: 'Markdown ফাইল লোড ব্যর্থ',
      message: 'ফাইলটি প্রসেস করা সম্ভব হয়নি। অনুগ্রহ করে একটি বৈধ .md ফাইল নির্বাচন করুন।',
      color: 'red',
    });
    return null;
  }
}
