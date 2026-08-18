'use client';

import { useEffect, useState } from 'react';

/**
 * Synchronously checks if DevTools is already open at the moment of component evaluation/mount.
 * Prevents initial render of sensitive HTML content when transitioning between pages.
 */
export function isDevToolsOpenSync(): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Dimension Differential Threshold (Docked bottom, right, left)
  const widthDiff = window.outerWidth - window.innerWidth > 160;
  const heightDiff = window.outerHeight - window.innerHeight > 160;
  if (widthDiff || heightDiff) return true;

  // 2. Regex / Object getter evaluation trap
  let getterFired = false;
  const reg = /./;
  reg.toString = function () {
    getterFired = true;
    return 'devtools-check';
  };
  console.debug('%c', reg);
  if (getterFired) return true;

  return false;
}

/**
 * Hook to continuously detect if Developer Tools (DevTools) is opened in the browser.
 * Uses dimension checks, regex toString getters, debugger timing traps, and global shortcut blockers.
 */
export function useDevToolsDetector(onOpen?: () => void): boolean {
  const [isOpen, setIsOpen] = useState(() => isDevToolsOpenSync());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isDevToolsOpen = false;

    const checkDevTools = () => {
      // 1. Dimension Differential Threshold (docked DevTools)
      const widthDiff = window.outerWidth - window.innerWidth > 160;
      const heightDiff = window.outerHeight - window.innerHeight > 160;

      // 2. Timing trap for undocked or docked DevTools (console getter trap)
      let getterTriggered = false;
      const reg = /./;
      reg.toString = function () {
        getterTriggered = true;
        return 'trap';
      };
      console.debug('%c', reg);

      // 3. Debugger timing evaluation trap (catches undocked DevTools / active inspectors)
      let debuggerDelayed = false;
      const t0 = performance.now();
      debugger;
      if (performance.now() - t0 > 100) {
        debuggerDelayed = true;
      }

      const detected = widthDiff || heightDiff || getterTriggered || debuggerDelayed;

      if (detected && !isDevToolsOpen) {
        isDevToolsOpen = true;
        setIsOpen(true);
        onOpen?.();
      }
    };

    // Immediate check
    checkDevTools();
    const interval = setInterval(checkDevTools, 400);
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
