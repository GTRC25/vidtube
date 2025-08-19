import { Router } from "express";
import { 
    toggleSubscription, 
    getUserChannelSubscribers, 
    getSubscribedChannels 
} from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();


router.post("/:channelId/toggle", verifyJWT, toggleSubscription);
router.get("/:channelId/subscribers", getUserChannelSubscribers);
router.get("/:subscriberId?/channels", verifyJWT, getSubscribedChannels);

export default router;
