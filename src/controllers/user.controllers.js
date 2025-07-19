// Imports required utilities, models, and helper functions
import { asyncHandler } from "../utils/asyncHandler.js";
import { Apierror } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
// Controller to register a new user
const registerUser = asyncHandler(async (req, res) => {
  const { fullname, username, email, password } = req.body;

  if ([fullname, username, email, password].some((field) => field?.trim() === '')) {
    throw new Apierror("All fields are required", 400);
  }

  const existingUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existingUser) {
    throw new Apierror("Username or email already exists", 409);
  }

  console.warn(req.files);

  const avatarlocalpath = req.files?.avatar?.[0]?.path;
  const coverimagelocalpath = req.files?.coverimage?.[0]?.path;

  if (!avatarlocalpath) {
    throw new Apierror("Avatar file is required", 400);
  }

  let avatar;
  try {
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

  const user = await User.create({
    fullname,
    username: username.toLowerCase(),
    email,
    password,
    avatar: avatar.url,
    coverimage: coverimage?.url || "",
  });

  const createdUser = await User.findById(user._id).select("-password -refreshToken");
  if (!createdUser) {
    throw new Apierror("Something went wrong while registering the user", 500);
  }

  return res
    .status(201)
    .json(new ApiResponse("User registered successfully", createdUser, 201));
});


// Export the controller function
export { registerUser };
