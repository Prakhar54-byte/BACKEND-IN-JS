import mongoose from "mongoose";
import { Message } from "../models/message.model.js";
import { Conversation } from "../models/conversation.model.js";
import { AutoWelcome } from "../models/autoWelcome.model.js";
import { Subscription } from "../models/subscription.model.js";
import { User } from "../models/user.model.js";
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Determine message tier based on relationship
const determineMessageTier = async (senderId, receiverId) => {
  // Check if receiver is subscribed to sender
  const receiverSubscribedToSender = await Subscription.findOne({
    subscriber: receiverId,
    channel: senderId,
  });

  // Check if sender is subscribed to receiver
  const senderSubscribedToReceiver = await Subscription.findOne({
    subscriber: senderId,
    channel: receiverId,
  });

  if (receiverSubscribedToSender) {
    return "subscriber"; // Receiver is a subscriber of sender
  } else if (senderSubscribedToReceiver) {
    return "following"; // Sender is following the receiver
  } else {
    return "non_subscriber"; // No subscription relationship
  }
};

// Calculate badges for a user
const calculateBadges = async (userId, channelId) => {
  const badges = [];

  // Check if new subscriber (within 7 days)
  const subscription = await Subscription.findOne({
    subscriber: userId,
    channel: channelId,
  });

  if (subscription) {
    const daysSinceSubscription =
      (Date.now() - new Date(subscription.createdAt)) / (1000 * 60 * 60 * 24);
    if (daysSinceSubscription <= 7) {
      badges.push("new_subscriber");
    }
    if (daysSinceSubscription >= 365) {
      badges.push("early_supporter");
    }
  }

  // Check watch count (simplified - in production, track actual watch history)
  try {
    const watchHistory = await User.findById(userId).select("watchHistory");
    if (watchHistory && watchHistory.watchHistory && watchHistory.watchHistory.length >= 10) {
      badges.push("watched_10_plus");
    }
  } catch (error) {
    console.log("Watch history check skipped:", error.message);
  }

  // Check if top fan (top 1% engagement - simplified)
  // In production, calculate based on views, likes, comments, etc.
  if (subscription) {
    const allSubscribers = await Subscription.countDocuments({ channel: channelId });
    if (allSubscribers > 0) {
      // Simplified: mark first 1% as top fans (or minimum 1 subscriber if < 100)
      const topFanThreshold = Math.max(1, Math.ceil(allSubscribers * 0.01));
      const userRank = await Subscription.countDocuments({
        channel: channelId,
        createdAt: { $lte: subscription.createdAt },
      });
      if (userRank <= topFanThreshold) {
        badges.push("top_fan");
      }
    }
  }

  return badges;
};

// Send a message
const sendMessage = asyncHandler(async (req, res) => {
  const { receiverId, content, messageType, metadata } = req.body;
  const senderId = req.user._id;

  if (!receiverId || !content) {
    throw new ApiError(400, "Receiver and content are required");
  }

  // Check if receiver exists
  const receiver = await User.findById(receiverId);
  if (!receiver) {
    throw new ApiError(404, "Receiver not found");
  }

  // Determine tier
  const tier = await determineMessageTier(senderId, receiverId);

  // Create message
  const message = await Message.create({
    sender: senderId,
    receiver: receiverId,
    content,
    messageType: messageType || "text",
    metadata: metadata || {},
    tier,
  });

  // Find or create conversation
  let conversation = await Conversation.findOne({
    participants: { $all: [senderId, receiverId] },
  });

  if (!conversation) {
    const badges = await calculateBadges(senderId, receiverId);
    conversation = await Conversation.create({
      participants: [senderId, receiverId],
      tier,
      badges,
      lastMessage: message._id,
      unreadCount: { [receiverId]: 1 },
    });
  } else {
    // Update conversation
    conversation.lastMessage = message._id;
    conversation.tier = tier;
    conversation.badges = await calculateBadges(senderId, receiverId);
    const currentUnread = conversation.unreadCount.get(receiverId.toString()) || 0;
    conversation.unreadCount.set(receiverId.toString(), currentUnread + 1);
    await conversation.save();
  }

  // Populate message details
  const populatedMessage = await Message.findById(message._id)
    .populate("sender", "username fullName avatar")
    .populate("receiver", "username fullName avatar");

  return res
    .status(201)
    .json(new ApiResponse(201, populatedMessage, "Message sent successfully"));
});

