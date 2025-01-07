import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description, videoId } = req.body;

  //TODO: create playlist
  if (!name || name.trim() === "") {
    throw new ApiError(400, "Playlist name not found");
  }

  const { userId } = req.params;

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(400, "User not found");
  }
  let video = [];

  if (videoId && Array.isArray(videoId)) {
    video = await VideoColorSpace.find({
      _id: {
        $in: videoId,
      },
    });
  }

  const playlist = new Playlist({
    name,
    description,
    user: userId,
    videos: video.map((video) => video._id),
  });

  await playlist.save();

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist created"));

  // console.log(name," SO this is name");
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  //TODO: get user playlists

  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "User not found ad cannot get playlist");
  }

  const user_playlist = await Playlist.aggregate([
    {
      $match: {
        owner: mongoose.Types.ObjectId(userId),
      },
    },
    {
      $lookup: {
        from: "playlists",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: {
          $project: {
            name: 1,
            description: 1,
            video: 1,
          },
        },
      },
    },
  ]);

  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

//   const userPlaylists = await Playlist.aggregate([
//     { $match: { owner: mongoose.Types.ObjectId(userId) } },
//     { $project: { name: 1, description: 1, videos: 1 } },
//     { $skip: skip },
//     { $limit: limit },
//   ]);

  const totalPlaylists = await Playlist.countDocuments({ owner: userId });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        // playlists: userPlaylists,
        playlists: user_playlist,
        total: totalPlaylists,
        page,
        limit,
      },
      "User playlists fetched successfully"
    )
  );

 
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  //TODO: get playlist by id
  if(!playlistId || !mongoose.Types.ObjectId(playlistId)){
    throw new ApiError(
        400,
        "PLaylist ID is invalid"
    )
  }

//   const playlist = await Playlist.aggregate([
//     {
//         $match:{
//             owner:mongoose.Types.ObjectId(playlistId)
//         }
//     },{
//         $lookup:{
//             from:"playlists",
//             localField:"playlist",
//             foreignField:"_id",
//             as:"owner",

//         }
//     },
//     {
//         $unwind:"$owner"
//     },
//     {
//         $project:{
//             name:1,
//             description:1,
//             video:1,
//             owner:1,
//         }
//     }
//   ])


  const playlist = await Playlist.aggregate([
    {
      $match: { _id: mongoose.Types.ObjectId(playlistId) },
    },
    {
      $lookup: {
        from: "users", 
        localField: "owner",
        foreignField: "_id",
        as: "ownerDetails",
      },
    },
    {
      $unwind: { path: "$ownerDetails", preserveNullAndEmptyArrays: true },
    },
    {
      $lookup: {
        from: "videos", 
        localField: "videos",
        foreignField: "_id",
        as: "videoDetails",
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        ownerDetails: { username: 1, email: 1 }, 
        videoDetails: { title: 1, url: 1 }, 
      },
    },
  ]);

  return res
  .status(200)
  .json(
    new ApiResponse(
        200,
        playlist,
        "Playlist by id fetched"
    )
  )



});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;
  // TODO: remove video from playlist
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  // TODO: delete playlist
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;
  //TODO: update playlist
});

createPlaylist();

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
