'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAuthContext } from '@/context/AuthContext';

export interface WatermarkOverlayProps {
  variant?: 'video' | 'reading';
  onTamper?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function WatermarkOverlay({
  variant = 'reading',
  onTamper,
  className,
  style,
}: WatermarkOverlayProps) {
  const { userEmail } = useAuthContext();
  const watermarkRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamic position coordinates for video mode (top %, left %)
  const [videoCoords, setVideoCoords] = useState({ top: 20, left: 25 });

  const watermarkText = userEmail || 'EduVerse Protected Content';

  // Video mode: randomly shift coordinates every 18-24 seconds
  useEffect(() => {
    if (variant !== 'video') return;

    const interval = setInterval(() => {
      const randomTop = Math.floor(Math.random() * 65) + 10; // 10% - 75%
      const randomLeft = Math.floor(Math.random() * 60) + 10; // 10% - 70%
      setVideoCoords({ top: randomTop, left: randomLeft });
    }, 20000);

    return () => clearInterval(interval);
  }, [variant]);

  // MutationObserver Tamper Guard: detects removal or style hiding in DevTools
  useEffect(() => {
    if (!onTamper || typeof window === 'undefined') return;

    const targetNode = watermarkRef.current;
    const parentNode = targetNode?.parentElement;

    if (!targetNode || !parentNode) return;

    const checkTamper = () => {
      if (!watermarkRef.current || !watermarkRef.current.isConnected) {
        onTamper();
        return;
      }

      const computed = window.getComputedStyle(watermarkRef.current);
      const isHidden =
        computed.display === 'none' ||
        computed.visibility === 'hidden' ||
        parseFloat(computed.opacity || '1') < 0.01;

      if (isHidden) {
        onTamper();
      }
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          for (let i = 0; i < mutation.removedNodes.length; i++) {
            const removed = mutation.removedNodes[i];
            if (removed === targetNode || (removed instanceof HTMLElement && removed.contains(targetNode))) {
              onTamper();
              return;
            }
          }
        } else if (mutation.type === 'attributes') {
          checkTamper();
        }
      }
    });

    // Observe parent for node removal and target for attribute tampering
    observer.observe(parentNode, { childList: true, subtree: true });
    observer.observe(targetNode, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });

    // Periodic heartbeat integrity check
    const heartbeatInterval = setInterval(checkTamper, 3000);

    return () => {
      observer.disconnect();
      clearInterval(heartbeatInterval);
    };
  }, [onTamper]);

  if (variant === 'video') {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 15,
          overflow: 'hidden',
          ...style,
        }}
        data-testid="video-watermark-container"
      >
        <div
          ref={watermarkRef}
          data-testid="video-watermark"
          style={{
            position: 'absolute',
            top: `${videoCoords.top}%`,
            left: `${videoCoords.left}%`,
            transform: 'translate(-50%, -50%)',
            transition: 'top 1.2s ease, left 1.2s ease',
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '6px',
            padding: '4px 10px',
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.5px',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        >
          {watermarkText}
        </div>
      </div>
    );
  }

  // Reading Notes Variant: subtle repeating SVG pattern background spanning 100% of height and width
  const svgPattern = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="360" height="200" viewBox="0 0 360 200"><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" transform="rotate(-25 180 100)" fill="rgba(100,116,139,0.12)" font-family="sans-serif" font-size="13px" font-weight="700" letter-spacing="1px">${encodeURIComponent(watermarkText)}</text></svg>`;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        minHeight: '100%',
        pointerEvents: 'none',
        zIndex: 20,
        overflow: 'hidden',
        ...style,
      }}
      data-testid="reading-watermark-container"
    >
      <div
        ref={watermarkRef}
        data-testid="reading-watermark"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          backgroundImage: `url("${svgPattern}")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '360px 200px',
          pointerEvents: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        <span style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0 }}>
          {watermarkText}
        </span>
      </div>
    </div>
  );
}
