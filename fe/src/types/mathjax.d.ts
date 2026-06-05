interface MathJaxType {
  typesetPromise: (elements?: unknown[]) => Promise<void>;
}

declare global {
  interface Window {
    MathJax: MathJaxType;
  }
}

export {};
