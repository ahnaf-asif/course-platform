'use client';

import { useEffect } from 'react';
import { RichTextEditor } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import { IconMathFunction, IconPhoto, IconFileTypeDocx, IconMarkdown, IconTable } from '@tabler/icons-react';
import { Stack, Text, Box, FileButton } from '@mantine/core';
import { editorExtensions } from './editorExtensions';
import { handleImageUpload } from './uploadImage';
import { handleDocxUpload } from './uploadDocx';
import { handleMarkdownUpload, transformMathSyntaxToHtml } from './uploadMarkdown';

interface EditorProps {
  content?: string;
  onChange: (content: string) => void;
  label?: string;
  minHeight?: string | number;
  compact?: boolean;
}

export default function CustomRichTextEditor({ content, onChange, label, minHeight = 400, compact }: EditorProps) {
  const editor = useEditor({
    extensions: editorExtensions,
    content: transformMathSyntaxToHtml(content || ''),
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
        const transformed = transformMathSyntaxToHtml(content || '');
        editor.commands.setContent(transformed);
      });
    }
  }, [content, editor]);

  const addMath = () => {
    const latex = window.prompt('Enter LaTeX formula (e.g. f_x, E=mc^2):', '');
    if (latex !== null && latex.trim() !== '') {
      editor?.chain().focus().setMath({ latex }).run();
    }
  };

  const addTable = () => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const onImageUpload = (file: File | null) => {
    handleImageUpload(file, editor);
  };

  const onDocxUpload = (file: File | null) => {
    handleDocxUpload(file, editor);
  };

  const onMarkdownUpload = (file: File | null) => {
    handleMarkdownUpload(file, editor);
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

              <RichTextEditor.Control
                onClick={addTable}
                aria-label="Insert Table"
                title="Insert Table"
                data-testid="editor-insert-table"
              >
                <IconTable size={16} stroke={1.5} />
              </RichTextEditor.Control>

              <FileButton onChange={onImageUpload} accept="image/png,image/jpeg,image/gif,image/webp">
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

              <FileButton onChange={onDocxUpload} accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document">
                {(props) => (
                  <RichTextEditor.Control
                    {...props}
                    aria-label="Upload DOCX Document"
                    title="Upload DOCX Document"
                    data-testid="editor-upload-docx"
                  >
                    <IconFileTypeDocx size={16} stroke={1.5} />
                  </RichTextEditor.Control>
                )}
              </FileButton>

              <FileButton onChange={onMarkdownUpload} accept=".md,.markdown,text/markdown,text/plain">
                {(props) => (
                  <RichTextEditor.Control
                    {...props}
                    aria-label="Upload Markdown File"
                    title="Upload Markdown File"
                    data-testid="editor-upload-markdown"
                  >
                    <IconMarkdown size={16} stroke={1.5} />
                  </RichTextEditor.Control>
                )}
              </FileButton>
            </RichTextEditor.ControlsGroup>

            <RichTextEditor.ControlsGroup>
              <RichTextEditor.Undo />
              <RichTextEditor.Redo />
            </RichTextEditor.ControlsGroup>
          </RichTextEditor.Toolbar>

          <style>{`
            .editor-table {
              border-collapse: collapse;
              table-layout: fixed;
              width: 100%;
              margin: 1rem 0;
              overflow: hidden;
            }
            .editor-table td, .editor-table th {
              min-width: 1em;
              border: 1px solid #cbd5e1;
              padding: 8px 12px;
              vertical-align: top;
              box-sizing: border-box;
              position: relative;
            }
            .editor-table th {
              font-weight: 700;
              text-align: left;
              background-color: #f1f5f9;
              color: #0f172a;
            }
            .editor-table .selectedCell:after {
              z-index: 2;
              position: absolute;
              content: "";
              left: 0; right: 0; top: 0; bottom: 0;
              background: rgba(200, 200, 255, 0.4);
              pointer-events: none;
            }
          `}</style>

          <RichTextEditor.Content />
        </RichTextEditor>
      </Box>
    </Stack>
  );
}

