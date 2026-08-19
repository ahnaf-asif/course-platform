'use client';

import React, { useState } from 'react';
import { FileButton, Button, ButtonProps } from '@mantine/core';
import { IconFileTypeDocx } from '@tabler/icons-react';
import type { Editor } from '@tiptap/react';
import { handleDocxUpload } from './uploadDocx';

export interface UploadDocxButtonProps extends Omit<ButtonProps, 'onChange'> {
  editor?: Editor | null;
  onContentParsed?: (html: string) => void;
  label?: string;
}

/**
 * UploadDocxButton: Standalone Mantine button to upload and parse .docx files into HTML.
 */
export function UploadDocxButton({
  editor,
  onContentParsed,
  label = 'DOCX আপলোড করুন',
  ...buttonProps
}: UploadDocxButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const onFileChange = async (file: File | null) => {
    if (!file) return;
    setIsLoading(true);
    try {
      const html = await handleDocxUpload(file, editor);
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
      accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    >
      {(props) => (
        <Button
          {...props}
          variant="light"
          color="blue"
          size="xs"
          loading={isLoading}
          leftSection={<IconFileTypeDocx size={16} />}
          data-testid="upload-docx-button"
          {...buttonProps}
        >
          {label}
        </Button>
      )}
    </FileButton>
  );
}