// Get inbox by tier (Priority Inbox)
const getInboxByTier = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { tier } = req.query; // 'subscriber', 'non_subscriber', 'following', or 'all'

  let matchQuery = {
    participants: userId,
  };

  if (tier && tier !== "all") {
    matchQuery.tier = tier;
  }

  const conversations = await Conversation.aggregate([
    {
      $match: matchQuery,
    },
    {
      $lookup: {
        from: "users",
        let: { participants: "$participants" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $in: ["$_id", "$$participants"] },
                  { $ne: ["$_id", new mongoose.Types.ObjectId(userId)] },
                ],
              },
            },
          },
          {
            $project: {
              _id: 1,
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
        as: "otherUser",
      },
    },
    {
      $unwind: "$otherUser",
    },
    {
      $lookup: {
        from: "messages",
        localField: "lastMessage",
        foreignField: "_id",
        as: "lastMessageDetails",
      },
    },
    {
      $unwind: {
        path: "$lastMessageDetails",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $addFields: {
        unreadCountObj: {
          $arrayElemAt: [
            {
              $filter: {
                input: { $objectToArray: "$unreadCount" },
                as: "item",
                cond: { $eq: ["$$item.k", userId.toString()] },
              },
            },
            0,
          ],
        },
      },
    },
    {
      $project: {
        _id: 1,
        otherUser: 1,
        tier: 1,
        badges: 1,
        lastMessage: "$lastMessageDetails",
        unreadCount: { $ifNull: ["$unreadCountObj.v", 0] },
        updatedAt: 1,
      },
    },
    {
      $sort: { updatedAt: -1 },
    },
  ]);

  // Group by tier
  const grouped = {
    subscriber: [],
    following: [],
    non_subscriber: [],
  };

  conversations.forEach((conv) => {
    if (grouped[conv.tier]) {
      grouped[conv.tier].push(conv);
    }
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        tier === "all" ? grouped : conversations,
        "Inbox fetched successfully"
      )
    );
});

// Get messages in a conversation
const getConversationMessages = asyncHandler(async (req, res) => {
  const { otherUserId } = req.params;
  const userId = req.user._id;
  const { page = 1, limit = 50 } = req.query;

  const skip = (page - 1) * limit;

  const messages = await Message.find({
    $or: [
      { sender: userId, receiver: otherUserId },
      { sender: otherUserId, receiver: userId },
    ],
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate("sender", "username fullName avatar")
    .populate("receiver", "username fullName avatar");

  // Mark messages as read
  await Message.updateMany(
    { sender: otherUserId, receiver: userId, isRead: false },
    { isRead: true }
  );

  // Update conversation unread count
  await Conversation.updateOne(
    { participants: { $all: [userId, otherUserId] } },
    { $set: { [`unreadCount.${userId}`]: 0 } }
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, messages.reverse(), "Messages fetched successfully")
    );
});

// Setup auto-welcome message
const setupAutoWelcome = asyncHandler(async (req, res) => {
  const creatorId = req.user._id;
  const {
    enabled,
    message,
    includeVideo,
    videoId,
    includeCoupon,
    couponCode,
    couponDescription,
    includePoll,
    pollQuestion,
    pollOptions,
  } = req.body;

  // Validate video if included
  if (includeVideo && videoId) {
    const video = await Video.findOne({ _id: videoId, owner: creatorId });
    if (!video) {
      throw new ApiError(404, "Video not found or not owned by you");
    }
  }

  // Find or create auto-welcome config
  let autoWelcome = await AutoWelcome.findOne({ creator: creatorId });

  if (!autoWelcome) {
    autoWelcome = await AutoWelcome.create({
      creator: creatorId,
      enabled: enabled || false,
      message: message || "Thanks for subscribing! 🎉",
      includeVideo: includeVideo || false,
      videoId: videoId || null,
      includeCoupon: includeCoupon || false,
      couponCode: couponCode || null,
      couponDescription: couponDescription || null,
      includePoll: includePoll || false,
      pollQuestion: pollQuestion || null,
      pollOptions: pollOptions || [],
    });
  } else {
    // Update existing
    autoWelcome.enabled = enabled !== undefined ? enabled : autoWelcome.enabled;
    autoWelcome.message = message || autoWelcome.message;
    autoWelcome.includeVideo = includeVideo !== undefined ? includeVideo : autoWelcome.includeVideo;
    autoWelcome.videoId = videoId || autoWelcome.videoId;
    autoWelcome.includeCoupon = includeCoupon !== undefined ? includeCoupon : autoWelcome.includeCoupon;
    autoWelcome.couponCode = couponCode || autoWelcome.couponCode;
    autoWelcome.couponDescription = couponDescription || autoWelcome.couponDescription;
    autoWelcome.includePoll = includePoll !== undefined ? includePoll : autoWelcome.includePoll;
    autoWelcome.pollQuestion = pollQuestion || autoWelcome.pollQuestion;
    autoWelcome.pollOptions = pollOptions || autoWelcome.pollOptions;
    await autoWelcome.save();
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, autoWelcome, "Auto-welcome message configured successfully")
    );
});

