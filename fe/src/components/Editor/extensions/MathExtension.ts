import { Node, mergeAttributes, InputRule, nodePasteRule } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import MathNodeView from './MathNodeView';

export interface MathOptions {
  HTMLAttributes: Record<string, string | number | boolean>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    math: {
      setMath: (options: { latex: string }) => ReturnType;
    };
  }
}

export const MathExtension = Node.create<MathOptions>({
  name: 'math',
  group: 'inline',
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: '',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="math"]',
        getAttrs: (element) => ({
          latex: (element as HTMLElement).getAttribute('data-latex') || (element as HTMLElement).textContent?.replace(/^\$+|\$+$/g, '') || '',
        }),
      },
      {
        tag: 'span.math',
        getAttrs: (element) => ({
          latex: (element as HTMLElement).getAttribute('data-latex') || (element as HTMLElement).textContent?.replace(/^\$+|\$+$/g, '') || '',
        }),
      },
      {
        tag: 'span.math-inline',
        getAttrs: (element) => ({
          latex: (element as HTMLElement).textContent?.replace(/^\$+|\$+$/g, '') || '',
        }),
      },
      {
        tag: 'span.math-display',
        getAttrs: (element) => ({
          latex: (element as HTMLElement).textContent?.replace(/^\$+|\$+$/g, '') || '',
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span', 
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { 
        'data-type': 'math',
        'data-latex': HTMLAttributes.latex 
      }), 
      `$${HTMLAttributes.latex}$` 
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathNodeView);
  },

  addInputRules() {
    return [
      // Matches block $$equation$$ typed directly in the editor and cleanly replaces the range
      new InputRule({
        find: /(?:^|\s)\$\$([^$]+)\$\$$/,
        handler: ({ chain, range, match }) => {
          const latex = match[1]?.trim();
          if (!latex) return;

          const start = range.from + (match[0].startsWith(' ') ? 1 : 0);
          const end = range.to;

          chain()
            .deleteRange({ from: start, to: end })
            .insertContentAt(start, { type: this.name, attrs: { latex } })
            .run();
        },
      }),
      // Matches inline $equation$ typed directly in the editor and cleanly replaces the range
      new InputRule({
        find: /(?:^|\s)\$([^$]+)\$$/,
        handler: ({ chain, range, match }) => {
          const latex = match[1]?.trim();
          if (!latex || /^\d+(\.\d+)?$/.test(latex)) return;

          const start = range.from + (match[0].startsWith(' ') ? 1 : 0);
          const end = range.to;

          chain()
            .deleteRange({ from: start, to: end })
            .insertContentAt(start, { type: this.name, attrs: { latex } })
            .run();
        },
      }),
    ];
  },

  addPasteRules() {
    return [
      // Automatically parses pasted $equation$ or $$equation$$ into interactive math nodes
      nodePasteRule({
        find: /\$\$([^$]+?)\$\$/g,
        type: this.type,
        getAttributes: (match) => {
          return { latex: match[1]?.trim() || '' };
        },
      }),
      nodePasteRule({
        find: /(?:^|[^\\])\$([^$\n\r]+?)\$/g,
        type: this.type,
        getAttributes: (match) => {
          const formula = match[1]?.trim() || '';
          if (!formula || /^\d+(\.\d+)?$/.test(formula)) {
            return null; // Ignore plain dollar currency like $100
          }
          return { latex: formula };
        },
      }),
    ];
  },

  addCommands() {
    return {
      setMath:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
