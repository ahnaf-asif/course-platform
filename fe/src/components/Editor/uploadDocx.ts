import mammoth from 'mammoth';
import type { Editor } from '@tiptap/react';
import { notifications } from '@mantine/notifications';
import { uploadImageFileToStorage } from './uploadImage';
import { transformMathSyntaxToHtml } from './uploadMarkdown';

/**
 * Reads a .docx file, extracts text, tables, and embedded images (uploading images to MinIO),
 * and loads the formatted content into the editor.
 */
export async function handleDocxUpload(file: File | null, editor?: Editor | null): Promise<string | null> {
  if (!file) return null;

  const notifId = notifications.show({
    loading: true,
    title: 'DOCX ফাইল প্রসেস করা হচ্ছে...',
    message: `${file.name} ফাইলটি লোড ও ইমেজ আপলোড করা হচ্ছে...`,
    autoClose: false,
    withCloseButton: false,
  });

  try {
    const arrayBuffer = await file.arrayBuffer();

    const options = {
      convertImage: mammoth.images.imgElement(async (image) => {
        try {
          const base64 = await image.read('base64');
          const contentType = image.contentType || 'image/png';
          
          // Convert base64 string to Blob
          const byteCharacters = atob(base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: contentType });
          const extension = contentType.split('/')[1] || 'png';
          const fileName = `docx_img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${extension}`;

          const storageUrl = await uploadImageFileToStorage(blob, fileName);
          return { src: storageUrl };
        } catch (imgErr) {
          console.warn('Could not upload embedded docx image to storage, using base64 fallback:', imgErr);
          const base64 = await image.read('base64');
          return { src: `data:${image.contentType || 'image/png'};base64,${base64}` };
        }
      }),
    };

    const result = await mammoth.convertToHtml({ arrayBuffer }, options);
    const html = transformMathSyntaxToHtml(result.value);

    if (editor) {
      editor.commands.setContent(html);
    }

    notifications.update({
      id: notifId,
      title: 'DOCX ফাইল আপলোড সফল',
      message: `${file.name} এর টেবিল, টেক্সট ও ইমেজ এডিটরে লোড করা হয়েছে।`,
      color: 'green',
      loading: false,
      autoClose: 3000,
    });

    return html;
  } catch (error) {
    console.error('Failed to parse DOCX file:', error);
    notifications.update({
      id: notifId,
      title: 'DOCX ফাইল লোড ব্যর্থ',
      message: 'ফাইলটি প্রসেস করা সম্ভব হয়নি। অনুগ্রহ করে একটি বৈধ .docx ফাইল নির্বাচন করুন।',
      color: 'red',
      loading: false,
      autoClose: 4000,
    });
    return null;
  }
}
