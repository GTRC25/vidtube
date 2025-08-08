import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import { Apierror } from "../utils/APIerror.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asynchandler.js"
import sanitizeHtml from "sanitize-html";


const createTweet = asyncHandler(async (req, res) => {
    let { content } = req.body;

    // Validate content
    if (!content || !content.trim()) {
        throw new Apierror("Tweet content is required", 400);
    }
     if (content.length > 280) {
        throw new Apierror("Tweet exceeds maximum length of 280 characters", 400);
    }

    // Sanitize content to prevent XSS
    content = sanitizeHtml(content, {
        allowedTags: [],
        allowedAttributes: {}
    });

    // Ensure user is authenticated and user ID is available
    const userId = req.user?._id;
    if (!userId || !isValidObjectId(userId)) {
        throw new Apierror("Invalid or missing user ID", 401);
    }

    // Create the tweet
    const tweet = await Tweet.create({
        content,
        owner: userId
    });

    if (!tweet) {
        throw new Apierror("Failed to create tweet", 500);
    }

    // Optionally, populate owner info (excluding sensitive fields)
    await tweet.populate({
        path: "owner",
        select: "_id username fullname avatar"
    });

    return res.status(201).json(
        new ApiResponse(201, tweet, "Tweet created successfully")
    );
});


const getUserTweets = asyncHandler(async (req, res) => {
    const userId = req.params.userId || req.user?._id;

    // Validate userId
    if (!userId || !isValidObjectId(userId)) {
        throw new Apierror("Invalid or missing user ID", 400);
    }

    // Fetch tweets for the user, newest first
    const tweets = await Tweet.find({ owner: userId })
        .sort({ createdAt: -1 })
        .populate({
            path: "owner",
            select: "_id username fullname avatar"
        });

    // Sanitize tweet content to prevent XSS
    const sanitizedTweets = tweets.map(tweet => ({
        ...tweet.toObject(),
        content: sanitizeHtml(tweet.content, {
            allowedTags: [],
            allowedAttributes: {}
        })
    }));

    return res.status(200).json(
        new ApiResponse(200, sanitizedTweets, "User tweets fetched successfully")
    );
});

const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    let { content } = req.body;

    if (!isValidObjectId(tweetId)) {
        throw new Apierror("Invalid tweet ID", 400);
    }

    if (!content || !content.trim()) {
        throw new Apierror("Tweet content is required", 400);
    }
    if (content.length > 280) {
        throw new Apierror("Tweet cannot exceed 280 characters", 400);
    }

    content = sanitizeHtml(content, { allowedTags: [], allowedAttributes: {} });
    content = content.replace(/<[^>]*>?/gm, ""); // removes any missed HTML

    const tweet = await Tweet.findOneAndUpdate(
        { _id: tweetId, owner: req.user._id }, // ensures ownership
        { content },
        { new: true } // return updated doc
    ).populate({
        path: "owner",
        select: "_id username fullname avatar"
    });

    if (!tweet) {
        throw new Apierror("Tweet not found or you are not authorized", 404);
    }

    return res.status(200).json(
        new ApiResponse(200, tweet, "Tweet updated successfully")
    );
});

const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    // Validate tweetId
    if (!isValidObjectId(tweetId)) {
        throw new Apierror("Invalid tweet ID", 400);
    }

    // Find the tweet
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new Apierror("Tweet not found", 404);
    }

    // Check ownership
    if (tweet.owner.toString() !== req.user._id.toString()) {
        throw new Apierror("You are not authorized to delete this tweet", 403);
    }

    // Delete the tweet
    await Tweet.findByIdAndDelete(tweetId);

    return res.status(200).json(
        new ApiResponse(200, null, "Tweet deleted successfully")
    );
});

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}