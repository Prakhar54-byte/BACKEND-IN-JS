import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { formatDistanceToNowStrict } from 'date-fns'; // Importing date-fns for date formatting
import { parse } from "path"
import { title } from "process"
import { Channel } from "../models/channel.model.js" 
import fs from "fs"
import path from "path"
import { fileURLToPath } from 'url';
// import { log } from "console"

// import { User } from "../models/user.model.js"

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..', '..');
const publicDir = path.join(backendRoot, 'public');

const toPublicUrlPath = (inputPath) => {
    if (!inputPath || typeof inputPath !== "string") return inputPath;
    const normalized = inputPath.replace(/\\/g, "/");
    // Keep absolute URLs (e.g., cloud storage)
    if (/^https?:\/\//i.test(normalized)) return normalized;
    const publicMarker = "/public/";
    const idx = normalized.lastIndexOf(publicMarker);
    if (idx !== -1) {
        return normalized.slice(idx + publicMarker.length);
    }
    if (normalized.startsWith("public/")) {
        return normalized.slice("public/".length);
    }
    // If it's an absolute filesystem path not under /public, it's not web-accessible.
    if (normalized.startsWith("/")) return "";
    return normalized;
};

const toPublicDbPath = (inputPath) => {
    if (!inputPath || typeof inputPath !== "string") return inputPath;
    const normalized = inputPath.replace(/\\/g, "/");
    if (/^https?:\/\//i.test(normalized)) return normalized;
    const publicMarker = "/public/";
    const idx = normalized.lastIndexOf(publicMarker);
    if (idx !== -1) {
        // Store as "public/..." so it can later be converted to a URL path.
        return normalized.slice(idx + 1);
    }
    if (normalized.startsWith("public/")) return normalized;
    return normalized;
};

const getAllVideos = asyncHandler(async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            query = "",
            sortBy = "createdAt",
            sortType = "desc",
            userId : queryUserId
        } = req.query;

      const  userId = req.user?.id || queryUserId



        
    

        
        
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

        const aggregationPipeline = []

        //1. Initial filter (owner if userId provided)
        if(userId && mongoose.Types.ObjectId.isValid(userId)){
            aggregationPipeline.push({
                $match:{
                    owner : new mongoose.Types.ObjectId(userId)
                }
            })
        }

        // 2 . Owner lookup
        aggregationPipeline.push({
            $lookup:{
                from:"users",
                localField:"owner",
                foreignField:"_id",
                as:"ownerDetails"
            }
        },
    {$unwind:"$ownerDetails"})

        // 3. Search filter (title/desp/username)
        if(query){
            aggregationPipeline.push({
                $match:{
                    $or:[
                        {title:{$regex:query,$options:'i'}},
                        {description:{$regex:query,$options:"i"}},
                        {"ownerDetails.username":{$regex:query,$options:"i"}}
                    ]
                }
            })
        }

        //4 . Sorting and pagination
        aggregationPipeline.push(
            {$sort:{[sortBy]:sortOrder}},
            {$skip:(pageNum - 1)*limitNum},
            {$limit:limitNum},
            {
                $project:{
                    _id:1,
                    title:1,
                    description:1,
                    thumbnail:1,
                    views:1,
                    duration:1,
                    createdAt:1,
                    owner:{
                        _id:"$ownerDetails._id",
                        username:"$ownerDetails.username",
                        avatar:"$ownerDetails.avatar"
                    }
                }
            }

        )
    
        const videos = await Video.aggregate(aggregationPipeline)

        // Ensure frontend receives URL paths (e.g., "temp/foo.jpg") not absolute filesystem paths.
        for (const v of videos) {
            v.thumbnail = v.thumbnail ? toPublicUrlPath(v.thumbnail) : "";
        }
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
        throw new ApiError(400, error?.message.toString() || "Some error in getAllVideos")
        
    }


})



import { addVideoToQueue } from "../queues/videoProcessing.queue.js";
import { log } from "console"

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if (!title || !description) {
        throw new ApiError(400, "Title and description are required.");
    }

    // Check if user has a channel
    const channel = await Channel.findOne({ owner: req.user._id });
    if (!channel) {
        throw new ApiError(403, "You must have a channel to upload videos.");
    }

    const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    if (!videoFileLocalPath) {
        throw new ApiError(400, "Video file is required.");
    }

    // Create a new video document with a 'processing' status
    const video = await Video.create({
        title,
        description,
        videoFiles: toPublicDbPath(videoFileLocalPath), // Store under public/ so API can expose a URL path
        thumbnail: thumbnailLocalPath ? toPublicDbPath(thumbnailLocalPath) : "",
        owner: req.user._id,
        duration: 0, // Will be updated by the worker
        views: 0,
        isPublished: true, // Published immediately so it shows on frontend
        processingStatus: "processing", // Matches API/tests; worker will finalize to completed/failed
    });

    // Add video to the processing queue
    try {
        await addVideoToQueue(video._id, videoFileLocalPath);
    } catch (err) {
        // Queue (Redis) not available: fall back to serving the uploaded file directly.
        await Video.findByIdAndUpdate(video._id, {
            processingStatus: "completed",
            videoFiles: toPublicDbPath(videoFileLocalPath),
        });
    }

    return res.status(202).json(
        new ApiResponse(
            202,
            { video },
            "Video uploaded successfully and is now processing."
        )
    );
});


