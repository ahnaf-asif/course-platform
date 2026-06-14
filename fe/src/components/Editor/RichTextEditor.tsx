'use client';

import { useEffect, useRef } from 'react';
import { RichTextEditor } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import Highlight from '@tiptap/extension-highlight';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Superscript from '@tiptap/extension-superscript';
import SubScript from '@tiptap/extension-subscript';
import ImageResize from 'tiptap-extension-resize-image';
import { MathExtension } from './extensions/MathExtension';
import { IconMathFunction, IconPhoto } from '@tabler/icons-react';
import { Stack, Text, Box, FileButton, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import axios from 'axios';

interface EditorProps {
  content?: string;
  onChange: (content: string) => void;
  label?: string;
  minHeight?: string | number;
  compact?: boolean;
}

export default function CustomRichTextEditor({ content, onChange, label, minHeight = 400, compact }: EditorProps) {
  const fileInputRef = useRef<() => void>(null);
  
  const editor = useEditor({
    extensions: [
      StarterKit,
      Superscript,
      SubScript,
      Highlight,
      MathExtension,
      ImageResize.configure({
        HTMLAttributes: {
          style: 'border-radius: 4px; display: inline-block;',
        },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: content || '',
    immediatelyRender: false,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
  });

  // Re-run MathJax when content changes
  const editorHtml = editor?.getHTML();
  useEffect(() => {
    if (typeof window !== 'undefined' && window.MathJax) {
      window.MathJax.typesetPromise?.();
    }
  }, [editorHtml]);

  // Handle external content changes (e.g. form reset or initial load)
  useEffect(() => {
    if (editor && content !== undefined && content !== editor.getHTML()) {
      // Use queueMicrotask to avoid React warning: flushSync was called from inside a lifecycle method
      queueMicrotask(() => {
        editor.commands.setContent(content || '');
      });
    }
  }, [content, editor]);

  const addMath = () => {
    const latex = window.prompt('Enter LaTeX formula (e.g. f_x, E=mc^2):', '');
    if (latex !== null && latex.trim() !== '') {
      editor?.chain().focus().setMath({ latex }).run();
    }
  };

  const handleImageUpload = async (file: File | null) => {
    if (!file) return;

    // Check if it's an image
    if (!file.type.startsWith('image/')) {
      notifications.show({
        title: 'Invalid file',
        message: 'Please upload an image file.',
        color: 'red',
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const id = notifications.show({
      loading: true,
      title: 'Uploading image',
      message: 'Please wait...',
      autoClose: false,
      withCloseButton: false,
    });

    try {
      // Use the proxied /media-api route with public visibility
      const response = await axios.post('/media-api/upload?visibility=public', formData, {
        headers: {
          'X-API-KEY': 'secret-api-key',
          'Content-Type': 'multipart/form-data',
        },
      });

      // Get the public URL from response
      const imageUrl = response.data.public_url;
      
      // If we are in local dev outside docker, we might need to point to localhost:8081
      // but the proxy /media-api/p/ is actually safer for the browser to load without CORS issues
      const proxiedUrl = response.data.public_url.replace('http://localhost:8081/api/v1', '/media-api');

      if (editor) {
        editor.chain().focus().setImage({ src: proxiedUrl }).run();
      }

      notifications.update({
        id,
        color: 'green',
        title: 'Success',
        message: 'Image uploaded and inserted',
        loading: false,
        autoClose: 2000,
      });
    } catch (error: any) {
      console.error('Image upload error:', error);
      notifications.update({
        id,
        color: 'red',
        title: 'Upload failed',
        message: error.response?.data?.message || error.message,
        loading: false,
        autoClose: 5000,
      });
    }
  };

  return (
    <Stack gap={5}>
      {label && <Text size="sm" fw={500}>{label}</Text>}
      <Box bg="gray.1" p={compact ? 'xs' : 'xl'} style={{ borderRadius: '4px', border: '1px solid var(--mantine-color-gray-3)' }}>
        <RichTextEditor 
          editor={editor}
          styles={{
            root: { border: 'none', backgroundColor: 'transparent' },
            toolbar: { 
              border: '1px solid var(--mantine-color-gray-3)', 
              borderRadius: '8px',
              marginBottom: compact ? '10px' : '20px',
              backgroundColor: 'white',
              position: 'sticky',
              top: 0,
              zIndex: 10,
              boxShadow: 'var(--mantine-shadow-sm)',
              padding: compact ? '4px' : '8px',
            },
            content: { 
              backgroundColor: 'white',
              maxWidth: compact ? '100%' : '850px',
              margin: '0 auto',
              minHeight: typeof minHeight === 'number' ? `${minHeight}px` : minHeight,
              padding: compact ? '10px 15px' : '40px 60px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              borderRadius: '2px',
              border: '1px solid var(--mantine-color-gray-2)',
            }
          }}
        >
          <RichTextEditor.Toolbar>
            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Bold />
              <RichTextEditor.Italic />
              <RichTextEditor.Underline />
              <RichTextEditor.Strikethrough />
              <RichTextEditor.ClearFormatting />
              <RichTextEditor.Highlight />
              <RichTextEditor.Code />
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.H1 />
              <RichTextEditor.H2 />
              <RichTextEditor.H3 />
              <RichTextEditor.H4 />
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Blockquote />
              <RichTextEditor.Hr />
              <RichTextEditor.BulletList />
              <RichTextEditor.OrderedList />
              <RichTextEditor.Subscript />
              <RichTextEditor.Superscript />
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Link />
              <RichTextEditor.Unlink />
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.AlignLeft />
              <RichTextEditor.AlignCenter />
              <RichTextEditor.AlignJustify />
              <RichTextEditor.AlignRight />
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Control
                onClick={addMath}
                aria-label="Insert Math"
                title="Insert Math"
              >
                <IconMathFunction size={16} stroke={1.5} />
              </RichTextEditor.Control>

              <FileButton onChange={handleImageUpload} accept="image/png,image/jpeg,image/gif,image/webp">
                {(props) => (
                  <RichTextEditor.Control
                    {...props}
                    aria-label="Upload Image"
                    title="Upload Image"
                  >
                    <IconPhoto size={16} stroke={1.5} />
                  </RichTextEditor.Control>
                )}
              </FileButton>
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Undo />
              <RichTextEditor.Redo />
            </RichTextEditor.ControlsGroup>
          </RichTextEditor.Toolbar>

          <RichTextEditor.Content />
        </RichTextEditor>
      </Box>
    </Stack>
  );
}
