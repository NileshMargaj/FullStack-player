import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { User } from '../models/user.model.js';
import { uploadOnImageKit } from '../utils/imagekit.js';
import { ApiResponse } from '../utils/apiResponse.js';
import jwt from 'jsonwebtoken';


const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) throw new ApiError(404, "User not found");
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token");
    }
}





const registerUser = asyncHandler(async (req, res) => {

    //? get user details from frontend
    const { username, fullName, email, password } = req.body


    //? validation – not empty
    if (
        [fullName, username, email, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required");
    }


    //? check if user already exists: username, email
    const isUserExists = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (isUserExists) {
        throw new ApiError(409, "User already exists with the provided username or email");
    }


    //? check for images, check for avatar
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is  required");
    }

    //? upload them to cloudinary, avatar
    const avatar = await uploadOnImageKit(avatarLocalPath)
    const coverImage = await uploadOnImageKit(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar is  required");
    }


    //? create user object – create entry in db
    const user = await User.create({
        username: username.toLowerCase(),
        fullName,
        email,
        avatar: avatar.url,
        coverImage: coverImage?.url || null,
        password
    })



    //? remove password and refresh token field from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )


    //? check for user creation
    if (!createdUser) {
        throw new ApiError(500, "Failed to register user");
    }


    //? return res
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully...")
    )

});



const loginUser = asyncHandler(async (req, res) => {
    //? req body
    const { email, password, username } = req.body

    if ((!email && !username) || !password) {
        throw new ApiError(400, "Email or username and password are required");
    }



    //? find user by email or username
    const user = await User.findOne({
        $or: [
            { email }, { username }
        ]
    })


    if (!user) {
        throw new ApiError(404, "User not found with the provided email or username");
    }

    //? compare password
    const isPasswordValid = await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid password");
    }


    // Generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "none"  // For cross-origin cookies
    };

    return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "User logged in successfully"
            )
        );

})


const logOutUser = asyncHandler(async (req, res) => {

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(
                200, {},
                "User logged out successfully..."
            )
        );

})


const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomngRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken

    if (!incomngRefreshToken) {
        throw new ApiError(401, "Refresh token is required and unauthorized request");
    }

    try {
        const decodedToken = jwt.verify(incomngRefreshToken,
            process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id)


        if (!user) {
            throw new ApiError(404, "User not found Invalid refresh token");
        }

        if (incomngRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "refresh token is expired or used");
        }


        const options = {
            httpOnly: true,
            secure: true
        }


        const { newRefreshToken, accessToken } = await generateAccessAndRefreshTokens(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken: newRefreshToken },
                    "Access token refreshed successfully"
                )
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
})


const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(401, "Old password is incorrect");
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponse(
                200, {}, "Password changed successfully..."
            )
        )
})


const getCurrerntUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user: req.user },
                "Current user fetched successfully..."
            )
        )
})


const updateUserDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { user },
                "User details updated successfully..."
            )
        )

})


const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing");
    }

    const avatar = await uploadOnImageKit(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(500, "Failed to upload avatar");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password")


    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            { user },
            "User avatar updated successfully..."
        )
    )
})



const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path
    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing");
    }

    const coverImage = await uploadOnImageKit(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(500, "Failed to upload cover image");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password")


    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            { user },
            "User Cover image updated successfully..."
        )
    )
})










export {
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrerntUser,
    updateUserDetails,
    updateUserAvatar,
    updateCoverImage
};

