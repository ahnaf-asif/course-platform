'use client';

import { useEffect, useState } from 'react';

/**
 * Checks if DevTools is open via window dimension differentials.
 * When DevTools is docked (right, bottom, left), the inner vs outer delta exceeds 160px.
 */
export function isDevToolsOpenSync(): boolean {
  if (typeof window === 'undefined') return false;

  const threshold = 160;
  const widthDiff = window.outerWidth - window.innerWidth > threshold;
  const heightDiff = window.outerHeight - window.innerHeight > threshold;

  return widthDiff || heightDiff;
}

/**
 * Hook to continuously monitor if Developer Tools (DevTools) is open.
 * Dispatches state changes to hide sensitive content when open and restore when closed.
 */
export function useDevToolsDetector(onChange?: (isOpen: boolean) => void): boolean {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkDevTools = () => {
      const detected = isDevToolsOpenSync();

      setIsOpen((prev) => {
        if (prev !== detected) {
          onChange?.(detected);
        }
        return detected;
      });
    };

    // Initial check
    checkDevTools();
    const interval = setInterval(checkDevTools, 500);
    window.addEventListener('resize', checkDevTools);

    // Block keyboard shortcuts for DevTools & View Source globally on the page
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12' || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+I / Cmd+Option+I (Inspect)
      // Ctrl+Shift+J / Cmd+Option+J (Console)
      // Ctrl+Shift+C / Cmd+Option+C (Inspect Element)
      // Ctrl+U / Cmd+Option+U (View Source)
      const key = e.key.toLowerCase();
      if (
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(key)) ||
        (e.metaKey && e.altKey && ['i', 'j', 'c', 'u'].includes(key)) ||
        (e.ctrlKey && ['u', 's'].includes(key))
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Block context menu globally on the window
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    window.addEventListener('contextmenu', handleContextMenu, { capture: true });

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', checkDevTools);
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
    };
  }, [onChange]);

  return isOpen;
}
