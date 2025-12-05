import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";
import videoProcessingService from "../services/videoProcessing.service.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import path from "path";
import { promises as fs } from "fs";

// Optional: Import Kafka producer if available
let sendVideoEvent = async () => {};
try {
  const kafkaModule = await import("../../ingestion/kafka-producers/videoEventProducer.js");
  sendVideoEvent = kafkaModule.sendVideoEvent;
} catch (error) {
  console.log("Kafka producer not available, events will not be sent");
}

/**
 * Trigger video processing after upload
 * This processes the video in the background
 */
export const processUploadedVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You don't have permission to process this video");
  }

  if (video.processingStatus === "processing") {
    throw new ApiError(400, "Video is already being processed");
  }

  // Update status to processing
  video.processingStatus = "processing";
  await video.save();

  // Send Kafka event to trigger async processing
  await sendVideoEvent("video.processing.started", {
    videoId: video._id,
    owner: video.owner,
    videoUrl: video.videoFiles,
  });

  // Start processing asynchronously (don't await)
  processVideoInBackground(video._id, video.videoFiles).catch((error) => {
    console.error("Background processing error:", error);
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { status: "processing" }, "Video processing started"));
});

/**
 * Background processing function
 */
async function processVideoInBackground(videoId, videoUrl) {
  try {
    const video = await Video.findById(videoId);
    if (!video) return;

    // For now, we'll assume the video is already uploaded to a temporary location
    // In production, you'd download from Cloudinary or use the local file
    const tempDir = path.join(process.cwd(), "public", "temp", `video_${videoId}`);
    await fs.mkdir(tempDir, { recursive: true });

    // You would download the video here if needed
    // const inputPath = path.join(tempDir, "input.mp4");
    // For this example, we'll use the uploaded file path

    // 1. Extract metadata
    const inputPath = video.videoFiles; // Adjust based on your file storage
    const metadata = await videoProcessingService.extractVideoMetadata(inputPath);

    video.metadata = {
      codec: metadata.videoCodec,
      format: metadata.format,
      fps: metadata.fps,
      aspectRatio: metadata.aspectRatio,
      audioCodec: metadata.audioCodec,
      audioChannels: metadata.audioChannels,
      originalWidth: metadata.width,
      originalHeight: metadata.height,
      originalSize: metadata.size,
      originalBitrate: metadata.bitrate,
    };

    // 2. Generate thumbnails
    const thumbnailDir = path.join(tempDir, "thumbnails");
    await fs.mkdir(thumbnailDir, { recursive: true });

    const mainThumbnailPath = path.join(thumbnailDir, "main.jpg");
    await videoProcessingService.generateThumbnail(inputPath, mainThumbnailPath);

    // Upload main thumbnail to Cloudinary
    const thumbnailUpload = await uploadOnCloudinary(mainThumbnailPath);
    video.thumbnail = thumbnailUpload.url;

    // 3. Generate thumbnail strip for scrubbing
    const thumbnailStrip = await videoProcessingService.generateThumbnailStrip(
      inputPath,
      thumbnailDir,
      10
    );

    // Upload thumbnail strip
    video.thumbnailStrip = [];
    for (const thumb of thumbnailStrip) {
      const thumbUpload = await uploadOnCloudinary(thumb.path);
      video.thumbnailStrip.push({
        timestamp: thumb.timestamp,
        url: thumbUpload.url,
      });
    }

    // 4. Generate HLS playlist with multiple qualities
    const hlsDir = path.join(tempDir, "hls");
    const hlsResult = await videoProcessingService.generateHLSPlaylist(
      inputPath,
      hlsDir,
      ["240p", "480p", "720p", "1080p"]
    );

    // Upload HLS files to Cloudinary or your CDN
    // For now, we'll just store the local paths
    // In production, upload all .m3u8 and .ts files to cloud storage

    video.hlsMasterPlaylist = hlsResult.masterPlaylist; // Update with cloud URL

    // 5. Generate quality variants
    video.variants = [];
    for (const variant of hlsResult.variants) {
      video.variants.push({
        quality: variant.quality,
        url: variant.playlist, // Update with cloud URL
        resolution: variant.resolution,
        bitrate: variant.bandwidth.toString(),
        size: 0, // Calculate from files
      });
    }

    // 6. Update status
    video.processingStatus = "completed";
    await video.save();

    // Send completion event
    await sendVideoEvent("video.processing.completed", {
      videoId: video._id,
      variants: video.variants.length,
      thumbnails: video.thumbnailStrip.length,
    });

    // Cleanup temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.error("Video processing error:", error);

    // Update video status to failed
    const video = await Video.findById(videoId);
    if (video) {
      video.processingStatus = "failed";
      await video.save();
    }

    await sendVideoEvent("video.processing.failed", {
      videoId,
      error: error.message,
    });
  }
}

