import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/videos.models.js"
import { User } from "../models/user.models.js"
import { Apierror } from "../utils/APIerror.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asynchandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"



const getAllVideos = asyncHandler(async (req, res) => {
    // Extract query parameters with defaults
    const {
        page = 1,
        limit = 10,
        query,
        sortBy = "createdAt",
        sortType = "desc",
        userId,
    } = req.query;

    // Ensure page and limit are positive integers
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;
    const sortOrder = sortType === "asc" ? 1 : -1;

    // Build MongoDB match stage for search and filter
    const matchStage = {};
    if (query) {
        // Search by title or description (case-insensitive)
        matchStage.$or = [
            { title: { $regex: query, $options: "i" } },
            { description: { $regex: query, $options: "i" } },
        ];
    }
    if (userId) {
        // Validate userId and filter by owner
        if (!isValidObjectId(userId)) {
            throw new Apierror("Invalid userId", 400);
        }
        matchStage.owner = new mongoose.Types.ObjectId(userId);
    }

    // Aggregation pipeline for advanced querying and pagination
    const aggregationPipeline = [
        { $match: matchStage }, // Apply search/filter
        {
            $lookup: { // Join uploader info from users collection
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "uploader",
            },
        },
        { $unwind: "$uploader" }, // Flatten uploader array
        {
            $sort: { // Sort by requested field and order
                [sortBy]: sortOrder,
            },
        },
        {
            $facet: { // Split results into metadata and data
                metadata: [
                    { $count: "total" }, // Total count for pagination
                    {
                        $addFields: {
                            page: pageNum,
                            limit: limitNum,
                            totalPages: {
                                $ceil: {
                                    $divide: ["$total", limitNum],
                                },
                            },
                        },
                    },
                ],
                data: [
                    { $skip: skip }, // Pagination: skip
                    { $limit: limitNum }, // Pagination: limit
                ],
            },
        },
        { $unwind: "$metadata" }, // Flatten metadata array
        {
            $project: { // Shape the final response
                videos: "$data",
                page: "$metadata.page",
                limit: "$metadata.limit",
                totalResults: "$metadata.total",
                totalPages: "$metadata.totalPages",
            },
        },
    ];

    // Execute aggregation
    const result = await Video.aggregate(aggregationPipeline);

    // Return paginated response or empty result if none found
    return res.status(200).json(
        new ApiResponse(200, result[0] || {
            videos: [],
            page: pageNum,
            limit: limitNum,
            totalPages: 0,
            totalResults: 0
        })
    );
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description, duration } = req.body;

    // Validate required fields
    if (!title || !description || !title.trim() || !description.trim()) {
        throw new Apierror("Title and description are required", 400);
    }
    if (!duration || isNaN(duration)) {
        throw new Apierror("Duration is required and must be a number", 400);
    }

    // Check for video file (Multer: req.file or req.files.video)
    const videoLocalPath = req.file?.path || req.files?.video?.[0]?.path;
    if (!videoLocalPath) {
        throw new Apierror("Video file is required", 400);
    }

    // Check for thumbnail file (Multer: req.files.thumbnail)
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;
    if (!thumbnailLocalPath) {
        throw new Apierror("Thumbnail file is required", 400);
    }

    // Upload video to Cloudinary
    let videoUpload;
    try {
        videoUpload = await uploadOnCloudinary(videoLocalPath, "video");
        if (!videoUpload?.url) {
            throw new Apierror("Video upload failed", 500);
        }
    } catch (error) {
        console.error("Error uploading video:", error);
        throw new Apierror("Failed to upload video", 500);
    }

    // Upload thumbnail to Cloudinary
    let thumbnailUpload;
    try {
        thumbnailUpload = await uploadOnCloudinary(thumbnailLocalPath, "image");
        if (!thumbnailUpload?.url) {
            throw new Apierror("Thumbnail upload failed", 500);
        }
    } catch (error) {
        console.error("Error uploading thumbnail:", error);
        throw new Apierror("Failed to upload thumbnail", 500);
    }

    // Save video to MongoDB
    const videoDoc = await Video.create({
        title,
        description,
        duration: Number(duration),
        owner: req.user?._id, // assumes user is set by auth middleware
        videofile: videoUpload.url,
        thumbnail: thumbnailUpload.url,
    });

    if (!videoDoc) {
        throw new Apierror("Failed to create video", 500);
    }

    return res.status(201).json(
        new ApiResponse(201, videoDoc, "Video published successfully")
    );
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    // Validate videoId
    if (!isValidObjectId(videoId)) {
        throw new Apierror("Invalid video ID", 400);
    }

    // Aggregation pipeline to fetch video and uploader info, and control exposed fields
    const result = await Video.aggregate([
        { $match: { _id: new mongoose.Types.ObjectId(videoId) } },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "uploader"
            }
        },
        { $unwind: "$uploader" },
        {
            $project: {
                // Video fields
                _id: 1,
                title: 1,
                description: 1,
                duration: 1,
                views: 1,
                ispublished: 1,
                videofile: 1,
                thumbnail: 1,
                createdAt: 1,
                updatedAt: 1,
                // Uploader fields (exclude password and internal flags)
                "uploader._id": 1,
                "uploader.fullname": 1,
                "uploader.username": 1,
                "uploader.email": 1,
                "uploader.avatar": 1
            }
        }
    ]);

    if (!result || result.length === 0) {
        throw new Apierror("Video not found", 404);
    }

    return res.status(200).json(
        new ApiResponse(200,result[0], "Video fetched successfully")
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;
    let thumbnailUrl;

    // Validate videoId
    if (!isValidObjectId(videoId)) {
        throw new Apierror("Invalid video ID", 400);
    }

    // Find the video and check ownership
    const video = await Video.findById(videoId);
    if (!video) {
        throw new Apierror("Video not found", 404);
    }
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new Apierror("You are not authorized to update this video", 403);
    }

    // Handle thumbnail update if a new file is provided
    if (req.files?.thumbnail?.[0]?.path) {
        try {
            const thumbnailUpload = await uploadOnCloudinary(req.files.thumbnail[0].path, "image");
            if (!thumbnailUpload?.url) {
                throw new Apierror("Thumbnail upload failed", 500);
            }
            thumbnailUrl = thumbnailUpload.url;
        } catch (error) {
            throw new Apierror("Failed to upload thumbnail", 500);
        }
    }

    // Build update object for partial updates
    const updateObj = {};
    if (title) updateObj.title = title;
    if (description) updateObj.description = description;
    if (thumbnailUrl) updateObj.thumbnail = thumbnailUrl;

    // Update the video
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        { $set: updateObj },
        { new: true }
    );

    return res.status(200).json(
        new ApiResponse(200, updatedVideo, "Video updated successfully")
    );
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    // Validate videoId
    if (!isValidObjectId(videoId)) {
        throw new Apierror("Invalid video ID", 400);
    }

    // Find the video
    const video = await Video.findById(videoId);
    if (!video) {
        throw new Apierror("Video not found", 404);
    }

    // Check ownership
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new Apierror("You are not authorized to delete this video", 403);
    }

    // Delete the video
    await Video.findByIdAndDelete(videoId);

    return res.status(200).json(
        new ApiResponse(200, null, "Video deleted successfully")
    );
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    // Validate videoId
    if (!isValidObjectId(videoId)) {
        throw new Apierror("Invalid video ID", 400);
    }

    // Find the video
    const video = await Video.findById(videoId);
    if (!video) {
        throw new Apierror("Video not found", 404);
    }

    // Check ownership
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new Apierror("You are not authorized to update this video", 403);
    }

    // Toggle ispublished status
    video.ispublished = !video.ispublished;
    await video.save();

    return res.status(200).json(
        new ApiResponse(200, video, `Video publish status toggled to ${video.ispublished}`)
    );
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
