import { Router } from "express";
import { registerUser, logoutUser } from "../controllers/user.controllers.js";
import {upload} from "../middlewares/multer.middlewares.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router();

// POST /api/v1/register
router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverimage",
            maxCount: 1
        }
    ]),
    registerUser
);

router.route("/logout").post(verifyJWT, logoutUser);

export default router;
