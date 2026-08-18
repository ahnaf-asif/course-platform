'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box, Center, Loader, Text, Alert } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import Hls from 'hls.js';
import { axiosInstance } from '@/lib/axios';
import { WatermarkOverlay } from '@/components/WatermarkOverlay';
import { useDevToolsDetector } from '@/lib/useDevToolsDetector';

interface LessonPlayerProps {
  videoId: string;
  onEnded?: () => void;
}

export function LessonPlayer({ videoId, onEnded }: LessonPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTampered, setIsTampered] = useState(false);

  const [prevVideoId, setPrevVideoId] = useState(videoId);
  if (videoId !== prevVideoId) {
    setPrevVideoId(videoId);
    setLoading(true);
    setError(null);
    setIsTampered(false);
  }

  const handleTamper = () => {
    setIsTampered(true);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  // Detect DevTools opening and trigger tamper pause
  useDevToolsDetector(handleTamper);

  useEffect(() => {
    let hls: Hls | null = null;

    const initPlayer = async () => {
      if (!videoRef.current) return;

      try {
        const res = await axiosInstance<{ token: string }>({
          url: `/media/token/${videoId}`,
          method: 'GET',
        });

        const token = res.token;
        const manifestUrl = `/media-api/stream/${videoId}/index.m3u8?token=${token}`;

        if (Hls.isSupported()) {
          hls = new Hls({
            xhrSetup: (xhr) => {
              xhr.withCredentials = true;
            },
          });
          hls.loadSource(manifestUrl);
          hls.attachMedia(videoRef.current);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setLoading(false);
          });
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
              setError('Failed to load video stream');
            }
          });
        } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
          videoRef.current.src = manifestUrl;
          videoRef.current.addEventListener('loadedmetadata', () => {
            setLoading(false);
          });
          videoRef.current.addEventListener('error', () => {
            setError('Failed to load video stream');
          });
        } else {
          setError('Your browser does not support HLS streaming');
        }
      } catch (err) {
        console.error('Failed to init video:', err);
        setError('Could not acquire secure playback token');
      }
    };

    initPlayer();

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [videoId]);

  if (isTampered) {
    return (
      <Center w="100%" h="100%" bg="dark.9" p="md" data-testid="player-tamper-warning">
        <Alert
          icon={<IconAlertTriangle size={20} />}
          title="নিরাপত্তা সতর্কতা"
          color="red"
          radius="md"
          styles={{ root: { maxWidth: '480px' } }}
        >
          ভিডিও প্লেয়ার ও কন্টেন্ট সুরক্ষায় অননুমোদিত হস্তক্ষেপ ধরা পড়েছে। পুনরায় ভিডিও দেখতে পেজটি রিফ্রেশ করুন।
        </Alert>
      </Center>
    );
  }

  if (error) {
    return (
      <Center w="100%" h="100%" bg="dark.9" p="md">
        <Text c="red" size="sm" ta="center">
          {error}
        </Text>
      </Center>
    );
  }

  return (
    <Box
      pos="relative"
      w="100%"
      h="100%"
      style={{ backgroundColor: 'black', overflow: 'hidden' }}
      onContextMenu={(e) => e.preventDefault()}
      data-testid="lesson-player-container"
    >
      {/* Dynamic shifting forensic watermark */}
      <WatermarkOverlay variant="video" onTamper={handleTamper} />

      {loading && (
        <Center pos="absolute" inset={0} bg="dark.9" style={{ zIndex: 1 }}>
          <Loader size="md" color="blue" />
        </Center>
      )}

      <video
        ref={videoRef}
        controls
        controlsList="nodownload noplaybackrate"
        disablePictureInPicture
        onContextMenu={(e) => e.preventDefault()}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        onEnded={onEnded}
        data-testid="lesson-video-element"
      />
    </Box>
  );
}
