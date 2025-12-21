import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Quality presets for adaptive bitrate streaming
const QUALITY_PRESETS = {
  '240p': {
    width: 426,
    height: 240,
    videoBitrate: '400k',
    audioBitrate: '64k',
    maxrate: '400k',
    bufsize: '800k',
  },
  '480p': {
    width: 854,
    height: 480,
    videoBitrate: '1000k',
    audioBitrate: '96k',
    maxrate: '1000k',
    bufsize: '2000k',
  },
  '720p': {
    width: 1280,
    height: 720,
    videoBitrate: '2500k',
    audioBitrate: '128k',
    maxrate: '2500k',
    bufsize: '5000k',
  },
  '1080p': {
    width: 1920,
    height: 1080,
    videoBitrate: '5000k',
    audioBitrate: '192k',
    maxrate: '5000k',
    bufsize: '10000k',
  },
};

/**
 * Extract metadata from video file using ffprobe
 */
export const extractVideoMetadata = (filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');
        
        resolve({
          duration: metadata.format?.duration || 0,
          bitrate: metadata.format?.bit_rate || 0,
          size: metadata.format?.size || 0,
          format: metadata.format?.format_name || 'unknown',
          videoCodec: videoStream?.codec_name || 'unknown',
          audioCodec: audioStream?.codec_name || 'unknown',
          width: videoStream?.width || 0,
          height: videoStream?.height || 0,
          fps: videoStream?.avg_frame_rate ? eval(videoStream.avg_frame_rate) : 0,
          aspectRatio: videoStream?.display_aspect_ratio || 'unknown',
          audioChannels: audioStream?.channels || 0,
          audioSampleRate: audioStream?.sample_rate || 0,
        });
      }
    });
  });
};

/**
 * Generate thumbnail from video at specific timestamp
 */
export const generateThumbnail = (inputPath, outputPath, timestamp = '00:00:01') => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({
        timestamps: [timestamp],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '1280x720'
      })
      .on('end', () => resolve(outputPath))
      .on('error', reject);
  });
};

/**
 * Generate multiple thumbnails for preview/scrubbing
 */
export const generateThumbnailStrip = (inputPath, outputDir, count = 10) => {
  return new Promise(async (resolve, reject) => {
    try {
      const metadata = await extractVideoMetadata(inputPath);
      const duration = metadata.duration;
      const interval = duration / (count + 1);
      
      const thumbnails = [];
      
      for (let i = 1; i <= count; i++) {
        const timestamp = interval * i;
        const outputPath = path.join(outputDir, `thumb_${i}.jpg`);
        
        await new Promise((res, rej) => {
          ffmpeg(inputPath)
            .screenshots({
              timestamps: [timestamp],
              filename: `thumb_${i}.jpg`,
              folder: outputDir,
              size: '320x180'
            })
            .on('end', res)
            .on('error', rej);
        });
        
        thumbnails.push({ timestamp, path: outputPath });
      }
      
      resolve(thumbnails);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate a visual audio waveform PNG.
 *
 * Uses FFmpeg filter `showwavespic` to render a single frame image.
 */
export const generateWaveformImage = (inputPath, outputPath, options = {}) => {
  const width = Number(options.width || 1200);
  const height = Number(options.height || 120);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      // showwavespic consumes audio and outputs a video frame
      .complexFilter([`showwavespic=s=${width}x${height}`])
      .outputOptions([
        '-frames:v 1',
        '-y',
      ])
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
};

const formatVttTimestamp = (seconds) => {
  const totalMs = Math.max(0, Math.round(Number(seconds || 0) * 1000));
  const ms = totalMs % 1000;
  const totalSeconds = Math.floor(totalMs / 1000);
  const s = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const m = totalMinutes % 60;
  const h = Math.floor(totalMinutes / 60);

  const pad = (n, width = 2) => String(n).padStart(width, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(ms, 3)}`;
};

/**
 * Generate a sprite sheet image + WebVTT file for hover/scrub thumbnails.
 *
 * The VTT references the sprite image using `#xywh=x,y,w,h` fragments.
 */
export const generateSpriteSheetAndVtt = async (inputPath, outputDir, options = {}) => {
  const intervalSeconds = Math.max(1, Number(options.intervalSeconds || 10));
  const tileWidth = Math.max(16, Number(options.tileWidth || 160));
  const tileHeight = Math.max(16, Number(options.tileHeight || 90));
  const maxThumbnails = Math.max(1, Number(options.maxThumbnails || 100));

  const absoluteOutDir = path.isAbsolute(outputDir) ? outputDir : path.join(process.cwd(), outputDir);
  await fs.mkdir(absoluteOutDir, { recursive: true });

  const metadata = await extractVideoMetadata(inputPath);
  const duration = Math.max(0, Number(metadata.duration || 0));

  // Include a frame at t=0, then every intervalSeconds.
  const estimated = duration > 0 ? Math.floor(duration / intervalSeconds) + 1 : 1;
  const count = Math.max(1, Math.min(maxThumbnails, estimated));

  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);

  const spriteSheetPath = path.join(absoluteOutDir, 'spritesheet.jpg');
  const vttPath = path.join(absoluteOutDir, 'sprites.vtt');

  const vf = [
    // Sample frames at a fixed cadence.
    `fps=1/${intervalSeconds}`,
    // Create uniform tiles with padding to avoid aspect distortion.
    `scale=${tileWidth}:${tileHeight}:force_original_aspect_ratio=decrease`,
    `pad=${tileWidth}:${tileHeight}:(ow-iw)/2:(oh-ih)/2`,
    `tile=${columns}x${rows}`,
  ].join(',');

  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        '-vf', vf,
        '-frames:v 1',
        '-q:v 3',
        '-y',
      ])
      .output(spriteSheetPath)
      .on('end', resolve)
      .on('error', reject)
      .run();
  });

  // Build a simple VTT where each cue covers [t, t+interval).
  const spriteFileName = path.basename(spriteSheetPath);
  const cues = [];
  for (let i = 0; i < count; i += 1) {
    const start = i * intervalSeconds;
    let end = (i + 1) * intervalSeconds;
    if (duration > 0) end = Math.min(end, duration);
    if (end <= start) end = start + intervalSeconds;

    const col = i % columns;
    const row = Math.floor(i / columns);
    const x = col * tileWidth;
    const y = row * tileHeight;

    cues.push(
      `${formatVttTimestamp(start)} --> ${formatVttTimestamp(end)}\n${spriteFileName}#xywh=${x},${y},${tileWidth},${tileHeight}`
    );
  }

  const vttContent = `WEBVTT\n\n${cues.join('\n\n')}\n`;
  await fs.writeFile(vttPath, vttContent);

  return {
    spriteSheetPath,
    vttPath,
    intervalSeconds,
    tileWidth,
    tileHeight,
    columns,
    rows,
    count,
  };
};

