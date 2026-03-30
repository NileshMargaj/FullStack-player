import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/apiError.js';
import { User } from '../models/user.model.js';
import { uploadOnImageKit } from '../utils/imagekit.js';
import { ApiResponse } from '../utils/apiResponse.js';


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


export {
    registerUser,
    loginUser,
    logOutUser
};