// Get auto-welcome config
const getAutoWelcomeConfig = asyncHandler(async (req, res) => {
  const creatorId = req.user._id;

  const autoWelcome = await AutoWelcome.findOne({ creator: creatorId }).populate(
    "videoId",
    "title thumbnail"
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        autoWelcome || { enabled: false },
        "Auto-welcome config fetched successfully"
      )
    );
});

// Trigger auto-welcome (called when someone subscribes)
const triggerAutoWelcome = async (subscriberId, channelId) => {
  try {
    const autoWelcome = await AutoWelcome.findOne({
      creator: channelId,
      enabled: true,
    });

    if (!autoWelcome) return;

    let messageContent = autoWelcome.message;
    const metadata = {};

    if (autoWelcome.includeVideo && autoWelcome.videoId) {
      metadata.videoId = autoWelcome.videoId;
      messageContent += "\n\n🎥 Check out this video!";
    }

    if (autoWelcome.includeCoupon && autoWelcome.couponCode) {
      metadata.couponCode = autoWelcome.couponCode;
      messageContent += `\n\n🎁 Use coupon code: ${autoWelcome.couponCode}`;
      if (autoWelcome.couponDescription) {
        messageContent += `\n${autoWelcome.couponDescription}`;
      }
    }

    if (autoWelcome.includePoll && autoWelcome.pollQuestion) {
      metadata.pollOptions = autoWelcome.pollOptions;
      messageContent += `\n\n📊 Poll: ${autoWelcome.pollQuestion}`;
    }

    // Create welcome message
    const message = await Message.create({
      sender: channelId,
      receiver: subscriberId,
      content: messageContent,
      messageType: "auto_welcome",
      metadata,
      tier: "subscriber",
    });

    // Create or update conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [channelId, subscriberId] },
    });

    const badges = await calculateBadges(subscriberId, channelId);

    if (!conversation) {
      await Conversation.create({
        participants: [channelId, subscriberId],
        tier: "subscriber",
        badges,
        lastMessage: message._id,
        unreadCount: { [subscriberId]: 1 },
      });
    } else {
      conversation.lastMessage = message._id;
      conversation.tier = "subscriber";
      conversation.badges = badges;
      const currentUnread = conversation.unreadCount.get(subscriberId.toString()) || 0;
      conversation.unreadCount.set(subscriberId.toString(), currentUnread + 1);
      await conversation.save();
    }
  } catch (error) {
    console.error("Auto-welcome message error:", error);
  }
};

// Delete a message
const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  const message = await Message.findById(messageId);

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  if (message.sender.toString() !== userId.toString()) {
    throw new ApiError(403, "You can only delete your own messages");
  }

  await Message.findByIdAndDelete(messageId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Message deleted successfully"));
});

export {
  sendMessage,
  getInboxByTier,
  getConversationMessages,
  setupAutoWelcome,
  getAutoWelcomeConfig,
  triggerAutoWelcome,
  deleteMessage,
};
