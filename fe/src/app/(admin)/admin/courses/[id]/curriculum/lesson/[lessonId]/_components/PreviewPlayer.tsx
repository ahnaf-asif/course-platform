'use client';

import { useState, useEffect, useRef } from 'react';
import { Center, Loader, Box, Text } from '@mantine/core';
import Hls from 'hls.js';
import { axiosInstance } from '@/lib/axios';

interface PreviewPlayerProps {
  videoId: string;
}

export function PreviewPlayer({ videoId }: PreviewPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let hls: Hls | null = null;

    const initPlayer = async () => {
      if (!videoRef.current) return;

      try {
        setLoading(true);
        // 1. Get secure token from Go Backend (Authenticated)
        const res = await axiosInstance<{ token: string }>({
          url: `/admin/media/token/${videoId}`,
          method: 'GET'
        });
        
        const token = res.token;
        // Use relative proxy path for manifest
        const manifestUrl = `/media-api/stream/${videoId}/index.m3u8?token=${token}`;

        // 2. Initialize Hls.js
        if (Hls.isSupported()) {
          hls = new Hls();
          hls.loadSource(manifestUrl);
          hls.attachMedia(videoRef.current);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setLoading(false);
            videoRef.current?.play().catch(() => console.log("Autoplay blocked"));
          });
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              setError("Failed to load video stream");
            }
          });
        } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          // Native Safari support
          videoRef.current.src = manifestUrl;
          videoRef.current.addEventListener('loadedmetadata', () => {
            setLoading(false);
            videoRef.current?.play().catch(() => console.log("Autoplay blocked"));
          });
        }
      } catch (err) {
        console.error('Failed to init preview:', err);
        setError("Could not acquire secure playback token");
      }
    };

    initPlayer();

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [videoId]);

  if (error) {
    return (
      <Center h="100%" bg="dark.8" style={{ borderRadius: '4px' }}>
        <Text c="red" size="sm">{error}</Text>
      </Center>
    );
  }

  return (
    <Box pos="relative" h="100%" w="100%">
      {loading && (
        <Center pos="absolute" inset={0} bg="dark.8" style={{ zIndex: 1, borderRadius: '4px' }}>
          <Loader size="sm" color="blue" />
        </Center>
      )}
      <video 
        ref={videoRef} 
        controls 
        style={{ width: '100%', height: '100%', backgroundColor: 'black', borderRadius: '4px' }}
      />
    </Box>
  );
}
