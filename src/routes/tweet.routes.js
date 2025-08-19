import { Router } from "express";
import { createTweet, getUserTweets, updateTweet, deleteTweet } from "../controllers/tweet.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js"; // adjust path if needed

const router = Router();

router.post("/", verifyJWT, createTweet);
router.get("/user/:userId?", verifyJWT, getUserTweets);
router.put("/:tweetId", verifyJWT, updateTweet);
router.delete("/:tweetId", verifyJWT, deleteTweet);

export default router;
