import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
   try {
     //TODO: get all comments for a video
     const {videoId} = req.params
     const {page = 1, limit = 10} = req.query
     if(!videoId || !mongoose.isValidObjectId(videoId)){
         throw new ApiError(400, "Video Id is incorrect to get all comments")
     }
 
     const comments = await Comment.aggregatePaginate(
         
         {
             $match: {
                 video: mongoose.Types.ObjectId(videoId)
             }
         },
         {
             page,
             limit
         },
         {
             $lookup: {
                 from: "users",
                 localField: "owner",
                 foreignField: "_id",
                 as: "owner"
             }
         },
         {
             $unwind: "$owner"
         },
         {
             $project: {
                 "owner.password": 0,
                 "owner.email": 0
             }
         },
         Comment.find({video: videoId}),
         {page, limit}
     )
 
     return res.status(200).json(new ApiResponse(200, {videoId, comments}, "All comments get"))
   } catch (error) {
     throw new ApiError(400, error?.message || "Some error in getVideoComments")
    
   }

})

const addComment = asyncHandler(async (req, res) => {
  try {
      // TODO: add a comment to a video
      const { videoId,userId } = req.params
      const {content} = req.body
      if(!videoId || !mongoose.isValidObjectId(videoId)){
          throw new ApiError(400, "Video Id is incorrect to add a comment")
      }
      if(!userId || !mongoose.isValidObjectId(userId)){
          throw new ApiError(400, "User Id is incorrect to add a comment")
      }
      if(!content){
          throw new ApiError(400, "Content is required to add a comment")
      }
  
      const comment = new Comment([
          {
              content,
              video: videoId,
              owner: userId
          }
      ])
      await comment.save()
      return res.status(201).json(new ApiResponse(201, {videoId, comment}, "Comment added successfully"))
  } catch (error) {
      throw new ApiError(400, error?.message || "Some error in addComment")
    
  }
})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
    
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }