import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import Joi from 'joi';
import { Readable } from "stream"
import ffmpeg from 'fluent-ffmpeg';
import fs from "fs/promises"
import tmp from 'tmp-promise';
import { request } from "https"
import { promises as f } from 'fs';
import { formatDistanceToNowStrict } from 'date-fns'; // Importing date-fns for date formatting
import { parse } from "path"

const getAllVideos = asyncHandler(async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            query = "",
            sortBy = "createdAt",
            sortType = "desc",
            userId // Default to the authenticated user's ID
        } = req.query;

    

        
        
        //TODO: get all videos based on query, sort, pagination
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            throw new ApiError(400, "User Id is incorrect to get all videos")
        }

        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);

        const matchStage = {
            $match:{
                ownerL:new mongoose.Types.ObjectId(userId)
            }
        }
        if (query) {
            matchStage.$match.$or = [
                { title: { $regex: query, $options: "i" } },
                { description: { $regex: query, $options: "i" } }
            ];
        }

        // Determine the sort order
        const sortOrder = sortType.toLowerCase() === "asc" ? 1 : -1;
    
        const videos = await Video.aggregate([
            matchStage,
            {
                $lookup: {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "ownerDetails"
                }
            },
            { $unwind: "$ownerDetails" },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    description: 1,
                    "ownerDetails.name": 1,
                    "ownerDetails.email": 1,
                    createdAt: 1
                }
            },
            { $sort: { [sortBy]: sortOrder } },
            { $skip: (pageNum - 1) * limitNum },
            { $limit: limitNum }
        ]);
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

// const publishAVideo = asyncHandler(async (req, res) => {
//     try {
//         const { title, description } = req.body
//         // TODO: get video, upload to cloudinary, create video
//         if (!title || !description) {
//             throw new ApiError(400, "Something  went wrong in title or description to publish ")
//         }



//         const videoValidationSchema = Joi.object({
//             title: Joi.string().required(),
//             description: Joi.string().required(),
//             videoFile: Joi.string().required(), // Assuming Cloudinary URL
//             thumbnail: Joi.string().required(),
//             duration: Joi.number().required(),
//         });

//         const validateVideoPayload = (payload) => {
//             const { error } = videoValidationSchema.validate(payload);
//             if (error) throw new ApiError(400, error.details[0].message);
//         };



//         const videos = await Video.findOne(
//             {
//                 title: title,
//                 description: description
//             }
//         )

//         if (!videos) {
//             const newVideo = await Video.create({
//                 title,
//                 description,
//                 videoFiles: uploadedVideo.secure_url,
//                 thumbnail: uploadedThumbnail.secure_url,
//                 duration: req.body.duration,
//                 owner: req.user._id,
//                 views: 0,
//                 isPublished: true,
//             });

//             await uploadOnCloudinary(newVideo.videoFiles)
//         } else {

//             await uploadOnCloudinary(videos.videoFiles)
//         }

//         return res
//             .status(200)
//             .json(
//                 new ApiResponse(
//                     200,
//                     { videos, newVideo },
//                     "Video publish"
//                 )
//             )

//     } catch (e) {
//         throw new ApiError(400, e?.message || "Some error in publishAVideo")
//     }

// })

const getVideoDurationFromBuffer = async (fileBuffer) => {
    const tmpFile = await tmp.file({
        postfix: '.mp4' // Assuming the video file is in MP4 format
    });

    await fs.writeFile(tmpFile.path, fileBuffer);

    return new Promise((resolve, reject) => {
        const readableStream = new Readable();
        readableStream.push(fileBuffer);
        readableStream.push(null); // Signal end of the stream

        ffmpeg.ffprobe(readableStream, (err, metadata) => {
            if (err) {
                console.error("Error retrieving video duration:", err);
                return reject(new ApiError(500, "Failed to process video file"));
            }
            const duration = Math.floor(metadata.format.duration); // Duration in seconds
            resolve(duration);
        });
    });
};


