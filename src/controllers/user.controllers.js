// Imports required utilities, models, and helper functions
import { asyncHandler } from "../utils/asyncHandler.js";
import { Apierror } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
// Controller to register a new user
const registerUser = asyncHandler(async (req, res) => {
  const { fullname, username, email, password } = req.body;

  // Check if all fields are present and not empty
  if ([fullname, username, email, password].some((field) => field?.trim() === '')) {
    throw new Apierror("All fields are required", 400);
  }

  // Check if a user already exists with the same username or email
  const existingUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existingUser) {
    throw new Apierror("Username or email already exists", 400);
  }

  // Get avatar and cover image file paths from uploaded files
  const avatarlocalpath = req.files?.avatar?.[0]?.path;
  const coverimagelocalpath = req.files?.coverimage?.[0]?.path;

  // Avatar is required; throw error if not uploaded
  if (!avatarlocalpath) {
    throw new Apierror("Avatar is required", 400);
  }

  // Upload avatar to Cloudinary and get the hosted URL
  const avatar = await uploadOnCloudinary(avatarlocalpath);

  // If cover image is provided, upload it to Cloudinary
  let coverimage = "";
  if (coverimagelocalpath) {
    coverimage = await uploadOnCloudinary(coverimagelocalpath);
  }

  // Create new user in database with avatar and cover image URLs
  const user = await User.create({
    fullname,
    username: username.toLowerCase(),
    email,
    password,
    avatar: avatar.url,
    coverimage: coverimage ? coverimage.url : "",
  });

  // Fetch the created user again, excluding sensitive fields
  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  // If somehow user creation failed, send a server error
  if (!createdUser) {
    throw new Apierror("Something went wrong while registering the user", 500);
  }

  // Send successful response with created user data (excluding password and refreshToken)
  return res
    .status(201)
    .json(new Apiresponse("User registered successfully", createdUser, 201));
});

// Export the controller function
export { registerUser };
