import mongoose from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const createPlaylist = asyncHandler(async (req, res) => {
  try {
    const { name, description, videoId } = req.body;
    console.log("name, description, videoId", name, description, videoId);
    
  
    //TODO: create playlist
    if (!name ) {
      throw new ApiError(400, "Playlist name not found");
    }
  

  
    const userId = req.user._id
    
    let videos = [];
    if (videoId && Array.isArray(videoId)) {
      videos = videoId;
    }
  
    const playlist = new Playlist({
      name,
      description,
      user: userId,
      videos: videos,
    });

    await playlist.save();
  
    return res
      .status(200)
      .json(new ApiResponse(200, playlist, "Playlist created"));
  
  } catch (error) {
    throw new ApiError(400,error?.message || "Some error in createPlaylist")
  }
  
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    //TODO: get user playlists
  
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      throw new ApiError(400, "User not found ad cannot get playlist");
    }

    

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
  
    const userPlaylists = await Playlist.aggregate([
    { $match: { owner: new mongoose.Types.ObjectId(userId) } },
    { $project: { name: 1, description: 1, videos: 1 } },
    { $skip: skip },
    { $limit: limit }
  ]);
  
  
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
          playlists: userPlaylists,
          total: totalPlaylists,
          page,
          limit,
        },
        "User playlists fetched successfully"
      )
    );
  } catch (error) {
    throw new ApiError(400,error?.message || "Some error in getUserPlaylists")
  }

 
});

const getPlaylistById = asyncHandler(async (req, res) => {
  try {
    const { playlistId } = req.params;
    //TODO: get playlist by id
    if(!playlistId || !mongoose.Types.ObjectId.isValid(playlistId)){
      throw new ApiError(
          400,
          "PLaylist ID is invalid"
      )
    }
  
  
  
  
    const playlist = await Playlist.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(playlistId) },
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
  } catch (error) {
    throw new ApiError(400,error?.message || "Some error in getPlaylistById")
  }



});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  try {
    const { playlistId, videoId } = req.params;
    console.log("playlistId, videoId", playlistId, videoId);
    
    if(!playlistId || !videoId || !mongoose.Types.ObjectId.isValid(playlistId) || 
    !mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400,"PLaylist Id or Video Id is wrong")
    }
  
    
    const playlist = await Playlist.findById(playlistId).populate('videos');

    if (!playlist) {
  throw new ApiError(404, "Playlist not found");
}


    await Playlist.findOneAndUpdate(
      {_id: playlistId, owner: req.user._id},
      {
        $addToSet: {  videoId } // Use $addToSet to avoid duplicates
      },
      { new: true, runValidators: true } // Return the updated document and validate
    )
  


  
    return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        playlist,
        "Video is added in playlist successfully"
      )
    )
  } catch (error) {
    throw new ApiError(400,error?.message || "Some error in addVideoToPlaylist ")
  }
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  try {
    const { playlistId, videoId } = req.params;
    // TODO: remove video from playlist
    if(!playlistId || !videoId || !mongoose.Types.ObjectId.isValid(playlistId) || 
    !mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400,"PLaylist Id or Video Id is wrong")
    }
    const playlist = await Playlist.findByIdAndDelete(
      playlistId,
      {
        $pull:{
          videos:videoId
        }
      }
    )
  
  
  
  
    if (playlist.videos.includes(videoId) === "") {
      throw new ApiError(400, "Playlist is already empty");
    }
  
  
      return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          playlist,
          "Video removed from playlist"
        )
      )
   
  
  
  
  } catch (error) {
    throw new ApiError(400,error?.message || "Some error in removeVideoFromPlaylist")
  }
});

const deletePlaylist = asyncHandler(async (req, res) => {
try {
    const { playlistId } = req.params;
    // TODO: delete playlist
  
    if(!playlistId || !mongoose.Types.ObjectId.isValid(playlistId)){
      throw new ApiError(400,"Playlist do not exist")
    }
  
    const playlist = await Playlist.findOneAndDelete({
      _id:playlistId,
      owner:req.user._id
    })
    console.log("playlist", playlist);
    

    
  
    return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        playlist,
        "Playlist delete successfully"
      )
    )
} catch (e) {
  throw new ApiError(400,e?.message || "Some error in deletePlaylist")
}
});

const updatePlaylist = asyncHandler(async (req, res) => {
 try {
   const { playlistId } = req.params;
   const { name, description } = req.body;
   //TODO: update playlist
 
   if(!playlistId || !mongoose.Types.ObjectId.isValid(playlistId)){
     throw new ApiError(400,"Playlist do not exist to update")
   }
 
   if(!name || !description){
     throw new ApiError(400,"Playlist name and description is do not exist to update")
   }
 
   const playlist = await Playlist.findByIdAndUpdate(
     {
     _id:playlistId,
     owner:req.user._id
   },
     {
       $set:{
         name,description
       }
     },
     {
       new : true
     }
 )
 
     if(!playlist){
       throw new ApiError(400,"Playlist not updated or you are not owner")
     }
 
     return res
     .status(200)
     .json(
       new ApiResponse(
         200,
         playlist,
         "Playlist updated successfully"
       )
     )
 } catch (error) {
  throw new ApiError(400,error?.message || "Some error in updatePlaylist")
 }
});





export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
