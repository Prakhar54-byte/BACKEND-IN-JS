import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscrption } from "../models/subscription.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { channel, subscribe } from "diagnostics_channel";
import { query } from "express";
// import

const toggleSubscription = asyncHandler(async (req, res) => {
  try {
    const { channelId } = req.params;
    // TODO: toggle subscription
    // 1. User exist  by user id
    // 2. Channel exist by channel id
    // 3. Check if user is already subscribed to the channel
    // 4. If subscribed, then remove the subscription
    // 5. If not subscribed, then add the subscription
  
  
  
  
    const userId = req.user.id;
    // caches.log(userId);
  
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(400, "Not a User");
    }
  
    const channel = await User.findById(channelId);
  
    if (!channel) {
      throw new ApiError(400, "Channel dose not exist");
    }
    const subcribersCount = await Subscrption.findOne({
      subscrption: userId,
      channel: channelId,
    });
  
    if (subcribersCount) {
      await subcribersCount.remove();
      return res.status(200).json(new ApiResponse(200, {}, "Unsbcripbed"));
    } else {
      const newSub = new Subscrption({
        subscrption: userId,
        channel: channelId,
      });
      await newSub.save();
  
      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            {},
            `Successfully subscribed to ${channel.username}`
          )
        );
    }
  } catch (error) {
    console.error("Error in toggleSubscription:", error);
    throw new ApiError(500, "Internal Server Error");
    
  }
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  // const userId = req.body.user.id;
  try {
    const { channelId } = req.params;
  
    // 1. Check if the subscriber exists
    const subscriber = await User.findById(channelId);
    if (!subscriber) {
      throw new ApiError(400, "Not a valid subscriber");
    }
  
    // 2. Fetch subscriptions where the subscriber is the user
    const subscribed = await Subscrption.find({ subscrption: channelId });
  
    // 3. Check if the user has any subscriptions
    if (subscribed.length === 0) {
      throw new ApiError(400, "You are not subscribed to any channels");
      
    }
  
    // 4. Extract the channel IDs from the subscriptions
    const subscribedChannelIds = subscribed.map((sub) => sub.channel);
  
    // 5. Fetch the channels the user has subscribed to
    const subscribedChannels = await User.find({ _id: { $in: subscribedChannelIds } });
  
    // 6. Return the list of subscribed channels
    return res
      .status(200)
      .json(new ApiResponse(200, subscribedChannels, "List of channels subscribed to"));
  } catch (error) {
    console.error("Error in getSubscribedChannels:", error);
    throw new ApiError(500, "Internal Server Error");
    
  }
});




// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  // 1.Get Channel ID from Request:
  // 2.Check if Channel Exists:
  // 3.Fetch Subscribers:
  // 4.Populate Subscriber Details
  // 5.Return Subscriber List
  // 6.Handle Edge Cases

  const userId = req.user._id;

  console.log("This is confid",userId.channelId);
  

  // Validate userId
  if (!userId) {
    throw new ApiError(400, "User ID is required");
  }
  

  
    try {
      // Aggregate to get subscribed channels and their total videos
    const subscribedChannels = await Subscrption.aggregate([
      { $match: { subscriber: userId } },
      {
        $lookup: {
          from: "users",
          localField: "channel",
          foreignField: "_id",
          as: "channelDetails",
        },
      },
      { $unwind: "$channelDetails" },
      {
        $lookup: {
          from: "videos",
          localField: "channel",
          foreignField: "owner",
          as: "videos",
        },
      },
      {
        $addFields: {
          totalVideos: { $size: "$videos" },
        },
      },
      {
        $project: {
          "channelDetails.username": 1, 
          "channelDetails.avatar": 1,
          totalVideos: 1,
        },
      },
    ]);

    res.status(200).json({
      message: "Subscribed channels fetched successfully",
      data: subscribedChannels,
    });
      
    } catch (error) {
      throw new ApiError(500, "Internal Server Error");
      
    }
  
  // //   let query = "";
  // // 3. Fetch Subscribers
  // const subcrptions = await Subscrption.find({ channel: channelId });

  // // 4. Handle No Subscribers (Edge Case)
  // if (subcrptions.length === 0) {
  //   return res
  //     .status(200)
  //     .json(new ApiResponse(200, [], "No subscribers found for this channel"));
  // }
  // // 5. Populate Subscriber Details (from the 'subscrption' field)
  // const subscribeId = subcrptions.map((sub) => sub.subscrption);
  // const subscribers = await User.find({ _id: { $in: subscribeId } }); // Find subscribers

  // return res
  //   .status(200)
  //   .json(
  //     new ApiResponse(200, subscribers, "List of subscribers for the channel")
  //   );
});



export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
