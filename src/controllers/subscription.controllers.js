import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Apierror } from "../utils/APIerror.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asynchandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    const { channelId } = req.params;

    // Validate userId and channelId
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new Apierror("Invalid or missing user ID", 401);
    }
    if (!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new Apierror("Invalid channel ID", 400);
    }

    // Prevent self-subscription
    if (userId.toString() === channelId.toString()) {
        throw new Apierror("You cannot subscribe to yourself", 400);
    }

    // Check if subscription exists
    const existing = await Subscription.findOne({ subscriber: userId, channel: channelId });
    let subscribed;

    if (existing) {
        // Unsubscribe
        await Subscription.deleteOne({ _id: existing._id });
        subscribed = false;
    } else {
        // Subscribe
        await Subscription.create({ subscriber: userId, channel: channelId });
        subscribed = true;
    }

    // Get updated subscriber count dynamically
    const subscribersCount = await Subscription.countDocuments({ channel: channelId });

    return res.status(200).json(
        new ApiResponse(200, { subscribed, subscribersCount }, subscribed ? "Subscribed" : "Unsubscribed")
    );
});

// controller to return subscriber list of a channel

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    // Validate channelId
    if (!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new Apierror("Invalid channel ID", 400);
    }

    // Find all subscriptions for the channel and populate subscriber info
    const subscribers = await Subscription.find({ channel: channelId })
        .populate({
            path: "subscriber",
            select: "_id username fullname avatar"
        })
        .lean();

    // Extract only subscriber details
    const subscriberList = subscribers
        .map(sub => sub.subscriber)
        .filter(sub => sub); // filter out nulls if any user was deleted

    return res.status(200).json(
        new ApiResponse(200, subscriberList, "Channel subscribers fetched successfully")
    );
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const subscriberId = req.params.subscriberId || req.user?._id;

    // Validate subscriberId
    if (!subscriberId || !mongoose.Types.ObjectId.isValid(subscriberId)) {
        throw new Apierror("Invalid or missing subscriber ID", 400);
    }

    // Find all subscriptions for the user and populate channel info
    const subscriptions = await Subscription.find({ subscriber: subscriberId })
        .populate({
            path: "channel",
            select: "_id username fullname avatar"
        })
        .lean();

    // Extract only channel details
    const channelList = subscriptions
        .map(sub => sub.channel)
        .filter(channel => channel); // filter out nulls if any channel was deleted

    return res.status(200).json(
        new ApiResponse(200, channelList, "Subscribed channels fetched successfully")
    );
});
export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}