import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    messageType: {
      type: String,
      enum: ["text", "video", "coupon", "poll", "auto_welcome"],
      default: "text",
    },
    metadata: {
      // For video links, coupons, polls, etc.
      videoId: {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
      couponCode: String,
      pollOptions: [String],
      pollVotes: Map,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    tier: {
      type: String,
      enum: ["subscriber", "non_subscriber", "following"],
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient querying
messageSchema.index({ receiver: 1, tier: 1, isRead: 1, createdAt: -1 });
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });

export const Message = mongoose.model("Message", messageSchema);
