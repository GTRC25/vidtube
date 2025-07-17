import { asyncHandler } from "../utils/asyncHandler.js";
import {Apierror} from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {Apiresponse} from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => { const { fullname , username, email, password } = req.body

//validate user input
if(
    [fullname, username, email, password].some((field) => field?.trim() === '')) {
    throw new Apierror("All fields are required", 400);
}
//check if user already exists
const existingUser = await User.findOne({ $or: [{ username }, { email }] });
if (existingUser) {
    throw new Apierror("Username or email already exists", 400);
}
//handle avatar and cover image
const avatarlocalpath = req.files?.avatar?.[0]?.path;
const coverimagelocalpath = req.files?.coverimage?.[0]?.path;


if (!avatarlocalpath) {
    throw new Apierror("Avatar is required", 400);
}
 const avatar = await uploadOnCloudinary(avatarlocalpath)

 let coverimage = "";
  if(coverimagelocalpath){
  coverimage = await uploadOnCloudinary(coverimagelocalpath);
  }

  //create user
    const user = await User.create({
    fullname,   
    username: username.toLowerCase(),
    email,
    password,   
    avatar: avatar.url,
    coverimage: coverimage ? coverimage.url : "",
});

const createdUser = await User.findById(user._id).select("-password -refreshToken");

if(!createdUser) {
    throw new Apierror("Something went wrong while registering the user", 500);
}

return res
.status(201)
.json(new Apiresponse("User registered successfully", createdUser, 201));
    
});




export { registerUser };