import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { channel, subscribe } from "diagnostics_channel"


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
    const {channelId} = req.params
    
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