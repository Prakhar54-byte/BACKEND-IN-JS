import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
            throw new ApiError(400, "Video Id is incorrect to get all comments");
        }

        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);

        if (isNaN(pageNumber) || isNaN(limitNumber) || pageNumber < 1 || limitNumber < 1) {
            throw new ApiError(400, "Page and limit must be positive integers");
        }

        const skip = (pageNumber - 1) * limitNumber;

        const comments = await Comment.aggregate([
            { $match: { video: new mongoose.Types.ObjectId(videoId) } },
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
                content: 1,
                video: 1,
                createdAt: 1,
                updatedAt: 1,
                owner: {
                    _id: { $ifNull: ["$ownerDetails._id", null] },
                    username: { $ifNull: ["$ownerDetails.username", "Unknown"] },
                    fullName: { $ifNull: ["$ownerDetails.fullName", "Unknown User"] },
                    avatar: { $ifNull: ["$ownerDetails.avatar", null] }
                }
            }},
            { $sort: { createdAt: -1 } },
            { $skip: skip },
            { $limit: limitNumber }
        ]);

        console.log("Comments fetched successfully:", comments.length, "comments found for video:", videoId);

        return res.status(200).json(new ApiResponse(200, comments, "All comments fetched successfully"));
    } catch (error) {
        throw new ApiError(400, error?.message || "Some error in getVideoComments");
    }
});


const addComment = asyncHandler(async (req, res) => {
    try {
        const { videoId } = req.params;
        const userId = req.user._id;
        const { content } = req.body;

        if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
            throw new ApiError(400, "Video Id is incorrect to add a comment");
        }

        if (!content || typeof content !== 'string' || content.trim() === '') {
            throw new ApiError(400, "Content is required to add a comment");
        }

        const comment = new Comment({
            content: content.trim(),
            video: videoId,
            owner: userId
        });

        await comment.save();

        return res.status(201).json(new ApiResponse(201, { videoId, comment }, "Comment added successfully"));
    } catch (error) {
        throw new ApiError(400, error?.message || "Some error in addComment");
    }
});
const updateComment = asyncHandler(async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.user._id;
        const { content } = req.body;

        if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
            throw new ApiError(400, "Comment Id is incorrect to update a comment");
        }

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            throw new ApiError(400, "User Id is incorrect to update a comment");
        }

        if (!content || typeof content !== 'string' || content.trim() === '') {
            throw new ApiError(400, "Content is required to update a comment");
        }

        const comment = await Comment.findOneAndUpdate(
            { _id: commentId, owner: userId },
            { content: content.trim() },
            { new: true }
        );

        if (!comment) {
            throw new ApiError(404, "Comment not found or you are not authorized to update");
        }

        return res.status(200).json(new ApiResponse(200, { commentId, comment }, "Comment updated successfully"));
    } catch (error) {
        throw new ApiError(400, error?.message || "Some error in updateComment");
    }
});
const deleteComment = asyncHandler(async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.user._id;

        if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
            throw new ApiError(400, "Comment Id is incorrect to delete a comment");
        }

        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            throw new ApiError(400, "User Id is incorrect to delete a comment");
        }

        const comment = await Comment.findOneAndDelete({ _id: commentId, owner: userId });

        if (!comment) {
            throw new ApiError(404, "Comment not found or you are not authorized to delete");
        }

        return res.status(200).json(new ApiResponse(200, { commentId }, "Comment deleted successfully"));
    } catch (error) {
        throw new ApiError(400, error?.message || "Some error in deleteComment");
    }
});
export {
    getVideoComments,
    addComment,
    updateComment,
    deleteComment
};