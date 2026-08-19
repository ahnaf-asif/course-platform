'use client';

import React, { useState } from 'react';
import { FileButton, Button, ButtonProps } from '@mantine/core';
import { IconMarkdown } from '@tabler/icons-react';
import type { Editor } from '@tiptap/react';
import { handleMarkdownUpload } from './uploadMarkdown';

export interface UploadMarkdownButtonProps extends Omit<ButtonProps, 'onChange'> {
  editor?: Editor | null;
  onContentParsed?: (html: string) => void;
  label?: string;
}

/**
 * UploadMarkdownButton: Standalone Mantine button to upload and parse .md markdown files into HTML.
 */
export function UploadMarkdownButton({
  editor,
  onContentParsed,
  label = 'Markdown আপলোড করুন',
  ...buttonProps
}: UploadMarkdownButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const onFileChange = async (file: File | null) => {
    if (!file) return;
    setIsLoading(true);
    try {
      const html = await handleMarkdownUpload(file, editor);
      if (html && onContentParsed) {
        onContentParsed(html);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FileButton
      onChange={onFileChange}
      accept=".md,.markdown,text/markdown,text/plain"
    >
      {(props) => (
        <Button
          {...props}
          variant="light"
          color="gray"
          size="xs"
          loading={isLoading}
          leftSection={<IconMarkdown size={16} />}
          data-testid="upload-markdown-button"
          {...buttonProps}
        >
          {label}
        </Button>
      )}
    </FileButton>
  );
}
