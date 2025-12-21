import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";
import videoProcessingService from "../services/videoProcessing.service.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import path from "path";
import { promises as fs } from "fs";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { fileURLToPath } from 'url';

// Optional: Import Kafka producer if available
let sendVideoEvent = async () => {};
try {
  const kafkaModule = await import("../../ingestion/kafka-producers/videoEventProducer.js");
  sendVideoEvent = kafkaModule.sendVideoEvent;
} catch (error) {
  console.log("Kafka producer not available, events will not be sent");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..', '..');
const publicRootDir = path.join(backendRoot, 'public');

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

const isRemoteUrl = (value) => typeof value === "string" && /^https?:\/\//i.test(value);

const toPosixPath = (p) => (typeof p === "string" ? p.replace(/\\/g, "/") : p);

const toPublicRel = (publicRoot, absolutePath) =>
  path.relative(publicRoot, absolutePath).split(path.sep).join("/");

async function resolveInputVideoPath({ videoFiles, workDir, publicRoot }) {
  const raw = toPosixPath(videoFiles);
  if (!raw) throw new ApiError(400, "Video file path is missing");

  // If it's a remote URL (e.g., Cloudinary), download it to a local temp file.
  if (isRemoteUrl(raw)) {
    const response = await fetch(raw);
    if (!response.ok || !response.body) {
      throw new ApiError(400, `Failed to download remote video: ${response.status}`);
    }

    const localPath = path.join(workDir, "input.mp4");
    const nodeStream = Readable.fromWeb(response.body);
    await pipeline(nodeStream, createWriteStream(localPath));
    return localPath;
  }

  // DB may store:
  // - "public/..." (db path)
  // - "temp/..." or "hls-..." (public-relative)
  // - absolute filesystem paths
  const normalized = raw.replace(/^\//, "");

  let absolutePath;
  if (path.isAbsolute(raw)) {
    absolutePath = raw;
  } else if (normalized.startsWith("public/")) {
    absolutePath = path.join(process.cwd(), normalized);
  } else {
    // Treat as public-relative by default.
    absolutePath = path.join(publicRoot, normalized);
  }

  try {
    await fs.access(absolutePath);
  } catch {
    throw new ApiError(400, `Video file not found on disk: ${absolutePath}`);
  }

  return absolutePath;
}

/**
 * Background processing function
 */
async function processVideoInBackground(videoId, videoUrl) {
  try {
    const video = await Video.findById(videoId);
    if (!video) return;

    const publicRoot = publicRootDir;
    const workDir = path.join(publicRoot, "temp", `work-video_${videoId}`);
    await fs.mkdir(workDir, { recursive: true });

    // Outputs that the frontend needs must be stored in a persistent public folder.
    const thumbsDir = path.join(publicRoot, "temp", `thumbs-${videoId}`);
    await fs.mkdir(thumbsDir, { recursive: true });

    // You would download the video here if needed
    // const inputPath = path.join(tempDir, "input.mp4");
    // For this example, we'll use the uploaded file path

    // 1. Resolve local input path (download if needed)
    const inputPath = await resolveInputVideoPath({
      videoFiles: videoUrl || video.videoFiles,
      workDir,
      publicRoot,
    });

    // 2. Extract metadata
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

    // 3. Generate thumbnails (persist in public/)
    const mainThumbnailPath = path.join(thumbsDir, "main.jpg");
    await videoProcessingService.generateThumbnail(inputPath, mainThumbnailPath);

    // Prefer Cloudinary if configured, else serve locally.
    let mainThumbUrl;
    try {
      const upload = await uploadOnCloudinary(mainThumbnailPath);
      mainThumbUrl = upload?.url;
    } catch {
      mainThumbUrl = undefined;
    }
    video.thumbnail = mainThumbUrl || toPublicRel(publicRoot, mainThumbnailPath);

    // 4. Generate thumbnail strip for scrubbing
    const thumbnailStrip = await videoProcessingService.generateThumbnailStrip(inputPath, thumbsDir, 10);

    video.thumbnailStrip = [];
    for (const thumb of thumbnailStrip) {
      let thumbUrl;
      try {
        const upload = await uploadOnCloudinary(thumb.path);
        thumbUrl = upload?.url;
      } catch {
        thumbUrl = undefined;
      }

      video.thumbnailStrip.push({
        timestamp: thumb.timestamp,
        url: thumbUrl || toPublicRel(publicRoot, thumb.path),
      });
    }

    // 4.5 Generate waveform image (optional UI feature)
    const waveformPath = path.join(publicRoot, "temp", `waveform-${videoId}.png`);
    let waveformUrl;
    try {
      await videoProcessingService.generateWaveformImage(inputPath, waveformPath, { width: 1200, height: 120 });
      waveformUrl = toPublicRel(publicRoot, waveformPath);
    } catch (e) {
      console.warn(`Waveform generation failed for video ${videoId}:`, e?.message || e);
      waveformUrl = undefined;
    }

    // 4.6 Generate sprite sheet + VTT for hover/scrub thumbnails (optional UI feature)
    const spritesDir = path.join(publicRoot, "temp", `sprites-${videoId}`);
    let spriteSheetUrl;
    let spriteSheetVttUrl;
    try {
      const result = await videoProcessingService.generateSpriteSheetAndVtt(inputPath, spritesDir, {
        intervalSeconds: 10,
        tileWidth: 160,
        tileHeight: 90,
        maxThumbnails: 100,
      });
      spriteSheetUrl = toPublicRel(publicRoot, result.spriteSheetPath);
      spriteSheetVttUrl = toPublicRel(publicRoot, result.vttPath);
    } catch (e) {
      console.warn(`Sprite/VTT generation failed for video ${videoId}:`, e?.message || e);
      spriteSheetUrl = undefined;
      spriteSheetVttUrl = undefined;
    }

    // 5. Generate HLS playlist with multiple qualities into a persistent public folder
    const hlsDir = path.join(publicRoot, `hls-${videoId}`);
    const hlsResult = await videoProcessingService.generateHLSPlaylist(
      inputPath,
      hlsDir,
      ["240p", "480p", "720p", "1080p"]
    );

    // Save master playlist as public-relative path
    video.hlsMasterPlaylist = toPublicRel(publicRoot, hlsResult.masterPlaylist);

    // 5. Generate quality variants and collect .ts segment URLs
    video.variants = [];
    for (const variant of hlsResult.variants) {
      const variantDir = path.dirname(variant.playlist);
      const files = await fs.readdir(variantDir);
      const tsSegments = files
        .filter((f) => f.endsWith('.ts'))
        .sort()
        .map((f) => {
          const abs = path.join(variantDir, f);
          return toPublicRel(publicRoot, abs);
        });

      video.variants.push({
        quality: variant.quality,
        url: toPublicRel(publicRoot, variant.playlist),
        resolution: variant.resolution,
        bitrate: variant.bandwidth.toString(),
        size: 0, // TODO: Optionally calculate combined size of segments
        segments: tsSegments,
      });
    }

    // 6. Update status
    video.processingStatus = "completed";
    if (waveformUrl) {
      video.waveformUrl = waveformUrl;
    }

    if (spriteSheetUrl) {
      video.spriteSheetUrl = spriteSheetUrl;
    }
    if (spriteSheetVttUrl) {
      video.spriteSheetVttUrl = spriteSheetVttUrl;
    }

    // Safe defaults so frontend doesn't see undefined.
    // (Skip-intro stays effectively disabled unless values are set meaningfully.)
    if (video.introStartTime == null) video.introStartTime = 0;
    if (video.introEndTime == null) video.introEndTime = 0;

    await video.save();

    // Send completion event
    await sendVideoEvent("video.processing.completed", {
      videoId: video._id,
      variants: video.variants.length,
      thumbnails: video.thumbnailStrip.length,
    });

    // Cleanup work directory only (thumbnails + HLS are kept for serving)
    await fs.rm(workDir, { recursive: true, force: true });
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

  const publicRoot = path.join(process.cwd(), "public");
  const tempDir = path.join(publicRoot, "temp");
  await fs.mkdir(tempDir, { recursive: true });

  // Resolve local input path (download if needed)
  const workDir = path.join(tempDir, `work-thumb_${videoId}_${Date.now()}`);
  await fs.mkdir(workDir, { recursive: true });
  const inputPath = await resolveInputVideoPath({
    videoFiles: video.videoFiles,
    workDir,
    publicRoot,
  });

  const outputPath = path.join(tempDir, `thumb_${videoId}_${Date.now()}.jpg`);

  // Generate thumbnail
  await videoProcessingService.generateThumbnail(inputPath, outputPath, timestamp);

  // Prefer Cloudinary if configured, else serve locally
  let thumbnailUrl;
  try {
    const uploadResult = await uploadOnCloudinary(outputPath);
    thumbnailUrl = uploadResult?.url;
  } catch {
    thumbnailUrl = undefined;
  }

  // Cleanup only the work dir; keep outputPath if serving locally
  await fs.rm(workDir, { recursive: true, force: true });
  if (thumbnailUrl) {
    await fs.unlink(outputPath);
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { thumbnail: thumbnailUrl || toPublicRel(publicRoot, outputPath) },
        "Thumbnail generated"
      )
    );
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
