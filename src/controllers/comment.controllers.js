import mongoose from "mongoose";
import { comment as CommentModel } from "../models/comment.models.js";
import { Apierror } from "../utils/APIerror.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asynchandler.js";
import sanitizeHtml from "sanitize-html";

// Helper to sanitize HTML content to prevent XSS
const sanitizeContent = (content) =>
  sanitizeHtml(content, {
    allowedTags: [],
    allowedAttributes: {}
  });

// Get paginated comments for a video with sanitized content and owner info
const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  let { page = 1, limit = 10 } = req.query;

  // Validate videoId format
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new Apierror("Invalid video ID", 400);
  }

  // Normalize pagination inputs
  page = Math.max(parseInt(page, 10) || 1, 1);
  limit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

  // Aggregation pipeline to fetch comments with owner details
  const pipeline = [
    { $match: { video: new mongoose.Types.ObjectId(videoId) } },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
          { $project: { _id: 1, username: 1, fullname: 1, avatar: 1 } }
        ]
      }
    },
    { $unwind: "$owner" },
    { $sort: { createdAt: -1 } }
  ];

  // Pagination options
  const options = { page, limit };

  // Execute paginated aggregation query
  const result = await CommentModel.aggregatePaginate(
    CommentModel.aggregate(pipeline),
    options
  );

  // Sanitize comment content in all fetched docs
  result.docs = result.docs.map((comment) => ({
    ...comment,
    content: sanitizeContent(comment.content)
  }));

  // Return comments with pagination metadata
  return res.status(200).json(
    new ApiResponse(200, result, "Comments fetched successfully")
  );
});

// Add a new comment to a video
const addComment = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  let { content } = req.body;

  // Validate video ID
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new Apierror("Invalid video ID", 400);
  }

  // Validate comment content presence and trim whitespace
  if (!content || !content.trim()) {
    throw new Apierror("Comment content is required", 400);
  }

  // Limit comment length
  if (content.length > 500) {
    throw new Apierror("Comment is too long (max 500 characters)", 400);
  }

  // Sanitize content to avoid XSS
  content = sanitizeContent(content);

  // Validate authenticated user ID
  const userId = req.user?._id;
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    throw new Apierror("Unauthorized: Invalid or missing user ID", 401);
  }

  // Create new comment document
  const commentDoc = await CommentModel.create({
    content,
    video: videoId,
    owner: userId
  });

  // Handle unexpected failure in creation
  if (!commentDoc) {
    throw new Apierror("Failed to add comment", 500);
  }

  // Populate owner info for response
  await commentDoc.populate({
    path: "owner",
    select: "_id username fullname avatar"
  });

  // Return created comment
  return res
    .status(201)
    .json(new ApiResponse(201, commentDoc, "Comment added successfully"));
});

// Update an existing comment by ID (only by owner)
const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  let { content } = req.body;

  // Validate comment ID format
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new Apierror("Invalid comment ID", 400);
  }

  // Validate new comment content
  if (!content || !content.trim()) {
    throw new Apierror("Comment content is required", 400);
  }

  // Limit content length
  if (content.length > 500) {
    throw new Apierror("Comment is too long (max 500 characters)", 400);
  }

  // Sanitize updated content
  content = sanitizeContent(content);

  // Find comment by ID
  const comment = await CommentModel.findById(commentId);
  if (!comment) {
    throw new Apierror("Comment not found", 404);
  }

  // Check ownership - only owner can update
  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new Apierror("Forbidden: You cannot update this comment", 403);
  }

  // Update comment content and save
  comment.content = content;
  await comment.save();

  // Populate owner info for response
  await comment.populate({
    path: "owner",
    select: "_id username fullname avatar"
  });

  // Return updated comment
  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment updated successfully"));
});

// Delete a comment by ID (only by owner)
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  // Validate comment ID format
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new Apierror("Invalid comment ID", 400);
  }

  // Attempt to find and delete comment only if owned by user
  const comment = await CommentModel.findOneAndDelete({
    _id: commentId,
    owner: req.user._id
  });

  // If comment not found or not owned by user
  if (!comment) {
    throw new Apierror("Comment not found or you are not authorized to delete it", 404);
  }

  // Return success response on deletion
  return res.status(200).json(
    new ApiResponse(200, null, "Comment deleted successfully")
  );
});

export {
  getVideoComments,
  addComment,
  updateComment,
  deleteComment
};
