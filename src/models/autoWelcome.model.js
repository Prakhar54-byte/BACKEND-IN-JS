import mongoose, { Schema } from "mongoose";

const autoWelcomeSchema = new Schema(
  {
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    message: {
      type: String,
      required: true,
      default: "Thanks for subscribing! 🎉",
    },
    includeVideo: {
      type: Boolean,
      default: false,
    },
    videoId: {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
    includeCoupon: {
      type: Boolean,
      default: false,
    },
    couponCode: String,
    couponDescription: String,
    includePoll: {
      type: Boolean,
      default: false,
    },
    pollQuestion: String,
    pollOptions: [String],
  },
  {
    timestamps: true,
  }
);

export const AutoWelcome = mongoose.model("AutoWelcome", autoWelcomeSchema);
