import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    if(!videoId || mongoose.Types.isValidObjectId(videoId)){
        throw new ApiError(400,"Video ID does not exit to toggle like on video")
    }

    const existingLike = await Like.findOne({
        video:videoId,
        likeBy:req.user._id
    })
let liked 
    if(existingLike){
        await existingLike.remove()
        liked = false
    }else{
        const newLike = await Like.create(
            {
                vide:videoId,
                likeBy:req.user._id
            }
        )
        liked = true
    }


    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            liked,
            "Like toggled successfully by user "
        )
    )

    
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment

})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}