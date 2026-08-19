import { marked } from 'marked';
import type { Editor } from '@tiptap/react';
import { notifications } from '@mantine/notifications';
import { uploadImageFileToStorage } from './uploadImage';

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
 * Automatically uploads any base64 embedded data URI images found in HTML to MinIO storage.
 */
export async function uploadBase64ImagesInHtml(html: string): Promise<string> {
  const base64Regex = /<img[^>]+src=["'](data:image\/([a-zA-Z0-9+]+);base64,([^"']+))["'][^>]*>/g;
  let match;
  let updatedHtml = html;

  while ((match = base64Regex.exec(html)) !== null) {
    const fullDataUri = match[1];
    const mimeSubtype = match[2];
    const base64Data = match[3];

    try {
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: `image/${mimeSubtype}` });
      const fileName = `md_img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${mimeSubtype}`;

      const storageUrl = await uploadImageFileToStorage(blob, fileName);
      updatedHtml = updatedHtml.replace(fullDataUri, storageUrl);
    } catch (err) {
      console.warn('Failed to upload base64 image from markdown to MinIO:', err);
    }
  }

  return updatedHtml;
}

/**
 * Reads a markdown (.md / .markdown) file, converts markdown text to semantic HTML, and loads it into the editor.
 */
export async function handleMarkdownUpload(file: File | null, editor?: Editor | null): Promise<string | null> {
  if (!file) return null;

  const notifId = notifications.show({
    loading: true,
    title: 'Markdown ফাইল প্রসেস করা হচ্ছে...',
    message: `${file.name} ফাইলটি লোড ও ফরম্যাট করা হচ্ছে...`,
    autoClose: false,
    withCloseButton: false,
  });

  try {
    const text = await file.text();
    const parsedHtml = await marked.parse(text);
    const withImages = await uploadBase64ImagesInHtml(parsedHtml);
    const html = transformMathSyntaxToHtml(withImages);

    if (editor) {
      editor.commands.setContent(html);
    }

    notifications.update({
      id: notifId,
      title: 'Markdown ফাইল আপলোড সফল',
      message: `${file.name} এর টেবিল ও টেক্সট এডিটরে সফলভাবে লোড হয়েছে।`,
      color: 'green',
      loading: false,
      autoClose: 3000,
    });

    return html;
  } catch (error) {
    console.error('Failed to parse Markdown file:', error);
    notifications.update({
      id: notifId,
      title: 'Markdown ফাইল লোড ব্যর্থ',
      message: 'ফাইলটি প্রসেস করা সম্ভব হয়নি। অনুগ্রহ করে একটি বৈধ .md ফাইল নির্বাচন করুন।',
      color: 'red',
      loading: false,
      autoClose: 4000,
    });
    return null;
  }
}
