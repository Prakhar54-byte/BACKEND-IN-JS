import { Channel } from "../models/channel.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

// import { upload } from "../middlewares/multer.middleware";

import mongoose from "mongoose";
// import { log } from "node:console";

const createChannel= asyncHandler(async(req = requestAnimationFrame,res)=>{
    const {name,description} = requestAnimationFrame.body;
    const userId = requestAnimationFrame.user._id;

    console.log("Headers:", requestAnimationFrame.headers);
  console.log("Body:", requestAnimationFrame.body);
  console.log("File:", requestAnimationFrame.file); 

    console.log("Creating channel with data:", );
    console.log("Request body:", requestAnimationFrame.body);
    

    if(!name || !description){
        throw new ApiError(400,"Name and description are required");
    }

    const user = await User.findById(userId);
    if(!user){
        throw new ApiError(404,"User not found");
    }
    const existingChannel = await Channel.findOne({ name, owner: userId });
    if(existingChannel){
        throw new ApiError(400,"Channel with this name already exists for this user");
    }
    const avatarPath = requestAnimationFrame.file ? requestAnimationFrame.file.path : user.avatar;
    const bannerPath = requestAnimationFrame.banner ? requestAnimationFrame.banner.path : "";
    //  if(!bannerPath){
    // //     // channel.banner = bannerPath;
    // //     user.coverImage = bannerPath;
    // //     await user.save();
    // // }
    console.log("Avatar Path:", avatarPath)
    // console.log("Banner Path:", bannerPath);
    
    if(!avatarPath && !bannerPath){
        throw new ApiError(400,"At least one of avatar or banner must be provided");
    }

    // console.log("RequestAnimation",requestAnimationFrame.path);
    const channel = await Channel.create({
        name,
        description,
        owner: userId,
        avatar: requestAnimationFrame.file ? requestAnimationFrame.file.path : "",
        // banner: requestAnimationFrame.file ? requestAnimationFrame.file.path : ""
    });
    
    
   

    return res.status(201).json(new ApiResponse(201,channel,"Channel created successfully"));
})  


 const updateChannel = asyncHandler(async(req,res)=>{
    const {name,description} = req.body;
    const channelId = req.params.channelId;
    const userId = req.user.id;

    if(!name || !description){
        throw new ApiError(400,"Name and description are required");
    }

    if(!mongoose.isValidObjectId(channelId)){
        throw new ApiError(400,"Invalid channel ID");
    }

    const channel = await Channel.findById(channelId);
    if(!channel){
        throw new ApiError(404,"Channel not found");
    }

    if(channel.owner.toString() !== userId){
        throw new ApiError(403,"You are not authorized to update this channel");
    }

    channel.name = name;
    channel.description = description;
    
    if(req.file){
        channel.avatar = req.file.path;
    }
    
    await channel.save();

    return res.status(200).json(new ApiResponse(200,channel,"Channel updated successfully"));
}) 
 const deleteChannel = asyncHandler(async(req,res)=>{
    const channelId = req.params.channelId;
    const userId = req.user.id;

    if(!mongoose.isValidObjectId(channelId)){
        throw new ApiError(400,"Invalid channel ID");
    }

    const channel = await Channel.findById(channelId);
    if(!channel){
        throw new ApiError(404,"Channel not found");
    }

    if(channel.owner.toString() !== userId){
        throw new ApiError(403,"You are not authorized to delete this channel");
    }

    await channel.remove();

    return res.status(200).json(new ApiResponse(200,{}, "Channel deleted successfully"));
})
 const getChannelProfile = asyncHandler(async(req,res)=>{
    const channelId = req.params.channelId;

    if(!mongoose.isValidObjectId(channelId)){
        throw new ApiError(400,"Invalid channel ID");
    }

    const channel = await Channel.findById(channelId).populate("owner", "username avatar");

    if(!channel){
        throw new ApiError(404,"Channel not found");
    }

    return res.status(200).json(new ApiResponse(200,channel,"Channel profile fetched successfully"));
})
 const getChannelSubscribers = asyncHandler(async(req,res)=>{
    const channelId = req.params.channelId;

    if(!mongoose.isValidObjectId(channelId)){
        throw new ApiError(400,"Invalid channel ID");
    }

    const channel = await Channel.findById(channelId).populate("subscribers", "username avatar");

    if(!channel){
        throw new ApiError(404,"Channel not found");
    }

    return res.status(200).json(new ApiResponse(200,channel.subscribers,"Channel subscribers fetched successfully"));
})
 const toggleSubscription = asyncHandler(async(req,res)=>{
    const channelId = req.params.channelId;
    const userId = req.user.id;

    if(!mongoose.isValidObjectId(channelId)){
        throw new ApiError(400,"Invalid channel ID");
    }

    const user = await User.findById(userId);
    if(!user){
        throw new ApiError(404,"User not found");
    }

    const channel = await Channel.findById(channelId);
    if(!channel){
        throw new ApiError(404,"Channel not found");
    }

    const subscription = await Subscription.findOne({ subscriber: userId, channel: channelId });

    if(subscription){
        await subscription.remove();
        return res.status(200).json(new ApiResponse(200,{}, "Unsubscribed successfully"));
    } else {
        const newSubscription = new Subscription({
            subscriber: userId,
            channel: channelId
        });
        await newSubscription.save();
        
        return res.status(200).json(new ApiResponse(200,{}, "Subscribed successfully"));
    }
})
 const getUserChannels = asyncHandler(async(req,res)=>{
    const userId = req.user.id;

    const channels = await Channel.find({ owner: userId }).populate("owner", "username avatar");

    return res.status(200).json(new ApiResponse(200,channels,"User channels fetched successfully"));
})
 const uploadChannelAvatar = asyncHandler(async(req,res)=>{
    if(!req.file){
        throw new ApiError(400,"No file uploaded");
    }

    return res.status(200).json(new ApiResponse(200,{avatar: req.file.path},"Channel avatar uploaded successfully"));
})
 const uploadChannelBanner = asyncHandler(async(req,res)=>{
    if(!req.file){
        throw new ApiError(400,"No file uploaded");
    }

    return res.status(200).json(new ApiResponse(200,{banner: req.file.path},"Channel banner uploaded successfully"));
})


 const getUserChannel = asyncHandler(async(req,res)=>{
    const userId = req.user.id;

    const channel = await Channel.findOne({ owner: userId });

    if(!channel){
        // Return 200 with null if no channel, so frontend can handle it gracefully
        return res.status(200).json(new ApiResponse(200, null, "User has no channel"));
    }

    return res.status(200).json(new ApiResponse(200,channel,"User channel fetched successfully"));
})

export {
    createChannel,
    updateChannel,
    deleteChannel,
    getChannelProfile,
    getChannelSubscribers,
    toggleSubscription,
    getUserChannels,
    getUserChannel,
    uploadChannelAvatar,
    uploadChannelBanner
};