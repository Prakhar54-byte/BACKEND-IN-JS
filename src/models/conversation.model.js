import mongoose, { Schema } from "mongoose";

const conversationSchema = new Schema(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
    },
    tier: {
      type: String,
      enum: ["subscriber", "non_subscriber", "following"],
      required: true,
    },
    badges: [
      {
        type: String,
        enum: ["top_fan", "new_subscriber", "watched_10_plus", "early_supporter"],
      },
    ],
    unreadCount: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient querying
conversationSchema.index({ participants: 1, tier: 1 });

export const Conversation = mongoose.model("Conversation", conversationSchema);
