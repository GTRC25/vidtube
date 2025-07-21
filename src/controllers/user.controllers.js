// Import necessary utilities, models, and helper functions
import { asyncHandler } from "../utils/asyncHandler.js";
import { Apierror } from "../utils/APIerror.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import e from "express";


const generateAccessAndrefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId)
  if (!user) {
    throw new Apierror("User not found for Token Generation", 404);
  }

  const accessToken = user.generateAccessToken()
  const refreshToken = user.generateRefreshToken()

  user.refreshToken = refreshToken
  await user.save({ validateBeforeSave: false })

  return { accessToken, refreshToken }
  } catch (error) {
    throw new Apierror("Something went wrong while generating tokens", 500);
  }
}



// Controller: Handles user registration with validations and image uploads
const registerUser = asyncHandler(async (req, res) => {
  const { fullname, username, email, password } = req.body;

  // Validate that no field is empty or just whitespace
  if ([fullname, username, email, password].some((field) => field?.trim() === '')) {
    throw new Apierror("All fields are required", 400);
  }

  // Check if the username or email is already registered
  const existingUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existingUser) {
    throw new Apierror("Username or email already exists", 409);
  }

  // Debug: Log uploaded files (avatar and cover image)
  console.warn(req.files);

  // Get local file paths from the uploaded files
  const avatarlocalpath = req.files?.avatar?.[0]?.path;
  const coverimagelocalpath = req.files?.coverimage?.[0]?.path;

  // Avatar is required; reject if missing
  if (!avatarlocalpath) {
    throw new Apierror("Avatar file is required", 400);
  }

  let avatar;
  try {
    // Upload avatar to Cloudinary
    avatar = await uploadOnCloudinary(avatarlocalpath);
    if (!avatar) {
      throw new Apierror("Avatar upload failed", 500);
    }
    console.log("Avatar uploaded successfully:", avatar);
  } catch (error) {
    console.error("Error uploading avatar", error);
    throw new Apierror("Failed to upload avatar", 500);
  }

  let coverimage = null;
  try {
    // Upload cover image if provided
    if (coverimagelocalpath) {
      coverimage = await uploadOnCloudinary(coverimagelocalpath);
      if (!coverimage) {
        throw new Apierror("Cover image upload failed", 500);
      }
      console.log("Cover image uploaded successfully:", coverimage);
    }
  } catch (error) {
    console.error("Error uploading cover image", error);
    throw new Apierror("Failed to upload cover image", 500);
  }

  // Save the new user to the database
  const user = await User.create({
    fullname,
    username: username.toLowerCase(),
    email,
    password, // Make sure password is hashed in schema
    avatar: avatar.url,
    coverimage: coverimage?.url || "",
  });

  // Fetch the created user excluding sensitive fields
  const createdUser = await User.findById(user._id).select("-password -refreshToken");
  if (!createdUser) {
    throw new Apierror("Something went wrong while registering the user", 500);
  }
  return res
    .status(201)
    .json(new ApiResponse("User registered successfully", createdUser, 201));
});

const loginUser = asyncHandler(async (req, res) => {
   //  Extract login credentials from request body
   const { email, password, username } = req.body;
   
   // Ensure all required fields are provided
   if (!email || !password || !username) {
      throw new Apierror("All fields are required", 400);
   }

   // 🔍 Find user in DB by email or username
   const user = await User.findOne({ $or: [{ username }, { email }] });

   //  If user not found, throw error
   if (!user) {
      throw new Apierror("User not found", 404);
   }

   //  Check if password entered matches hashed password in DB
   const isPasswordCorrect = await user.ispasswordcorrect(password);
   if (!isPasswordCorrect) {
      throw new Apierror("Invalid user password", 401);
   }

   //  Generate fresh access and refresh tokens for the user
   const { accessToken, refreshToken } = await generateAccessAndrefreshToken(user._id);

   //  Fetch user again without sensitive fields like password or refresh token
   const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
   if (!loggedInUser) {
      throw new Apierror("Something went wrong while logging in", 500);
   }

   //  Define cookie options to protect tokens (httpOnly prevents JS access)
   const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // send over HTTPS in production
   };

   //  Send tokens as cookies and return user info in response
   return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(new ApiResponse(
         200,
         {
            user: loggedInUser, accessToken, refreshToken
         }
      ));
});

// Export the controller function to use in routes
export { registerUser, loginUser };
