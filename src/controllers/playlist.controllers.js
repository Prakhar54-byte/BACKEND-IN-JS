import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { User } from "../models/user.model.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description , videoId} = req.body

    //TODO: create playlist
    if(!name || name.trim()===""){
        throw new ApiError(400,"Playlist name not found")
    }

    const {userId} = req.params

    const user  = await User.findById(userId)

    if(!user){
        throw new ApiError(400,"User not found")
    }
    let video = []

    if(videoId && Array.isArray(videoId)){
        video = await VideoColorSpace.find({_id:
            {
                $in:videoId
            }
        })
    }

        const playlist = new Playlist({
            name,
            description,
            user:userId,
            videos:video.map((video)=>video._id)
        })

        await playlist.save()
    
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                playlist,
                "Playlist created"
            )
        )

    
    // console.log(name," SO this is name");
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
})

createPlaylist()

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}