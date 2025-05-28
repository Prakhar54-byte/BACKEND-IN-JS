import mongoose from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Helper to validate ObjectId
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const toggleLike = asyncHandler(async (req, res, type) => {
  const { id } = req.params;
  if (!id || !isValidObjectId(id)) {
    throw new ApiError(400, `${type} ID is invalid`);
  }

  const filter = { likedBy: req.user._id };
  filter[type] = id;

  const existingLike = await Like.findOne(filter);
  let liked;

  if (existingLike) {
    await existingLike.deleteOne();
    liked = false;
  } else {
    await Like.create(filter);
    liked = true;
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      { liked, [type + "Id"]: id },
      `Like toggled on ${type} successfully`
    )
  );
});

export const toggleVideoLike = (req, res) => toggleLike(req, res, "video");
export const toggleCommentLike = (req, res) => toggleLike(req, res, "comment");
export const toggleTweetLike = (req, res) => toggleLike(req, res, "tweet");



export const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Find all likes by user where video is present
  const likes = await Like.find({ likedBy: userId, video: { $exists: true } })
    .populate({
      path: "video",
      select: "title url description" // Adjust fields as needed
    })
    .select("video createdAt");

  const likedVideos = likes
    .filter(like => like.video) // Filter out null videos
    .map(like => like.video);

  return res.status(200).json(
    new ApiResponse(
      200,
      { videos: likedVideos },
      "Liked videos fetched successfully"
    )
  );
});

export const getLikedComments = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const likes = await Like.find({ likedBy: userId, comment: { $exists: true } })
    .populate({
      path: "comment",
      select: "content createdAt" // Adjust fields as needed
    })
    .select("comment createdAt");

  const likedComments = likes
    .filter(like => like.comment)
    .map(like => like.comment);

  return res.status(200).json(
    new ApiResponse(
      200,
      { comments: likedComments },
      "Liked comments fetched successfully"
    )
  );
});

export const getLikedTweets = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const likes = await Like.find({ likedBy: userId, tweet: { $exists: true } })
    .populate({
      path: "tweet",
      select: "content createdAt" // Adjust fields as needed
    })
    .select("tweet createdAt");

  const likedTweets = likes
    .filter(like => like.tweet)
    .map(like => like.tweet);

  return res.status(200).json(
    new ApiResponse(
      200,
      { tweets: likedTweets },
      "Liked tweets fetched successfully"
    )
  );
});


