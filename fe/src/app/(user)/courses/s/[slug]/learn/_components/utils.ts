import { CourseTreeResponse } from '@/api/model/components-schemas-curriculum/courseTreeResponse';

export interface ExtendedNode extends CourseTreeResponse {
  children: ExtendedNode[];
}

export function parseHTMLContent(content: string): string {
  if (typeof window === 'undefined') return content;
  if (
    content.includes('&lt;') ||
    content.includes('&gt;') ||
    content.includes('&quot;') ||
    content.includes('&#39;')
  ) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    return doc.documentElement.textContent || content;
  }
  return content;
}
