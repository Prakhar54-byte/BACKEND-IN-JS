import ffmpeg from 'fluent-ffmpeg';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let isReady = false;

export const loadFFmpeg = async () => {
    if (isReady) return;

    try {
        // Check if ffmpeg is available
        return new Promise((resolve, reject) => {
            ffmpeg.getAvailableFormats((err, formats) => {
                if (err) {
                    console.error('FFmpeg not found. Please install FFmpeg on your system.');
                    reject(err);
                } else {
                    isReady = true;
                    console.log('FFmpeg loaded successfully');
                    resolve();
                }
            });
        });
    } catch (error) {
        console.error('Error loading FFmpeg:', error);
        throw error;
    }
}

export const extractVideoMetrics = async (buffer) => {
    await loadFFmpeg();

    // Create temporary file
    const tempDir = path.join(__dirname, 'temp');
    await fs.mkdir(tempDir, { recursive: true });
    
    const inputPath = path.join(tempDir, `input_${Date.now()}.mp4`);
    
    try {
        // Write buffer to temporary file
        await fs.writeFile(inputPath, buffer);

        // Extract metadata using ffprobe
        const metadata = await new Promise((resolve, reject) => {
            ffmpeg.ffprobe(inputPath, (err, metadata) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(metadata);
                }
            });
        });

        // Clean up temporary file
        await fs.unlink(inputPath);

        return parseMetadata(metadata);
    } catch (error) {
        // Clean up on error
        try {
            await fs.unlink(inputPath);
        } catch (cleanupError) {
            console.error('Error cleaning up temp file:', cleanupError);
        }
        throw error;
    }
}

const parseMetadata = (metadata) => {
    const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
    const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
    
    return {
        frameCount: videoStream?.nb_frames || 0,
        duration: metadata.format?.duration || '0',
        bitrate: metadata.format?.bit_rate || '0',
        size: metadata.format?.size || '0',
        videoCodec: videoStream?.codec_name || 'unknown',
        audioCodec: audioStream?.codec_name || 'unknown',
        format: metadata.format?.format_name || 'unknown',
        resolution: videoStream ? `${videoStream.width}x${videoStream.height}` : 'unknown',
        fps: videoStream?.avg_frame_rate ? eval(videoStream.avg_frame_rate) : '0',
        aspectRatio: videoStream?.display_aspect_ratio || 'unknown',
        audioChannels: audioStream?.channels || '0',
        audioSampleRate: audioStream?.sample_rate || '0',
        keyFrames: 0, // Would need additional processing to count keyframes
    }
}