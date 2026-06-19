import Highlight from '@tiptap/extension-highlight';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Superscript from '@tiptap/extension-superscript';
import SubScript from '@tiptap/extension-subscript';
import ImageResize from 'tiptap-extension-resize-image';
import { MathExtension } from './extensions/MathExtension';

export const editorExtensions = [
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
];
