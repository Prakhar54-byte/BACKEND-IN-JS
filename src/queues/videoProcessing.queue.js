import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { transcodeVideo, generateHLSPlaylist, extractVideoMetadata } from '../services/videoProcessing.service.js';
import { Video } from '../models/video.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const isTestEnv = Boolean(process.env.JEST_WORKER_ID) || process.env.NODE_ENV === 'test';

const createRedisConnection = () => {
    if (isTestEnv) return null;
    if (process.env.REDIS_DISABLED === 'true') return null;

    const port = process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379;
    const host = process.env.REDIS_HOST || 'localhost';
    const redis = process.env.REDIS_URL
        ? new IORedis(process.env.REDIS_URL, {
            maxRetriesPerRequest: null,
          })
        : new IORedis({
            host,
            port,
            maxRetriesPerRequest: null,
          });

    // Prevent Node from crashing on an unhandled 'error' event.
    redis.on('error', (err) => {
        console.error('[redis] connection error:', err?.message || err);
    });

    return redis;
};

const redisConnection = createRedisConnection();

const videoProcessingQueue = redisConnection
    ? new Queue('video-processing', { connection: redisConnection })
    : null;

const videoProcessingWorker = redisConnection
    ? new Worker('video-processing', async job => {
    const { videoId, videoFileLocalPath } = job.data;

    try {
        // 1. Update status to 'processing'
        await Video.findByIdAndUpdate(videoId, { processingStatus: 'processing' });

        // 2. Transcode to a default quality (e.g., 720p)
        const outputFileName = `processed-${Date.now()}.mp4`;
        const outputPath = `public/temp/${outputFileName}`;
        await transcodeVideo(videoFileLocalPath, outputPath, '720p');

        // 3. (Optional) Generate HLS playlist
        const hlsOutputDir = `public/temp/hls-${videoId}`;
        const hlsPlaylist = await generateHLSPlaylist(outputPath, hlsOutputDir);

        // 4. Extract metadata
        const metadata = await extractVideoMetadata(outputPath);

        // 5. Update video document with processed data
        await Video.findByIdAndUpdate(videoId, {
            videoFiles: outputPath,
            hlsMasterPlaylist: hlsPlaylist.masterPlaylist,
            duration: metadata.duration,
            processingStatus: 'completed',
            // ... update other metadata fields
        });

        console.log(`Video ${videoId} processed successfully.`);

    } catch (error) {
        await Video.findByIdAndUpdate(videoId, { processingStatus: 'failed' });
        console.error(`Failed to process video ${videoId}:`, error);
        // Optional: Implement retry logic or move to a failed jobs queue
    }
    }, {
        connection: redisConnection
    })
    : null;

videoProcessingWorker?.on('completed', job => {
    console.log(`Job ${job.id} has completed!`);
});

videoProcessingWorker?.on('failed', (job, err) => {
    console.log(`Job ${job.id} has failed with ${err.message}`);
});

export const addVideoToQueue = (videoId, videoFileLocalPath) => {
    if (isTestEnv) {
        // Integration tests should not require Redis.
        return Promise.resolve({ id: 'test-job' });
    }
    if (!videoProcessingQueue) {
        return Promise.reject(new Error('Redis queue is disabled/unavailable'));
    }
    return videoProcessingQueue.add(
        'process-video',
        { videoId, videoFileLocalPath },
        {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 },
            removeOnComplete: true,
            removeOnFail: false,
        }
    );
};

export default videoProcessingQueue;
