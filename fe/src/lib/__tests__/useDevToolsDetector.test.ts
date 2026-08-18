import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDevToolsDetector } from '../useDevToolsDetector';

describe('useDevToolsDetector Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks F12 and inspection keyboard shortcuts', () => {
    renderHook(() => useDevToolsDetector());

    const f12Event = new KeyboardEvent('keydown', { key: 'F12', cancelable: true });
    window.dispatchEvent(f12Event);
    expect(f12Event.defaultPrevented).toBe(true);

    const inspectEvent = new KeyboardEvent('keydown', {
      key: 'I',
      ctrlKey: true,
      shiftKey: true,
      cancelable: true,
    });
    window.dispatchEvent(inspectEvent);
    expect(inspectEvent.defaultPrevented).toBe(true);

    const viewSourceEvent = new KeyboardEvent('keydown', {
      key: 'u',
      ctrlKey: true,
      cancelable: true,
    });
    window.dispatchEvent(viewSourceEvent);
    expect(viewSourceEvent.defaultPrevented).toBe(true);
  });

  it('blocks global context menu events on the window', () => {
    renderHook(() => useDevToolsDetector());

    const contextMenuEvent = new MouseEvent('contextmenu', { cancelable: true });
    window.dispatchEvent(contextMenuEvent);
    expect(contextMenuEvent.defaultPrevented).toBe(true);
  });

  it('triggers onOpen callback when DevTools dimension differential is detected', () => {
    const onOpen = vi.fn();

    // Mock window dimensions indicating DevTools is open (outer - inner > 160)
    Object.defineProperty(window, 'outerWidth', { value: 1200, writable: true });
    Object.defineProperty(window, 'innerWidth', { value: 900, writable: true });

    renderHook(() => useDevToolsDetector(onOpen));

    expect(onOpen).toHaveBeenCalled();
  });
});
