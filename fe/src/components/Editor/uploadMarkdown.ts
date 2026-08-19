import { marked } from 'marked';
import type { Editor } from '@tiptap/react';
import { notifications } from '@mantine/notifications';

/**
 * Reads a markdown (.md / .markdown) file, converts markdown text to semantic HTML, and loads it into the editor.
 */
export async function handleMarkdownUpload(file: File | null, editor?: Editor | null): Promise<string | null> {
  if (!file) return null;

  try {
    const text = await file.text();
    const html = await marked.parse(text);

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
