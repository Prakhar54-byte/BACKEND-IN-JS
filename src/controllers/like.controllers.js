import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
   try {
     const {videoId} = req.params
     //TODO: toggle like on video
     if(!videoId || !mongoose.Types.isValidObjectId(videoId)){
         throw new ApiError(400,"Video ID does not exit to toggle like on video")
     }
 
     const existingLike = await Like.findOne({
         video:videoId,
         likedBy:req.user._id
     })
 let liked 
     if(existingLike){
         await existingLike.remove()
         liked = false
     }else{
         const newLike = await Like.create(
             {
                 vide:videoId,
                 likedBy:req.user._id
             }
         )
         liked = true
     }
 
 
     return res
     .status(200)
     .json(
         new ApiResponse(
             200,
             {liked,videoId},
             "Like toggled successfully by user "
         )
     )
   } catch (error) {
    throw new ApiError(400,error?.message || "Some error in toggleVideoLike")
   }

    
})

const toggleCommentLike = asyncHandler(async (req, res) => {
  try {
      const {commentId} = req.params
      //TODO: toggle like on comment
      if(!commentId || !mongoose.Types.isValidObjectId(commentId)){
          throw new ApiError(400,"Comment Id does not exit to like comment")
      }
      const existingLike = await Like.findOne({
          comment:commentId,
          likedBy:req.user._id
      })
      let liked ; 
      if(existingLike){
          await existingLike.remove()
          liked = false
      }else{
          const newLike = await Like.create({
              comment:commentId,
              likedBy:req.user._id
          })
          liked = true
      }
  
      return res
      .status(200)
      .json(
          new ApiResponse(
              200,
              {commentId,likedBy},
              "Like toggled in comment by user successfully"
          )
      )
  } catch (error) {
    throw new ApiError(400,error?.message || "Some error in toggleCommentLike")
  }

})

const toggleTweetLike = asyncHandler(async (req, res) => {
  try {
      const {tweetId} = req.params
      //TODO: toggle like on tweet
      if(!tweetId || !mongoose.Types.isValidObjectId(tweetId)){
          throw new ApiError(400,"Tweet ID is does not exist to like tweet")
      }
  let liked;
      const existingLike = await Like.findOne({
          tweet:tweetId,
          likedBy:req.user._id
      },
  )
  
      if(existingLike){
          await existingLike.remove();
          liked = false
      }else{
          const newLike = await Like.create(
              {
                  tweet:tweetId,
                  likedBy:req.user._id
              },
              liked = true
          )
      }
  
      return res
      .status(200)
      .json(
          new ApiResponse(
              200,
              {tweetId,likedBy},
              "Like toggled in tweet by user successfully"
          )
      )
  
  
  }
  
  catch (error) {
    throw new ApiError(400,error?.message || "Some error in toggleTweetLike")
  }

})




const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}