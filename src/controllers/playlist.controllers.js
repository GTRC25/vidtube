import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import { Apierror } from "../utils/APIerror.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asynchandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description, videos = [] } = req.body;
    const ownerId = req.user?._id;

    // Validate required fields
    if (!name?.trim()) {
        throw new Apierror("Playlist name is required", 400);
    }
    if (!description?.trim()) {
        throw new Apierror("Playlist description is required", 400);
    }
    if (!ownerId || !isValidObjectId(ownerId)) {
        throw new Apierror("Invalid or missing owner ID", 401);
    }

    // Validate videos array
    if (!Array.isArray(videos)) {
        throw new Apierror("Videos must be an array of video IDs", 400);
    }

    const uniqueVideos = [...new Set(videos)];
    for (const videoId of uniqueVideos) {
        if (!isValidObjectId(videoId)) {
            throw new Apierror(`Invalid video ID: ${videoId}`, 400);
        }
    }

    // Create playlist
    const playlist = await Playlist.create({
        name: name.trim(),
        description: description.trim(),
        videos: uniqueVideos,
        owner: ownerId
    });

    if (!playlist) {
        throw new Apierror("Failed to create playlist", 500);
    }

    // Return safe response
    const safePlaylist = {
        _id: playlist._id,
        name: playlist.name,
        description: playlist.description,
        videos: playlist.videos,
        owner: playlist.owner,
        createdAt: playlist.createdAt,
    };

    return res
        .status(201)
        .json(new ApiResponse(201, safePlaylist, "Playlist created successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const userId = req.params.userId || req.user?._id;

    // Validate userId
    if (!userId || !isValidObjectId(userId)) {
        throw new Apierror("Invalid or missing user ID", 400);
    }

    // Ensure user exists
    const userExists = await User.exists({ _id: userId });
    if (!userExists) {
        throw new Apierror("User not found", 404);
    }

    // Fetch playlists owned by the user
    const playlists = await Playlist.find({ owner: userId })
        .select("_id name description videos owner createdAt updatedAt")
        .populate({
            path: "videos",
            select: "_id title description thumbnail owner"
        })
        .sort({ updatedAt: -1 }) // newest updated first
        .lean();

    if (!playlists.length) {
        return res.status(200).json(
            new ApiResponse(200, [], "No playlists found for this user")
        );
    }

    return res.status(200).json(
        new ApiResponse(200, playlists, "User playlists fetched successfully")
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    // Validate playlistId
    if (!isValidObjectId(playlistId)) {
        throw new Apierror("Invalid playlist ID", 400);
    }

    // Fetch playlist by ID and populate videos (safe fields only)
    const playlist = await Playlist.findById(playlistId)
        .select("_id name description videos owner createdAt updatedAt")
        .populate({
            path: "owner",
            select: "_id username avatar"
})
        .populate({
            path: "videos",
            select: "_id title description thumbnail owner"
        })
        .lean();

    if (!playlist) {
        throw new Apierror("Playlist not found", 404);
    }

    return res.status(200).json(
        new ApiResponse(200, playlist, "Playlist fetched successfully")
    );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;
    const userId = req.user?._id;

    // Validate IDs
    if (!isValidObjectId(playlistId)) {
        throw new Apierror("Invalid playlist ID", 400);
    }
    if (!isValidObjectId(videoId)) {
        throw new Apierror("Invalid video ID", 400);
    }

    // Find playlist and check ownership
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new Apierror("Playlist not found", 404);
    }
    if (playlist.owner.toString() !== userId.toString()) {
        throw new Apierror("You are not authorized to modify this playlist", 403);
    }

    // Check if video is already in the playlist
    if (playlist.videos.map(id => id.toString()).includes(videoId)) {
        throw new Apierror("Video already exists in the playlist", 400);
    }

    // Add video to playlist
    playlist.videos.push(videoId);
    await playlist.save();

    // Optionally, populate videos for response
    await playlist.populate({
        path: "videos",
        select: "_id title description thumbnail owner"
    });

    return res.status(200).json(
        new ApiResponse(200, playlist, "Video added to playlist successfully")
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    const userId = req.user?._id;

    // Validate IDs
    if(!isValidObjectId(playlistId)) {
        throw new Apierror("Invalid playlist ID", 400);
    }
    if(!isValidObjectId(videoId)) {
        throw new Apierror("Invalid video ID", 400);
    }

    const playlist = await playlist.findById(playlistId)
    if(!playlist) {
        throw new Apierror("Playlist not found", 404);
    }

    if(playlist.owner.toString() !== userId.toString()) {
        throw new Apierror("You are not authorized to modify this playlist", 403);
    }

    // Check if video is in the playlist
    if(!playlist.videos.map(id => id.toString()).includes(videoId)) {
        throw new Apierror("Video not found in the playlist", 404);
    }

    // Remove video from playlist
    playlist.videos = playlist.videos.filter(id => id.toString() !== videoId);
    await playlist.save();

    return res.status(200).json(
        new ApiResponse(200, playlist, "Video removed from playlist successfully")
    );
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const userId = req.user?._id;

    // Validate playlistId
    if (!isValidObjectId(playlistId)) {
        throw new Apierror("Invalid playlist ID", 400);
    }

    // Find playlist and check ownership
    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new Apierror("Playlist not found", 404);
    }
    if (playlist.owner.toString() !== userId.toString()) {
        throw new Apierror("You are not authorized to delete this playlist", 403);
    }

    // Delete playlist
    await playlist.deleteOne();

    return res.status(200).json(
        new ApiResponse(200, null, "Playlist deleted successfully")
    );
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description, videos } = req.body;
    const userId = req.user?._id;

    if (!isValidObjectId(playlistId)) {
        throw new Apierror("Invalid playlist ID", 400);
    }

    const playlist = await Playlist.findById(playlistId);
    if (!playlist) {
        throw new Apierror("Playlist not found", 404);
    }
    if (playlist.owner.toString() !== userId.toString()) {
        throw new Apierror("You are not authorized to update this playlist", 403);
    }

    const updateObj = {};
    if (name && name.trim()) updateObj.name = name.trim();
    if (description && description.trim()) updateObj.description = description.trim();

    if (Array.isArray(videos)) {
        const uniqueVideos = [...new Set(videos.map(id => id.toString()))];
        if (uniqueVideos.length !== videos.length) {
            throw new Apierror("Duplicate video IDs are not allowed", 400);
        }
        for (const videoId of uniqueVideos) {
            if (!isValidObjectId(videoId)) {
                throw new Apierror(`Invalid video ID: ${videoId}`, 400);
            }
        }
        updateObj.videos = uniqueVideos;
    }

    playlist.set(updateObj);
    await playlist.save();

    const updatedPlaylist = await playlist.populate({
        path: "videos",
        select: "_id title description thumbnail owner"
    });

    return res.status(200).json(
        new ApiResponse(200, updatedPlaylist, "Playlist updated successfully")
    );
});


export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}