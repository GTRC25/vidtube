import mongoose, {isValidObjectId} from "mongoose"
import {like} from "../models/like.models.js"
import { Apierror } from "../utils/APIerror.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asynchandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user?._id;

    // Validate videoId and userId
    if (!isValidObjectId(videoId)) {
        throw new Apierror("Invalid video ID", 400);
    }
    if (!userId || !isValidObjectId(userId)) {
        throw new Apierror("Invalid user ID", 401);
    }

    // Check if like already exists
    const LikeModel = mongoose.model("like");
    const existingLike = await LikeModel.findOne({ video: videoId, likedby: userId });

    let liked;
    if (existingLike) {
        // Unlike: remove the like
        await LikeModel.deleteOne({ _id: existingLike._id });
        liked = false;
    } else {
        // Like: create a new like
        await LikeModel.create({ video: videoId, likedby: userId });
        liked = true;
    }

    // Get current like count for the video
    const likeCount = await LikeModel.countDocuments({ video: videoId });

    return res.status(200).json(
        new ApiResponse(200, { liked, likeCount }, liked ? "Video liked" : "Video unliked")
    );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user?._id;

    // Validate commentId and userId
    if (!isValidObjectId(commentId)) {
        throw new Apierror("Invalid comment ID", 400);
    }
    if (!userId || !isValidObjectId(userId)) {
        throw new Apierror("Invalid user ID", 401);
    }

    // Check if like already exists
    const LikeModel = mongoose.model("like");
    const existingLike = await LikeModel.findOne({ comment: commentId, likedby: userId });

    let liked;
    if (existingLike) {
        // Unlike: remove the like
        await LikeModel.deleteOne({ _id: existingLike._id });
        liked = false;
    } else {
        // Like: create a new like
        await LikeModel.create({ comment: commentId, likedby: userId });
        liked = true;
    }

    // Get current like count for the comment
    const likeCount = await LikeModel.countDocuments({ comment: commentId });

    return res.status(200).json(
        new ApiResponse(200, { liked, likeCount }, liked ? "Comment liked" : "Comment unliked")
    );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    const userId = req.user?._id;   

    if(!isValidObjectId(tweetId)) {
        throw new Apierror("Invalid tweet ID", 400);
    }
    if(!userId || !isValidObjectId(userId)) {
        throw new Apierror("Invalid user ID", 401);
    }

    const LikeModel = mongoose.model("like");
    const existingLike = await LikeModel.findOne({ tweet: tweetId, likedby: userId });

    let liked;
    if (existingLike) {
        // Unlike: remove the like
        await LikeModel.deleteOne({ _id: existingLike._id });
        liked = false;
    } else {
        // Like: create a new like
        await LikeModel.create({ tweet: tweetId, likedby: userId });
        liked = true;
    }

    // Get current like count for the tweet
    const likeCount = await LikeModel.countDocuments({ tweet: tweetId });

    return res.status(200).json(
        new ApiResponse(200, { liked, likeCount }, liked ? "Tweet liked" : "Tweet unliked")
    );
});

const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    // Validate userId
    if (!userId || !isValidObjectId(userId)) {
        throw new Apierror("Invalid or missing user ID", 401);
    }

    // Find all likes by the user that reference a video
    const LikeModel = mongoose.model("like");
    const likedVideos = await LikeModel.find({ likedby: userId, video: { $exists: true, $ne: null } })
        .populate({
            path: "video",
            select: "_id title description thumbnail owner views ispublished createdAt updatedAt"
        });

    // Filter out likes where the video has been deleted (video is null)
    const videos = likedVideos
        .map(like => like.video)
        .filter(video => video);

    // Get like count for each video
    const videoLikeCounts = await Promise.all(
        videos.map(async video => {
            const count = await LikeModel.countDocuments({ video: video._id });
            return { ...video.toObject(), likeCount: count };
        })
    );

    return res.status(200).json(
        new ApiResponse(200, videoLikeCounts, "Liked videos retrieved successfully")
    );
});



export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}