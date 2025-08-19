import express from "express";
import {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
} from "../controllers/like.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();


router.patch("/video/:videoId", verifyJWT, toggleVideoLike);
router.patch("/comment/:commentId", verifyJWT, toggleCommentLike);
router.patch("/tweet/:tweetId", verifyJWT, toggleTweetLike);
router.get("/videos", verifyJWT, getLikedVideos);

export default router;
