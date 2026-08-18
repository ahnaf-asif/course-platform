'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to detect if Developer Tools (DevTools) is opened in the browser.
 * Uses window outer/inner dimension differential and performance timing traps.
 */
export function useDevToolsDetector(onOpen?: () => void): boolean {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isDevToolsOpen = false;

    const checkDevTools = () => {
      // 1. Dimension Differential Threshold (docked DevTools)
      const widthDiff = window.outerWidth - window.innerWidth > 160;
      const heightDiff = window.outerHeight - window.innerHeight > 160;

      // 2. Timing trap for undocked or docked DevTools (console.table/dir getter trap)
      const element = new Image();
      let getterTriggered = false;
      Object.defineProperty(element, 'id', {
        get: function () {
          getterTriggered = true;
          return 'devtools-detect';
        },
      });

      // Passing to console triggers getter in Chrome/Firefox/Safari if DevTools is open
      // We use a harmless log that executes the getter
      // Note: we avoid spamming by checking getterTriggered
      console.debug(element);

      const detected = widthDiff || heightDiff || getterTriggered;

      if (detected && !isDevToolsOpen) {
        isDevToolsOpen = true;
        setIsOpen(true);
        onOpen?.();
      } else if (!detected && isDevToolsOpen) {
        // Optional reset if closed
        // isDevToolsOpen = false;
        // setIsOpen(false);
      }
    };

    // Initial check and periodic poll
    checkDevTools();
    const interval = setInterval(checkDevTools, 800);
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
      if (
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) ||
        (e.metaKey && e.altKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c' || e.key === 'U' || e.key === 'u')) ||
        (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S'))
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
  }, [onOpen]);

  return isOpen;
}
