import jwt from 'jsonwebtoken';
import {user} from '../models/user.models.js';
import {asyncHandler} from "../utils/asynchandler.js";
import { Apierror } from "../utils/APIerror.js";



export const verifyJWT = asyncHandler(async (req, _, next) => {

    const Token = req.cookies.accessToken || req.header('Authorization')?.replace('Bearer ', '');
    if (!Token) {
        throw new Apierror("Unauthorized");
    } try {
        const decodedToken = jwt.verify(Token, process.env.ACCESS_TOKEN_SECRET);

       const user = await user.findById(decodedToken?.id).select('-password -refreshToken');

       if (!user) {
           throw new Apierror("User not found", 404);
       }

       req.user = user;
       next();

    } catch (error) {
        throw new Apierror(401, error?.message || "Invalid access token");
    }



})