/**
 * Transcode video to specific quality preset
 */
export const transcodeVideo = (inputPath, outputPath, preset = '720p') => {
  return new Promise((resolve, reject) => {
    const quality = QUALITY_PRESETS[preset];
    
    if (!quality) {
      return reject(new Error(`Invalid preset: ${preset}`));
    }

    ffmpeg(inputPath)
      .output(outputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .size(`${quality.width}x${quality.height}`)
      .videoBitrate(quality.videoBitrate)
      .audioBitrate(quality.audioBitrate)
      .outputOptions([
        `-maxrate ${quality.maxrate}`,
        `-bufsize ${quality.bufsize}`,
        '-preset fast',
        '-crf 23',
        '-movflags +faststart', // For web streaming
      ])
      .on('progress', (progress) => {
        console.log(`Transcoding ${preset}: ${progress.percent}%`);
      })
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
};

/**
 * Create HLS (HTTP Live Streaming) playlist with multiple quality variants
 */
export const generateHLSPlaylist = async (inputPath, outputDir, qualities = ['240p', '480p', '720p', ]) => {
  try {
    await fs.mkdir(outputDir, { recursive: true });
    
    const metadata = await extractVideoMetadata(inputPath);
    const originalWidth = metadata.width;
    
    // Filter qualities based on original video resolution
    const availableQualities = qualities.filter(q => {
      const preset = QUALITY_PRESETS[q];
      return preset.width <= originalWidth;
    });
    
    const variants = [];
    
    // Generate variants for each quality
    for (const quality of availableQualities) {
      const variantDir = path.join(outputDir, quality);
      await fs.mkdir(variantDir, { recursive: true });
      
      const preset = QUALITY_PRESETS[quality];
      const playlistPath = path.join(variantDir, 'playlist.m3u8');
      
      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .output(playlistPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .size(`${preset.width}x${preset.height}`)
          .videoBitrate(preset.videoBitrate)
          .audioBitrate(preset.audioBitrate)
          .outputOptions([
            `-maxrate ${preset.maxrate}`,
            `-bufsize ${preset.bufsize}`,
            '-preset fast',
            '-crf 23',
            '-hls_time 6', // 6 second segments
            '-hls_playlist_type vod',
            '-hls_segment_filename', path.join(variantDir, 'segment%03d.ts'),
          ])
          .on('progress', (progress) => {
            console.log(`HLS ${quality}: ${progress.percent}%`);
          })
          .on('end', resolve)
          .on('error', reject)
          .run();
      });
      
      variants.push({
        quality,
        resolution: `${preset.width}x${preset.height}`,
        bandwidth: parseInt(preset.videoBitrate) * 1000,
        playlist: playlistPath,
      });
    }
    
    // Create master playlist
    const masterPlaylist = variants.map(v => {
      return `#EXT-X-STREAM-INF:BANDWIDTH=${v.bandwidth},RESOLUTION=${v.resolution}\n${v.quality}/playlist.m3u8`;
    }).join('\n');
    
    const masterPlaylistPath = path.join(outputDir, 'master.m3u8');
    await fs.writeFile(masterPlaylistPath, `#EXTM3U\n#EXT-X-VERSION:3\n${masterPlaylist}\n`);
    
    return {
      masterPlaylist: masterPlaylistPath,
      variants,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Compress video while maintaining quality (for upload optimization)
 */
export const compressVideo = (inputPath, outputPath, targetSizeMB = null) => {
  return new Promise(async (resolve, reject) => {
    try {
      const metadata = await extractVideoMetadata(inputPath);
      
      let videoBitrate;
      
      if (targetSizeMB) {
        // Calculate bitrate to achieve target file size
        const targetSizeBytes = targetSizeMB * 1024 * 1024;
        const audioBitrate = 128; // kbps
        const duration = metadata.duration;
        videoBitrate = Math.floor((targetSizeBytes * 8) / duration / 1000 - audioBitrate);
      } else {
        // Default: reduce to 70% of original bitrate
        videoBitrate = Math.floor(metadata.bitrate * 0.7 / 1000);
      }
      
      ffmpeg(inputPath)
        .output(outputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .videoBitrate(`${videoBitrate}k`)
        .audioBitrate('128k')
        .outputOptions([
          '-preset medium',
          '-crf 28',
          '-movflags +faststart',
        ])
        .on('progress', (progress) => {
          console.log(`Compressing: ${progress.percent}%`);
        })
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Extract audio from video
 */
export const extractAudio = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .output(outputPath)
      .noVideo()
      .audioCodec('libmp3lame')
      .audioBitrate('192k')
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
};

/**
 * Add watermark to video
 */
export const addWatermark = (inputPath, watermarkPath, outputPath, position = 'bottomright') => {
  return new Promise((resolve, reject) => {
    const positionMap = {
      topleft: 'overlay=10:10',
      topright: 'overlay=W-w-10:10',
      bottomleft: 'overlay=10:H-h-10',
      bottomright: 'overlay=W-w-10:H-h-10',
      center: 'overlay=(W-w)/2:(H-h)/2',
    };
    
    const overlayFilter = positionMap[position] || positionMap.bottomright;
    
    ffmpeg(inputPath)
      .input(watermarkPath)
      .complexFilter([overlayFilter])
      .output(outputPath)
      .videoCodec('libx264')
      .audioCodec('copy')
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
};

/**
 * Trim/cut video
 */
export const trimVideo = (inputPath, outputPath, startTime, endTime) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(endTime - startTime)
      .output(outputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .outputOptions(['-preset fast', '-crf 23'])
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
};

/**
 * Merge/concatenate multiple videos
 */
export const mergeVideos = (inputPaths, outputPath) => {
  return new Promise(async (resolve, reject) => {
    try {
      const tempDir = path.join(__dirname, '../../temp');
      await fs.mkdir(tempDir, { recursive: true });
      
      // Create concat file list
      const concatListPath = path.join(tempDir, `concat_${uuidv4()}.txt`);
      const fileList = inputPaths.map(p => `file '${p}'`).join('\n');
      await fs.writeFile(concatListPath, fileList);
      
      await new Promise((res, rej) => {
        ffmpeg()
          .input(concatListPath)
          .inputOptions(['-f concat', '-safe 0'])
          .output(outputPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .outputOptions(['-preset fast', '-crf 23'])
          .on('end', res)
          .on('error', rej)
          .run();
      });
      
      // Cleanup
      await fs.unlink(concatListPath);
      
      resolve(outputPath);
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Generate animated GIF from video
 */
export const generateGif = (inputPath, outputPath, startTime = 0, duration = 3, fps = 10, width = 480) => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(startTime)
      .setDuration(duration)
      .size(`${width}x?`)
      .fps(fps)
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run();
  });
};

export default {
  extractVideoMetadata,
  generateThumbnail,
  generateThumbnailStrip,
  generateWaveformImage,
  generateSpriteSheetAndVtt,
  transcodeVideo,
  generateHLSPlaylist,
  compressVideo,
  extractAudio,
  addWatermark,
  trimVideo,
  mergeVideos,
  generateGif,
};
