import mongoose,{Schema} from "mongoose";

const channelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, default: "" },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    avatar: { type: String }, // URL to channel avatar image
    banner: { type: String }, // URL to channel banner image
    subscribers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export const Channel = mongoose.model("Channel", channelSchema);
