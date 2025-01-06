import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //TODO: create tweet
  const { content } = req.User;

  if (!content) {
    throw new ApiError(400, "Their is nothing to tweet");
  }
  const tweet = await Tweet.create({
    content,
    owner: req.user._id,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet created successfully"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  // TODO: get user tweets
  const { userId } = req.params;

  if (!userId) {
    throw new ApiError(400, "User not found");
  }
  const tweet = await Tweet.aggregate([
    {
      $match: {
        owner: mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
      },
    },
    { $unwind: "$ownerDetails" },
    {
      $project: {
        content: 1,
        createdAt: 1,
        updatedAt: 1,
        "ownerDetails.username": 1,
        "ownerDetails.avatar": 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "User tweets fetched successfully"));
});

const updateTweet = asyncHandler(async (req, res) => {
  //TODO: update tweet
  const { content } = req.body;
  const { tweetId } = req.params;

  if (!tweetId) {
    throw new ApiError(400, "Invalid tweet ID");
  }
  if (!content || content.trim() === "") {
    throw new ApiError(400, "Content cannot be empty");
  }
  const tweet = await Tweet.findByIdAndUpdate(
    {
      _id: tweetId,
      owner: req.user._id,
    },
    {
      $set: { content },
    },
    {
      new: true,
    }
  );
  if (!tweet) {
    throw new ApiError(400, "Tweet not found or you are not owner");
  }

  return res.status(200).json(new ApiResponse(200, tweet, "Tweet added"));
});

const deleteTweet = asyncHandler(async (req, res) => {
  //TODO: delete tweet
  const { twwetId } = req.params;
  if (!isValidObjectId(twwetId)) {
    throw new ApiError(400, "Tweet ID is not found ");
  }

  const tweet = await Tweet.findByIdAndDelete({
    _id: tweetId,
    owner: req.user._id,
  });

  if (!tweet) {
    throw new ApiError(400, "Tweet not found or you're not the owner");
  }

  return res
    .status(200).json(new ApiResponse (
	    200,("Tweet is deleted")
    ))
})

export { createTweet, getUserTweets, updateTweet, deleteTweet };






































