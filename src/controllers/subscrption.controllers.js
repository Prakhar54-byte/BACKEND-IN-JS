import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { triggerAutoWelcome } from "./tweet.controllers.js";

// Renamed 'Subscrption' to 'Subscription' for clarity, assuming model export is 'Subscription'
// Make sure this matches your model file. I'll use 'Subscrption' to match your code.

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  const userId = req.user._id; // Corrected: req.user._id is standard

  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  // Check if channel exists
  const channel = await User.findById(channelId);
  if (!channel) {
    throw new ApiError(404, "Channel does not exist");
  }

  // Check if subscription already exists
  // *** FIX: Using 'subscriber' field name ***
  const existingSubscription = await Subscription.findOne({
    subscriber: userId,
    channel: channelId,
  });

  if (existingSubscription) {
    // Already subscribed, so remove it
    await Subscription.findByIdAndDelete(existingSubscription._id);

    return res
      .status(200)
      .json(new ApiResponse(200, { subscribed: false }, "Unsubscribed successfully"));
  } else {
    // Not subscribed, so create it
    // *** FIX: Using 'subscriber' field name ***
    await Subscription.create({
      subscriber: userId,
      channel: channelId,
    });

    // Trigger auto-welcome message
    triggerAutoWelcome(userId, channelId).catch(err => 
      console.error("Auto-welcome trigger error:", err)
    );

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { subscribed: true },
          `Successfully subscribed to ${channel.username}`
        )
      );
  }
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Not a valid user ID");
  }

  // *** FIX: This is the correct logic for this route ***
  // Use aggregation to find channels the user is subscribed to
  const subscribedChannels = await Subscription.aggregate([
    {
      $match: {
        // *** FIX: Using 'subscriber' field name ***
        subscriber: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channelDetails",
      },
    },
    {
      $unwind: "$channelDetails",
    },
    {
      $project: {
        _id: 1,
        channel: {
          _id: "$channelDetails._id",
          username: "$channelDetails.username",
          fullName: "$channelDetails.fullName",
          avatar: "$channelDetails.avatar",
          coverImage: "$channelDetails.coverImage",
        },
      },
    },
  ]);

  if (subscribedChannels.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "User is not subscribed to any channels"));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribedChannels,
        "Subscribed channels fetched successfully"
      )
    );
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(channelId)) {
    throw new ApiError(400, "Invalid channel ID");
  }

  // Check if channel exists
  const channel = await User.findById(channelId);
  if (!channel) {
    throw new ApiError(404, "Channel does not exist");
  }

  // *** FIX: This is the correct logic for this function's name ***
  // Find all subscriptions *to* this channel
  const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber", // field in Subscription model
        foreignField: "_id",     // field in User model
        as: "subscriberDetails",
      },
    },
    {
      $unwind: "$subscriberDetails",
    },
    {
      $project: {
        _id: 0,
        subscriber: {
          _id: 1,
          username: 1,
          fullName: 1,
          avatar: 1,
        },
      },
    },
  ]);

  if (subscribers.length === 0) {
    return res
      .status(200)
      .json(new ApiResponse(200, [], "This channel has no subscribers"));
  }
  
  // Extract just the user details
  const subscriberList = subscribers.map(sub => sub.subscriber);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscriberList,
        "Channel subscribers fetched successfully"
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };