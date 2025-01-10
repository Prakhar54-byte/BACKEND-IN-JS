import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import Joi from 'joi';


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    if(!title || !description){
        throw new ApiError(400,"Something  went wrong in title or description to publish ")
    }



const videoValidationSchema = Joi.object({
  title: Joi.string().required(),
  description: Joi.string().required(),
  videoFile: Joi.string().required(), // Assuming Cloudinary URL
  thumbnail: Joi.string().required(),
  duration: Joi.number().required(),
});

const validateVideoPayload = (payload) => {
  const { error } = videoValidationSchema.validate(payload);
  if (error) throw new ApiError(400, error.details[0].message);
};


    
    const videos =  await Video.findOne(
        {
            title:title,
            description:description
        }
    )

    if(!videos){
        const newVideo = await Video.create({
            title,
            description,
            videoFiles: uploadedVideo.secure_url,
            thumbnail: uploadedThumbnail.secure_url,
            duration: req.body.duration,
            owner: req.user._id,
            views: 0,
            isPublished: true,
          });
          
        await uploadOnCloudinary(newVideo.videoFiles)
    }else{
       
        await uploadOnCloudinary(videos.videoFiles)
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {videos,newVideo},
            "Video publish"
        )
    )


})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail

})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}