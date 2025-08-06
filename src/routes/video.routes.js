import { Router } from "express";
import { upload } from "../middlewares/multer.middlewares.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
} from "../controllers/video.controllers.js";

const router = Router();

// Public routes
router.get("/", getAllVideos);
router.get("/:videoId", getVideoById);

// Protected routes (require authentication)
router.post("/", verifyJWT, upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 }
]), publishAVideo);

router.patch("/:videoId", verifyJWT, upload.fields([
    { name: "thumbnail", maxCount: 1 }
]), updateVideo);

router.delete("/:videoId", verifyJWT, deleteVideo);

router.patch("/:videoId/publish", verifyJWT, togglePublishStatus);

export default router;