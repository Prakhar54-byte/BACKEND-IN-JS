import mongoose, {Schema} from "mongoose";

const tweetSchema = new Schema({
    content: {
        type: String,
        required: true
    },
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true
    },
    // Message-specific fields
    receiver: {
        type: Schema.Types.ObjectId,
        ref: "User",
        index: true,
        default: null // null for public tweets, userId for private messages
    },
    isMessage: {
        type: Boolean,
        default: false,
        index: true
    },
    messageType: {
        type: String,
        enum: ["text", "video", "coupon", "poll", "auto_welcome"],
        default: "text"
    },
    tier: {
        type: String,
        enum: ["subscriber", "non_subscriber", "following", "public"],
        default: "public",
        index: true
    },
    badges: [{
        type: String,
        enum: ["top_fan", "new_subscriber", "watched_10_plus", "early_supporter"]
    }],
    metadata: {
        videoId: {
            type: Schema.Types.ObjectId,
            ref: "Video"
        },
        couponCode: String,
        pollOptions: [String],
        pollVotes: Map
    },
    isRead: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, {timestamps: true})

// Compound indexes for efficient querying
tweetSchema.index({ receiver: 1, tier: 1, isRead: 1, createdAt: -1 });
tweetSchema.index({ owner: 1, receiver: 1, createdAt: -1 });
tweetSchema.index({ isMessage: 1, createdAt: -1 });

export const Tweet = mongoose.model("Tweet", tweetSchema)