const getVideoById = asyncHandler(async (req, res) => {
    try {
        const  {videoId}  = req.params
        //TODO: get video by id
        if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
            throw new ApiError(400, "Video Id is incorrect to get video")
        }

        const videos = await Video.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(videoId)
                }
            },
            {
                $lookup: {
                    from: "likes",
                    localField: "_id",
                    foreignField: "video",
                    as: "likes"
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
                $addFields: {
                    likesCount: { $size: "$likes" }
                }
            },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    description: 1,
                    videoFiles: 1,
                    thumbnail: 1,
                    processingStatus: 1,
                    hlsMasterPlaylist: 1,
                    waveformUrl: 1,
                    spriteSheetUrl: 1,
                    spriteSheetVttUrl: 1,
                    introStartTime: 1,
                    introEndTime: 1,
                    duration: 1,
                    views: 1,
                    isPublished: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    owner: {
                        _id: "$ownerDetails._id",
                        username: "$ownerDetails.username",
                        fullName: "$ownerDetails.fullName",
                        avatar: "$ownerDetails.avatar"
                    },
                    likesCount: 1
                }
            }
        ]);

        if (!videos || videos.length === 0) {
            throw new ApiError(404, "Video not found");
        }

        // Return single video object, not array
        const video = videos[0];

        // Always expose an immediately playable MP4 path if it's web-accessible.
        // HLS is only exposed once processing has completed.
        const isReady = video.processingStatus === "completed";
        video.videoFile = toPublicUrlPath(video.videoFiles) || "";
        video.thumbnail = video.thumbnail ? toPublicUrlPath(video.thumbnail) : "";

        video.waveformUrl = video.waveformUrl ? toPublicUrlPath(video.waveformUrl) : "";
        video.spriteSheetUrl = video.spriteSheetUrl ? toPublicUrlPath(video.spriteSheetUrl) : "";
        video.spriteSheetVttUrl = video.spriteSheetVttUrl ? toPublicUrlPath(video.spriteSheetVttUrl) : "";

        

        

        video.hlsMasterPlaylist = isReady && video.hlsMasterPlaylist ? toPublicUrlPath(video.hlsMasterPlaylist) : "";

        // If HLS points to a local file that doesn't exist, don't advertise it.
        if (video.hlsMasterPlaylist && !/^https?:\/\//i.test(video.hlsMasterPlaylist)) {
            const absolute = path.join(publicDir, video.hlsMasterPlaylist);
            if (!fs.existsSync(absolute)) {
                video.hlsMasterPlaylist = "";
            }
            console.log("Is video is playing", fs.existsSync(absolute));
            
        }
        // Avoid dumping full video doc in logs
        

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    video,
                    "Video fetched successfully"
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
        if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
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
     if(!videoId || !mongoose.Types.ObjectId.isValid(videoId)){
         throw new ApiError(400, "Video Id is incorrect to delete video")
     }
 
     const video = await Video.findOneAndDelete({
         _id: videoId,
         owner: req.user._id
     });
     
     if(!video){
         throw new ApiError(404, "Video not found or you are not authorized to delete this video")
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
    
        if(!videoId || !mongoose.Types.ObjectId.isValid(videoId)){
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
        const { page = 1, limit = 20 } = req.query;
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skip = (pageNum - 1) * limitNum;

        // Fetch videos with owner details using aggregation
        const videos = await Video.aggregate([
            { $match: { isPublished: true } },
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limitNum },
            { $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails"
            }},
            { $unwind: {
                path: "$ownerDetails",
                preserveNullAndEmptyArrays: true
            }},
            { $project: {
                _id: 1,
                title: 1,
                description: 1,
                thumbnail: 1,
                videoFiles: 1,
                duration: 1,
                views: 1,
                isPublished: 1,
                createdAt: 1,
                owner: {
                    _id: { $ifNull: ["$ownerDetails._id", null] },
                    username: { $ifNull: ["$ownerDetails.username", "Unknown"] },
                    fullName: { $ifNull: ["$ownerDetails.fullName", "Unknown User"] },
                    avatar: { $ifNull: ["$ownerDetails.avatar", null] }
                }
            }}
        ]);

        // Normalize asset paths for the frontend (avoid leaking "public/" filesystem prefix).
        for (const v of videos) {
            v.thumbnail = v.thumbnail ? toPublicUrlPath(v.thumbnail) : "";
        }

        // Return the videos
        return res.status(200).json(
            new ApiResponse(200, videos, "Videos fetched successfully")
        );
    } catch (error) {
        console.error("Error fetching homepage videos:", error);
        throw new ApiError(500, error?.message || "Failed to fetch homepage videos");
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
    addToWatchHistory,
}