/**
 * Generate thumbnail for video at specific timestamp
 */
export const generateThumbnailAtTime = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { timestamp = "00:00:01" } = req.query;

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  const tempDir = path.join(process.cwd(), "public", "temp");
  await fs.mkdir(tempDir, { recursive: true });

  const outputPath = path.join(tempDir, `thumb_${videoId}_${Date.now()}.jpg`);

  // Generate thumbnail
  await videoProcessingService.generateThumbnail(video.videoFiles, outputPath, timestamp);

  // Upload to Cloudinary
  const uploadResult = await uploadOnCloudinary(outputPath);

  // Cleanup
  await fs.unlink(outputPath);

  return res
    .status(200)
    .json(new ApiResponse(200, { thumbnail: uploadResult.url }, "Thumbnail generated"));
});

/**
 * Get processing status
 */
export const getProcessingStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  const video = await Video.findById(videoId).select(
    "processingStatus variants hlsMasterPlaylist thumbnailStrip metadata"
  );

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {
          status: video.processingStatus,
          variants: video.variants,
          hlsPlaylist: video.hlsMasterPlaylist,
          thumbnails: video.thumbnailStrip,
          metadata: video.metadata,
        },
        "Processing status retrieved"
      )
    );
});

/**
 * Compress video (useful for client-side pre-processing)
 */
export const compressVideoEndpoint = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { targetSizeMB } = req.body;

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You don't have permission to compress this video");
  }

  const tempDir = path.join(process.cwd(), "public", "temp");
  await fs.mkdir(tempDir, { recursive: true });

  const outputPath = path.join(tempDir, `compressed_${videoId}_${Date.now()}.mp4`);

  // Compress video
  await videoProcessingService.compressVideo(
    video.videoFiles,
    outputPath,
    targetSizeMB ? parseInt(targetSizeMB) : null
  );

  // Upload compressed version
  const uploadResult = await uploadOnCloudinary(outputPath);

  // Cleanup
  await fs.unlink(outputPath);

  return res
    .status(200)
    .json(
      new ApiResponse(200, { compressedUrl: uploadResult.url }, "Video compressed successfully")
    );
});

/**
 * Trim video
 */
export const trimVideoEndpoint = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { startTime, endTime } = req.body;

  if (!startTime || !endTime) {
    throw new ApiError(400, "Start time and end time are required");
  }

  const video = await Video.findById(videoId);
  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You don't have permission to edit this video");
  }

  const tempDir = path.join(process.cwd(), "public", "temp");
  await fs.mkdir(tempDir, { recursive: true });

  const outputPath = path.join(tempDir, `trimmed_${videoId}_${Date.now()}.mp4`);

  // Trim video
  await videoProcessingService.trimVideo(
    video.videoFiles,
    outputPath,
    parseFloat(startTime),
    parseFloat(endTime)
  );

  // Upload trimmed version
  const uploadResult = await uploadOnCloudinary(outputPath);

  // Cleanup
  await fs.unlink(outputPath);

  return res
    .status(200)
    .json(new ApiResponse(200, { trimmedUrl: uploadResult.url }, "Video trimmed successfully"));
});

export default {
  processUploadedVideo,
  generateThumbnailAtTime,
  getProcessingStatus,
  compressVideoEndpoint,
  trimVideoEndpoint,
};
