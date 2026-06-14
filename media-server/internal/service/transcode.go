package service

import (
	"context"
	"crypto/rand"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"

	"github.com/shafin/course-platform/media-server/internal/config"
)

type CommandExecutor interface {
	Execute(name string, arg ...string) ([]byte, error)
}

type RealExecutor struct{}

func (e *RealExecutor) Execute(name string, arg ...string) ([]byte, error) {
	return exec.Command(name, arg...).CombinedOutput()
}

type TranscodeOptions struct {
	VideoBitrate  string `json:"video_bitrate"`
	VideoCodec    string `json:"video_codec"`
	HlsTime       string `json:"hls_time"`
	HlsSegmentLen string `json:"hls_segment_len"`
}

type ITranscodeService interface {
	ProcessVideo(videoID string, inputPath string, opts *TranscodeOptions)
	GetStreamObject(ctx context.Context, videoID, fileName string) (io.ReadCloser, int64, string, error)
}

type TranscodeService struct {
	minioService IMinioService
	cfg          *config.Config
	executor     CommandExecutor
}

func NewTranscodeService(minioService IMinioService, cfg *config.Config) *TranscodeService {
	return &TranscodeService{
		minioService: minioService,
		cfg:          cfg,
		executor:     &RealExecutor{},
	}
}

func (s *TranscodeService) ProcessVideo(videoID string, inputPath string, opts *TranscodeOptions) {
	ctx := context.Background()

	// Apply defaults if opts is nil or fields are empty
	if opts == nil {
		opts = &TranscodeOptions{}
	}
	if opts.VideoBitrate == "" {
		opts.VideoBitrate = s.cfg.DefaultVideoBitrate
	}
	if opts.VideoCodec == "" {
		opts.VideoCodec = s.cfg.DefaultVideoCodec
	}
	if opts.HlsTime == "" {
		opts.HlsTime = s.cfg.DefaultHlsTime
	}
	if opts.HlsSegmentLen == "" {
		opts.HlsSegmentLen = s.cfg.DefaultHlsSegmentLen
	}

	// 1. Setup workspace
	workDir := filepath.Join(os.TempDir(), "transcode-"+videoID)
	if err := os.MkdirAll(workDir, 0755); err != nil {
		log.Printf("Failed to create work dir: %v\n", err)
		return
	}
	defer os.RemoveAll(workDir)

	// 2. Download from Minio (Raw Bucket) if no local inputPath provided
	finalInputPath := inputPath
	if finalInputPath == "" {
		tempInput := filepath.Join(workDir, "input_raw")
		reader, _, _, err := s.minioService.GetObject(ctx, s.cfg.MinioBucketRaw, videoID)
		if err != nil {
			log.Printf("Failed to download video %s from Minio Raw Bucket: %v\n", videoID, err)
			return
		}
		defer reader.Close()

		f, err := os.Create(tempInput)
		if err != nil {
			log.Printf("Failed to create temp input file: %v\n", err)
			return
		}
		if _, err := io.Copy(f, reader); err != nil {
			f.Close()
			log.Printf("Failed to save temp input file: %v\n", err)
			return
		}
		f.Close()
		finalInputPath = tempInput
	}

	// 3. Generate AES key
	key := make([]byte, 16)
	if _, err := rand.Read(key); err != nil {
		log.Printf("Failed to generate key: %v\n", err)
		return
	}
	keyPath := filepath.Join(workDir, "video.key")
	if err := os.WriteFile(keyPath, key, 0600); err != nil {
		log.Printf("Failed to write key file: %v\n", err)
		return
	}

	// 4. Create key info file for ffmpeg
	// Use a relative URL 'key' so the player fetches it from the same directory as index.m3u8
	keyURL := "key" 
	keyInfoPath := filepath.Join(workDir, "key.info")
	keyInfoContent := fmt.Sprintf("%s\n%s", keyURL, keyPath)
	if err := os.WriteFile(keyInfoPath, []byte(keyInfoContent), 0644); err != nil {
		log.Printf("Failed to write key info: %v\n", err)
		return
	}

	// 5. Run ffmpeg
	outputM3U8 := filepath.Join(workDir, "index.m3u8")
	_, err := s.executor.Execute("ffmpeg", "-i", finalInputPath,
		"-c:v", opts.VideoCodec,
		"-b:v", opts.VideoBitrate,
		"-hls_time", opts.HlsTime,
		"-hls_key_info_file", keyInfoPath,
		"-hls_playlist_type", "vod",
		"-hls_segment_filename", filepath.Join(workDir, opts.HlsSegmentLen),
		outputM3U8)

	if err != nil {
		log.Printf("FFmpeg error for %s: %v\n", videoID, err)
		return
	}

	// 6. Upload results to Minio (Processed Bucket)
	files, _ := os.ReadDir(workDir)
	for _, f := range files {
		if f.IsDir() || f.Name() == "key.info" {
			continue
		}

		filePath := filepath.Join(workDir, f.Name())
		file, _ := os.Open(filePath)
		info, _ := f.Info()

		objectName := fmt.Sprintf("hls/%s/%s", videoID, f.Name())
		contentType := "application/octet-stream"
		if filepath.Ext(f.Name()) == ".m3u8" {
			contentType = "application/x-mpegURL"
		} else if filepath.Ext(f.Name()) == ".ts" {
			contentType = "video/MP2T"
		}

		err := s.minioService.UploadFile(ctx, s.cfg.MinioBucketProcessed, objectName, file, info.Size(), contentType)
		file.Close()
		if err != nil {
			log.Printf("Failed to upload %s to Processed Bucket: %v\n", objectName, err)
		}
	}

	log.Printf("Transcoding completed for %s\n", videoID)
}

func (s *TranscodeService) GetStreamObject(ctx context.Context, videoID, fileName string) (io.ReadCloser, int64, string, error) {
	objectName := fmt.Sprintf("hls/%s/%s", videoID, fileName)
	return s.minioService.GetObject(ctx, s.cfg.MinioBucketProcessed, objectName)
}
