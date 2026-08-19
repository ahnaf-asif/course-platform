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
    },
  }),
  TableRow,
  TableHeader,
  TableCell,
  ImageResize.configure({
    HTMLAttributes: {
      style: 'border-radius: 4px; display: inline-block;',
    },
  }),
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
];
