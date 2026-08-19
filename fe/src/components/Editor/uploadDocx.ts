import mammoth from 'mammoth';
import type { Editor } from '@tiptap/react';
import { notifications } from '@mantine/notifications';

/**
 * Reads a .docx file and converts its formatting to semantic HTML, then updates the editor content.
 */
export async function handleDocxUpload(file: File | null, editor?: Editor | null): Promise<string | null> {
  if (!file) return null;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = result.value;

    if (editor) {
      editor.commands.setContent(html);
    }

    notifications.show({
      title: 'DOCX ফাইল আপলোড সফল',
      message: `${file.name} ফাইলটি এডিটরে লোড করা হয়েছে।`,
      color: 'green',
    });

    return html;
  } catch (error) {
    console.error('Failed to parse DOCX file:', error);
    notifications.show({
      title: 'DOCX ফাইল লোড ব্যর্থ',
      message: 'ফাইলটি প্রসেস করা সম্ভব হয়নি। অনুগ্রহ করে একটি বৈধ .docx ফাইল নির্বাচন করুন।',
      color: 'red',
    });
    return null;
  }
}
