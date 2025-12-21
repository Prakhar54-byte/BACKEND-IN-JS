import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema(
  {
    videoFiles: {
      type: String, // cloudinary url (original)
      required: true,
    },
    thumbnail: {
      type: String, // cloudinary url
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    // Video processing fields
    processingStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },
    // HLS streaming support
    hlsMasterPlaylist: {
      type: String, // URL to master.m3u8
    },
    // Animated WebP preview for homepage hover
    previewAnimationUrl: {
      type: String,
    },
    // Visual audio waveform image URL
    waveformUrl: {
      type: String,
    },
    // Seeking previews (sprite sheet)
    spriteSheetUrl: {
      type: String,
    },
    spriteSheetVttUrl: {
      type: String,
    },
    // Auto-detected intro/outro times
    introStartTime: {
      type: Number,
    },
    introEndTime: {
      type: Number,
    },
    // Multiple quality variants
    variants: [{
      quality: {
        type: String,
        enum: ["240p", "480p", "720p", "1080p", "4k"],
      },
      url: String,
      resolution: String,
      bitrate: String,
      size: Number,
      // List of public URLs to .ts HLS segments for this variant
      segments: [String],
    }],
    // Thumbnail strip for video scrubbing
    thumbnailStrip: [{
      timestamp: Number,
      url: String,
    }],
    // Video metadata
    metadata: {
      codec: String,
      format: String,
      fps: Number,
      aspectRatio: String,
      audioCodec: String,
      audioChannels: Number,
      originalWidth: Number,
      originalHeight: Number,
      originalSize: Number,
      originalBitrate: Number,
    },
  },

  {
    timestamps: true,
  }
);

videoSchema.plugin(mongooseAggregatePaginate);

export const Video = mongoose.model("Video", videoSchema);
