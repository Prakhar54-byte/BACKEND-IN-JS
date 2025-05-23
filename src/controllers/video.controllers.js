import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import Joi from 'joi';


const getAllVideos = asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
        //TODO: get all videos based on query, sort, pagination
        if (!userId || mongoose.Types.isValidObjectId(userId)) {
            throw new ApiError(400, "User Id is incorrect to get all videos")
        }
        if (query) {
            matchStage.$match.$or = [
                { title: { $regex: query, $options: "i" } },
                { description: { $regex: query, $options: "i" } }
            ];
        }
    
        const videos = await Video.aggregate([
            {
                $match: {
                    owner: mongoose.Types.ObjectId(userId)
                }
            },
            {
                $lookup: {
                    from: "users", // Collection name for owners (e.g., users)
                    localField: "owner", // Field in the video document
                    foreignField: "_id", // Field in the user document
                    as: "ownerDetails"
                }
            },
            {
                $unwind: "$ownerDetails" // Unwind the owner details if it's an array
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    description: 1,
                    "ownerDetails.name": 1, // Example: Include owner name
                    "ownerDetails.email": 1 // Example: Include owner email
                }
            },
          
            {
                $skip: (page - 1) * limit
            },
            {
                $limit: limit
            }, {
                // The $sort stage in a MongoDB aggregation pipeline
                $sort: {
                    // Use the value of the sortBy variable as the field name to sort by
                    [sortBy]: sortType // sortType determines the order: 1 for ascending, -1 for descending
                }
            },
            {
                
            }
        ])
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { videos },
                "All videos get"
            )
        )
    } catch (error) {
        throw new ApiError(400, error?.message || "Some error in getAllVideos")
        
    }


})

const publishAVideo = asyncHandler(async (req, res) => {
    try {
        const { title, description } = req.body
        // TODO: get video, upload to cloudinary, create video
        if (!title || !description) {
            throw new ApiError(400, "Something  went wrong in title or description to publish ")
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



        const videos = await Video.findOne(
            {
                title: title,
                description: description
            }
        )

        if (!videos) {
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
        } else {

            await uploadOnCloudinary(videos.videoFiles)
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { videos, newVideo },
                    "Video publish"
                )
            )

    } catch (e) {
        throw new ApiError(400, e?.message || "Some error in publishAVideo")
    }

})

const getVideoById = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params
        //TODO: get video by id
        if (!videoId || mongoose.Types.isValidObjectId(videoId)) {
            throw new ApiError(400, "Video Id is incorrect to get video")
        }

        const videos = await Video.aggregate([
            {
                $match: {
                    _id: mongoose.Types.ObjectId(videoId)
                }
            },
            {
                $lookup: {
                    from: "users", // Collection name for owners (e.g., users)
                    localField: "owner", // Field in the video document
                    foreignField: "_id", // Field in the user document
                    as: "ownerDetails"
                }
            },
            {
                $unwind: "$ownerDetails" // Unwind the owner details if it's an array
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    description: 1,
                    "ownerDetails.name": 1, // Example: Include owner name
                    "ownerDetails.email": 1 // Example: Include owner email
                }
            }
        ]);
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { videoId, videos },
                    "All videos get"
                )
            )
    } catch (e) {
        throw new ApiError(400, e?.message || "Some error in getVideoById")
    }
})

const updateVideo = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params
        //TODO: update video details like title, description, thumbnail
        if (!videoId || mongoose.Types.isValidObjectId(videoId)) {
            throw new ApiError(400, "Video Id is incorrect to update video")
        }
    
        const { title, description, thumbnail } = req.body;
        const updatedVideo = await Video.findOneAndUpdate(
            {
                _id: videoId
            },
            {
                title,
                description,
                thumbnail
            },
            {
                new: true
            }
        );
    
        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { videoId, updatedVideo },
                    "Video updated"
                )
            )
    
    } catch (error) {
        throw new ApiError(400, error?.message || "Some error in updateVideo")
        
    }

})

const deleteVideo = asyncHandler(async (req, res) => {
   try {
     const { videoId } = req.params
     //TODO: delete video
     if(!videoId || mongoose.Types.isValidObjectId(videoId)){
         throw new ApiError(400, "Video Id is incorrect to delete video")
     }
 
     const video = await Video.findOneAndDelete({
         _id: videoId
     });
     if(!video){
         throw new ApiError(404, "Video not found")
     }
     return res
     .status(200)
     .json(
         new ApiResponse(
             200,
             { videoId, video },
             "Video deleted"
         )
     )
   } catch (error) {
       throw new ApiError(400, error?.message || "Some error in deleteVideo")
    
   }
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params
    
        if(!videoId || mongoose.Types.isValidObjectId(videoId)){
            throw new ApiError(400, "Video Id is incorrect to toggle publish status")
        }
    
        const video = await Video.findById(videoId);
    
        if(video){
            if(!video.isPublished){
                video.isPublished = true;
            }else{
                video.isPublished = false;
            }
        }else{
            throw new ApiError(404, "Video not found")
    
        }
    
        return res
        .status(200)
        .json
            (new ApiResponse(
                200,
                { videoId, video },
                "Video publish status toggled"
            ))
    } catch (e) {
        throw new ApiError(400, e?.message || "Some error in togglePublishStatus")
    }
    
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}