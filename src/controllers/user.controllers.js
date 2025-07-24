// Import necessary utilities, models, and helper functions
import { asyncHandler } from "../utils/asynchandler.js";
import { Apierror } from "../utils/APIerror.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


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

const logoutUser = asyncHandler(async (req, res) => {
   await User.findByIdAndUpdate(
      req.user._id,
      { refreshToken: null },
      { new: true }
   )
   const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
   }
   return res
      .status(200)
      .clearCookie("accessToken", null, options)
      .clearCookie("refreshToken", null, options)
      .json(new ApiResponse("User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

   if (!incomingRefreshToken) {
      throw new Apierror("Refresh token is required", 401);
   }
   try {
    const decodedToken = jwt.verify(
     incomingRefreshToken,
     process.env.REFRESH_TOKEN_SECRET,
    )

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new Apierror("Invalid refresh token", 404);
    }
    if (incomingRefreshToken !== user?.refreshToken  ) {
      throw new Apierror("Invalid refresh token", 401)
    };
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndrefreshToken(user._id);

    return res.status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200, 
          { accessToken,
          refreshToken: newRefreshToken
          },
          "Access token refreshed successfully"
        ));

   } catch (error) {
    throw new Apierror("Something went wrong while refreshing token", 401);
   }

   
});


const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body
  
  const user = await User.findById(req.user?._id)
  
 const isPasswordValid = await user.ispasswordcorrect(currentPassword)
  if (!isPasswordValid) {
    throw new Apierror("Current password is incorrect", 401);
  }
  user.password = newPassword; 

  await user.save({ validateBeforeSave: false });
  return res.status(200).json(new ApiResponse("Password changed successfully", null, 200));


})

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse("Current user fetched successfully", req.user, 200));
})

const updateAccountDetails = asyncHandler(async (req, res) => {
   const { fullname, email } = req.body;
   if (!fullname || !email) {
     throw new Apierror("Full name and email are required", 400);
   }

    const user = await User.findByIdAndUpdate(
     req.user?._id,
     {
       $set: {
         fullname,
         email: email
       }
     },
     { new: true }
   ).select("-password -refreshToken")

   return res.status(200).json(new ApiResponse("User details updated successfully", user, 200));

});

const updateUserAvatar = asyncHandler(async (req, res) => {

  const avatarlocalpath = req.file?.path;
  if (!avatarlocalpath) {
    throw new Apierror("Avatar file is required", 400);
  }
  const avatar = await uploadOnCloudinary(avatarlocalpath)
   
  if (!avatar.url) {
    throw new Apierror("Avatar upload failed", 500);
  }


  const user = await User.findByIdAndUpdate(req.user?._id, 
    { $set: { avatar: avatar.url } },
    { new: true }
  ).select("-password -refreshToken");

  res.status(200).json(new ApiResponse("User avatar updated successfully", user, 200));

})

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverimagelocalpath = req.file?.path;
  if (!coverimagelocalpath) {
    throw new Apierror("Cover image file is required", 400);
  }
  const coverimage = await uploadOnCloudinary(coverimagelocalpath);
  if (!coverimage.url) {
    throw new Apierror("Cover image upload failed", 500);
  }
  const user = await User.findByIdAndUpdate(req.user?._id,
    { $set: { coverimage: coverimage.url } },
    { new: true }
  ).select("-password -refreshToken");
  res.status(200).json(new ApiResponse("User cover image updated successfully", user, 200));
})

// Export the controller function to use in routes
export { registerUser,
   loginUser,
   refreshAccessToken,
   logoutUser,
   changeCurrentPassword,
   getCurrentUser,
   updateAccountDetails,
   updateUserAvatar,
   updateUserCoverImage };
