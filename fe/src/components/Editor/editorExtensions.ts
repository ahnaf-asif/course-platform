import Highlight from '@tiptap/extension-highlight';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Superscript from '@tiptap/extension-superscript';
import SubScript from '@tiptap/extension-subscript';
import ImageResize from 'tiptap-extension-resize-image';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import { MathExtension } from './extensions/MathExtension';

export const editorExtensions = [
  StarterKit,
  Superscript,
  SubScript,
  Highlight,
  MathExtension,
  Table.configure({
    resizable: true,
    HTMLAttributes: {
      class: 'editor-table',
      style: 'border-collapse: collapse; width: 100%; border: 1px solid #94a3b8; margin: 1rem 0;',
    },
  }),
  TableRow,
  TableHeader.configure({
    HTMLAttributes: {
      style: 'border: 1px solid #94a3b8; padding: 8px 12px; background-color: #f1f5f9; font-weight: 700; text-align: left;',
    },
  }),
  TableCell.configure({
    HTMLAttributes: {
      style: 'border: 1px solid #94a3b8; padding: 8px 12px; min-width: 60px;',
    },
  }),
  ImageResize.configure({
    HTMLAttributes: {
      style: 'border-radius: 4px; display: inline-block;',
    },
  }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
];
