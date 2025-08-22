import express from "express";
import {
  getVideoComments,
  addComment,
  updateComment,
  deleteComment
} from "../controllers/comment.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();


router.get("/video/:videoId", verifyJWT, getVideoComments);
router.post("/video/:videoId", verifyJWT, addComment);
router.patch("/:commentId", verifyJWT, updateComment);
router.delete("/:commentId", verifyJWT, deleteComment);

export default router;