const publishAVideo = asyncHandler(async (req, res) => {
    try {
        const { title, description } = req.body;

        if (!title || !description) {
            throw new ApiError(400, "Missing required fields: title, description, video file or thumbnail");
        }
        console.log("Request Files:", req.files);

        // Remove: const f = require('fs').promises;

        const videoFile = req.files?.videoFile?.[0];
        const thumbnailFile = req.files?.thumbnail?.[0];



        // Read video file buffer from disk
        const videoFileBuffer = videoFile?.path
            ? await fs.readFile(videoFile.path)
            : null;

        // Get duration from buffer
        const duration = videoFileBuffer
            ? await getVideoDurationFromBuffer(videoFileBuffer)
            : 0;

            
            
            const uploadedVideo = videoFile?.path
            ? await uploadOnCloudinary(videoFile.path)
            : null;
            
            const uploadedThumbnail = thumbnailFile?.path
            ? await uploadOnCloudinary(thumbnailFile.path)
            : null;
            
            console.log("Uploaded Video:", uploadedVideo);
            console.log("Uploaded Thumbnail:", uploadedThumbnail);
            console.log("Video Duration:", duration);
        const videoPayload = {
            title,
            description,
            videoFile: uploadedVideo ? uploadedVideo.secure_url : null,
            thumbnail: uploadedThumbnail ? uploadedThumbnail.secure_url : null,
            duration: duration || 0, // Default to 0 if duration cannot be determined
        };

        console.log("Video Payload:", videoPayload);

        // Validation
        const videoValidationSchema = Joi.object({
            title: Joi.string().required(),
            description: Joi.string().required(),
            videoFile: Joi.string().uri().required(),
            thumbnail: Joi.string().uri().required(),
            duration: Joi.number().required(),
        });

        const { error } = videoValidationSchema.validate(videoPayload);
        if (error) {
            throw new ApiError(400, error.details[0].message);
        }

        // Check if the same video already exists
        const existingVideo = await Video.findOne({ title, description });

        if (existingVideo) {
            return res.status(409).json(new ApiResponse(409, {}, "Video with the same title and description already exists"));
        }

        // Create new video
        const newVideo = await Video.create({
            title,
            description,
            videoFiles: uploadedVideo.secure_url,
            thumbnail: uploadedThumbnail.secure_url,
            duration,
            owner: req.user._id,
            views: 0,
            isPublished: true,
        });

        return res.status(201).json(
            new ApiResponse(201, { video: newVideo }, "Video published successfully")
        );

    } catch (e) {
        throw new ApiError(500, e?.message || "Failed to publish video");
    }
});


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


const homepageVideos = asyncHandler(async (req, res) => {
    try {
        // Fetch the first 16 videos sorted by the most recent
        const videos = await Video.find()
            .sort({ createdAt: -1 }) // Sort by createdAt in descending order
            .limit(16) // Limit to 16 videos
            .select("thumbnail title duration views createdAt")
            .populate("owner", "username avatar"); // Populate the owner's username and avatar
         
        // Check if no videos are found
        const formattedVideos = videos.map(video => ({
            ...video.toObject(),
            createdAt: formatDistanceToNowStrict(new Date(video.createdAt), { addSuffix: true })
          }));

        // Return the videos along with user details
        return res.status(200).json(
            new ApiResponse(200, formattedVideos, "Videos fetched successfully")
        );
    } catch (error) {
        console.error("Error fetching homepage videos:", error);
        return res.status(500).json(
            new ApiResponse(500, null, "Failed to fetch homepage videos")
        );
    }
});



const addToWatchHistory = asyncHandler(async (req, res) => {
    const { videoId } = req.params;  
    try {
        const user = await User.findById(req.user._id);  
 
        const isVideoInHistory = user.watchHistory.includes(videoId);

        const video = await Video.findById(videoId); 

        if (!video) {
            return res.status(404).json(
                new ApiResponse(404, null, "Video not found")
            );
        }
 
        if (!isVideoInHistory) {
            // Add the video to the watch history if it's not already there
            user.watchHistory.push(videoId);
            await user.save(); // Save the updated user document

            video.views += 1;
            await video.save(); // Save the updated video document

            return res.status(200).json(
                new ApiResponse(
                    200,
                    user.watchHistory,
                    "Video added to watch history successfully and view count incremented"
                )
            );
        } else {
            return res.status(200).json(
                new ApiResponse(
                    200,
                    user.watchHistory,
                    "Video is already in the watch history"
                )
            );
        }
    } catch (error) {
        return res.status(500).json(
            new ApiResponse(500, null, "Failed to add video to watch history")
        );
    }
});


export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
    homepageVideos,
    addToWatchHistory
}