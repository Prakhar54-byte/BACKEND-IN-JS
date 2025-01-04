import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { channel, subscribe } from "diagnostics_channel"
import { query } from "express"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    // 1. User exist  by user id
    // 2. 

    const userId = req.user.id

    const user = await User.findById(userId)
    if(!user){
         throw new ApiError(400,"Not a User")
    }

    const channel = await User.findById(channelId)

    if(!channel){
        throw new ApiError(400,"Channel dose not exist")
    }
    const subcribersCount = await Subscription.findOne(
        {
            subscrption:userId,
            channel:channelId
        }
    )
    
    if(subcribersCount){
        await subcribersCount.remove()
        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Unsbcripbed"


            )
        )
    }else{
        const newSub = new Subscription({
            subscrption:userId,
            channel:channelId
        })
        await newSub.save()

        return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Successfully subscribed to ${channel.username}"
            )
        )
    }

    
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    // 1.Get Channel ID from Request:
    // 2.Check if Channel Exists:
    // 3.Fetch Subscribers:
    // 4.Populate Subscriber Details
    // 5.Return Subscriber List
    // 6.Handle Edge Cases

    const {channelId} = req.params
    const channel = await User.findById(channelId)

    if(!channel){
        throw new ApiError(400,
            "Channel does not exist"
        )
    }
    let query =""
    const subcrptions = await Subscription.find({channel:channelId})
    if(subcrptions.length === 0){
        return res.status(200).json(
            new ApiResponse(200, [], "No subscribers found for this channel")
        );
    }
// 5. Populate Subscriber Details (from the 'subscrption' field)
    const subscribeId = subcrptions.map((sub)=>sub.subscrption)
    const subscribers = await User.find({ _id: { $in: subscribeId } }); // Find subscribers


    return res 
    .status(200)
    .json(
        new ApiResponse(
            200,
           subscribers,
           "List of subscribers for the channel"
        )
    )





})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}