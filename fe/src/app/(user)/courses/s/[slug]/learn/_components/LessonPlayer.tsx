import { useEffect, useRef, useState } from 'react';
import { Box, Center, Loader, Text } from '@mantine/core';
import Hls from 'hls.js';
import { axiosInstance } from '@/lib/axios';

interface LessonPlayerProps {
  videoId: string;
  onEnded?: () => void;
}

export function LessonPlayer({ videoId, onEnded }: LessonPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [prevVideoId, setPrevVideoId] = useState(videoId);
  if (videoId !== prevVideoId) {
    setPrevVideoId(videoId);
    setLoading(true);
    setError(null);
  }

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
    <Box pos="relative" w="100%" h="100%" style={{ backgroundColor: 'black', overflow: 'hidden' }}>
      {loading && (
        <Center pos="absolute" inset={0} bg="dark.9" style={{ zIndex: 1 }}>
          <Loader size="md" color="blue" />
        </Center>
      )}
      <video
        ref={videoRef}
        controls
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        onEnded={onEnded}
      />
    </Box>
  );
}
