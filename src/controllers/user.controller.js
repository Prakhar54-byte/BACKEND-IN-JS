import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const acessToken = user.generrateAccessToken();
    const refreshToken = user.generrateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { acessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Token generation failed");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  try {
    // This is mine
    // 1. check if user exist
    // 2.if not then creat if yes then continue
    // 3. to crate use email and password
    // 4. login user

    // This is from the tutorial
    // 1.get user details from frontend
    // 2.validation - not empty
    // 3.check if user already exists username or email
    // 4.check for images , check for avtar
    // 5.upload to cloudinary , avatar
    // 6.create user object (to send in mongodb as they are noSQL) - create entry in database
    // 7.remove password and refreshToken from the response
    // 8.check for user creation
    // 9.return res

    // Step 1
    const { fullName, email, password, username } = req.body;
    console.log("Request Body in Register:", req.body);
    console.log("Request Files in Register:", email);

    //   console.log("Email", email);
    //   console.log(req.body);

    //Step 2
    if (fullName === "") {
      throw new ApiError(400, "Full Name is required");
    }
    if ([email, username, password].some((field) => field?.trim() === "")) {
      throw new ApiError(400, "All fields are required");
    }

    //Step 3
    const existedUser = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (existedUser) {
      // console.log("This is body",req.body);
      throw new ApiError(409, "User already exists");
    }
    //Step 4
    const avatarlocalPath = req.files?.avatar[0]?.path;
    if (req.files?.avatar && req.files.avatar.length > 0) {
      console.log("Avatar path:", avatarlocalPath);
    } else {
      console.error("Avatar file not found.");
      return res.status(400).json({ error: "Avatar file is required." });
    }

    //   const avatarlocalPath = req.files?.avatar[0].path;
    let coverImageLocalPath;
    if (
      req.files &&
      Array.isArray(req.files.coverImage) &&
      req.files.coverImage.length > 0
    ) {
      coverImageLocalPath = req.files.coverImage[0].path;
    }
    if (!avatarlocalPath) {
      throw new ApiError(400, "Avatar is required");
    }
    // Step5
    const avatar = await uploadOnCloudinary(avatarlocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar || !coverImage) {
      throw new ApiError(500, "Cloudinary Error");
    }

    // Step 6

    const user = await User.create({
      fullName,
      avatar: avatar.url,
      coverImage: coverImage?.url || "",
      email,
      password,
      username,
    });
    // Step 7
    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    // Step 8
    if (!createdUser) {
      throw new ApiError(500, "User not created");
    }
    // Step 9
    return res.status(200).json(new ApiResponse(200, createdUser));
  } catch (error) {
    throw new ApiError(400, error?.message || "Some error regisetUser");
  }
});

const logInUser = asyncHandler(async (req, res) => {
  // 1. Get user data
  // 2. check email and username
  // 3. check if user exist if then continue
  // 3. check password
  // 4. acess and refresh token
  // 5. senf tokens in form of cokkies

  const { fullName, email, password, username } = req.body;
  console.log(req.body);

  console.log(email);

  if (!username) {
    throw new ApiError(400, "username is required");
  }

  if (!email) {
    throw new ApiError(400, "email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValidate = await user.isPasswordCorrect(password);
  if (!isPasswordValidate) {
    throw new ApiError(401, "Password is incorrect");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User loggedIn"
      )
    );
});

const loggedOut = asyncHandler(async (req, res) => {
  // console.log("email cjeck login",email);
  try {
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          refreshToken: undefined,
        },
      },
      {
        new: true,
      }
    );

    const options = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, {}, "User logged Out"));
  } catch (error) {
    throw new ApiError(400, error?.message || "Some error");
  }
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  try {
    const incomingrefreshToken =
      req.cookie.refreshToken || req.body.refreshToken;

    if (!incomingrefreshToken) {
      throw new ApiError(401, "Token is taken");
    }
    const decodedToken = jwt.verify(
      incomingrefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingrefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id
    );

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: refreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(400, error?.message || "Some error");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
      throw new ApiError(401, "Old password is incorrect");
    }
    user.password = newPassword;
    const passwordSaved = await user.save({ validateBeforeSave: false });

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Password Change Successfully"));
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "Some error changeCurrentPassword"
    );
  }
});

const getCurrentUser = asyncHandler(async (req, res) => {
  try {
    // const user = await User.findById(req.user._id).select("-password -refreshToken")
    return res.status(200).json(new ApiResponse(200, req.user, "User found"));
  } catch (error) {
    throw new ApiError(400, error?.message || "Some error getCurrentUser");
  }
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  try {
    const { fullName, email } = req.body; // if file is updateed prefer it to do in differnt controllers

    if (!fullName || !email) {
      throw new ApiError(401, "All fields are required");
    }

    const user = User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          fullName: fullName,
          email,
        },
      },
      { new: true }
    ).select("-password");

    return res
      .status(200)
      .json(new ApiResponse(200, user, "Account Details updated successfully"));
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "Some error updateAccountDetails"
    );
  }
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  try {
    const avatarLocalPath = req.files?.path;
    if (!avatarLocalPath) {
      throw new ApiError(400, "Avatar files is missing");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);

    //TODO - delete old image from cloudinary

    if (!avatar.url) {
      throw new ApiError(400, "Error while uplaoding on avatar");
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          avatar: avatar.url,
        },
      },
      { new: true }
    ).select("-password");

    return res
      .status(200)
      .json(new ApiResponse(200, user, "Avatar updated successfully"));
  } catch (error) {
    throw new ApiError(400, error?.message || "Some error updateUserAvatar");
  }
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  try {
    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) {
      throw new ApiError(400, "Cover Image files is missing");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage.url) {
      throw new ApiError(400, "Error while uplaoding on cover Image");
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          coverImage: coverImage.url,
        },
      },
      { new: true }
    ).select("-password");

    return res
      .status(200)
      .json(new ApiResponse(200, user, "Cover Image updated successfully"));
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "Some error updateUserCoverImage"
    );
  }
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  try {
    const { username } = req.params;

    if (!username?.trim()) {
      throw new ApiError(400, "Username is missing");
    }

    // User.find({username})

    const channel = await User.aggregate([
      {
        $match: {
          username: username?.toLowerCase(),
        },
      },
      {
        $lookup: {
          from: "subscrptions",
          localField: "_id",
          foreignField: "channel",
          as: "subscribers",
        },
      },
      {
        $lookup: {
          from: "subcrptions",
          localField: "_id",
          foreignField: "subcriber",
          as: "subscribedTo",
        },
      },
      {
        $addFields: {
          subcribersCount: {
            $size: "$subscribers",
          },
          channelsSubscribeToCounts: {
            $size: "$subscribedTo",
          },
          isSubscribed: {
            $cond: {
              if: { $in: [req.user?._id, "$subscribers.subscriber"] },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $project: {
          fullName: 1,
          username: 1,
          subcribersCount: 1,
          channelsSubscribeToCounts: 1,
          avatar: 1,
          coverImage: 1,
          createdAt: 1,
        },
      },
    ]);
    console.log("This is channel", channel);

    if (!channel?.length) {
      throw new ApiError(404, "Channel not found");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, channel[0], "Channel found"));
  } catch (error) {
    throw new ApiError(
      400,
      error?.message || "Some error getUserChannelProfile"
    );
  }
});
// getUserChannelProfile()

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch History Fetched succesfully"
      )
    );
});

export {
  registerUser,
  logInUser,
  loggedOut,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
