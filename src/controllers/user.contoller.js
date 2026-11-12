import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {Subscription} from "../models/subscription.models.js"
import jwt from "jsonwebtoken"

const generateAcessAndRefreshTokens = async (id) => {
    try {
        const user = await User.findById(id);
        const accessToken = await user.makeAccessToken()
        const refreshToken = await user.makeRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave : false})
        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError("400", "Unable to generate tokens")
    }
}

const registerUser = asyncHandler(async (req, res) => { //passes the request using the express objects (req, res, next) to asyncH
    //no need to return here as asynH does it for this 
    
    //Steps required to register a user
    // get input from frontend ( using postman )
    // empty , validation checks on backend
    // check if user already present
    // autorization
    // communication with db
    // imgs, vids etc categorize, avatar 
    // upload to cloudinary 
    // response if success or failure -> avoid sending password or token in response
    // check user

    const {fullName, username, email, password} = req.body
    
    if(
        [fullName, username, email, password].some(
            (field) => field?.trim() === ""
        )
    ){
        throw new ApiError(400, "All fields are required")
    }

    const userExists = await User.findOne(
        {
            $or: [{ username }, { email }]
        }
    )

    if(userExists){
        throw new ApiError(409, "User already exists")
    }

    // get path of imgs etc on local where multer stores it
    const avatarLocalPath = req.files?.avatar?.[0]?.path
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path

    if(!avatarLocalPath){
        throw new ApiError(409, "Avatar is required")
    }

    // upload on cloudinary
    const avatarOnCloudinary = await uploadOnCloudinary(avatarLocalPath) 

    let coverImageOnCloudinary = null
    if(coverImageLocalPath){
        coverImageOnCloudinary = await uploadOnCloudinary(coverImageLocalPath) 
    } //handles if user didnt send coverImg

    // another beautiful check
    // if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    //coverImageLocalPath = req.files.coverImage[0].path;
    //}

    if(!avatarOnCloudinary){
        throw new ApiError(409, "Unable to fetch Avatar")
    }

    const user = await User.create({
        fullName,
        avatar : avatarOnCloudinary.url,
        coverImage : coverImageOnCloudinary?.url || "",
        email : email.toLowerCase(),
        username : username.toLowerCase(),
        password,
        // refreshToken and watch history are not given by user
    })

    const userCreated = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    
    if(!userCreated){
        throw new ApiError(500, "Something went wrong") 
    }

    return res.status(201).json(
        new ApiResponse(200, userCreated, "User registered successfully")
    )

}//this whole ft goes as asyncH argument and get executed with the promise check
)

const loginUser = asyncHandler(async (req, res) => {
    // req body -> data (form frontEnd)
    // check for username or email
    // check if user exists, if not signUp
    // check password
    // validate access token
    // if no access token, validate for refresh token

    const {email, username, password} = req.body //it depends on your frontend what you have given at this point of login

    if(!(email || username)) throw new ApiError(400, "Email and username required")

    const user = await User.findOne({
        $or : [{username}, {email}]
    })
    if(!user) throw new ApiError(404, "User does not exist, please SignUp to continue")

    //The custom methods that we have made in User Model cannot be accessed directly by User object here, 
    // it can be accessed by the response instance of the user ie "user" above
    const isCorrectPassword = await user.isvalidPassword(password)
    if(!isCorrectPassword) throw new ApiError(401, "Incorrect Password")
    
    // Now if password is valid it gonna generate refresh and access tokens -> repeated step therefore make method for it
    const {accessToken, refreshToken} = await generateAcessAndRefreshTokens(user._id)

    //Now the user doc is updated and we have the old instance stored therefore need to have the updated one
    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    const options = {
        httpOnly : true,
        secure : true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },

        "user Logged in Successfully"
        )
    )
})

const logoutUser = asyncHandler(async (req, res) => {
    // We must flush all cookies
    // but how would you access the user while logging out you wont be getting any entries to match in db like form etc at the time of login
    // hence Middleware to be used to do this functionality
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {refreshToken: undefined}
        },
        {
            new: true // returns the user with updated details =, at default it returns the before update one
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
    .json(new ApiResponse(400, {}, "User logged out Successfully"))


})

const refreshAccessToken = asyncHandler(async (req, res) => {
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken //sent explicitly by frontend
        if(!incomingRefreshToken) throw new ApiError(400, "Invalid refresh token")
    
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET_KEY)
        
        const user = await User.findById(decodedToken?._id)
        if(!user) throw new ApiError(400, "Invalid Refresh Token")
    
        // since we gonna generate the new refresh tokens as well,
        // hence we need to make sure if the refresh token with which the request has come is the same as that been stored in the DB
        // As there may be multiple refresh tokens alive, hence we need to entertain the request made by latest one (saved in db)
        if(incomingRefreshToken !== user.refreshToken) throw new ApiError(400, "Refresh Token is expired or used")
        
        // If valid token and is the latest one
        const {newAccessToken, newRefreshToken} = generateAcessAndRefreshTokens(user._id)
    
        return res //This is for the frontend
        .status(200)
        .cookie("accessToken", newAccessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    accessToken : newAccessToken,
                    refershToken : newRefreshToken
                },
                "Access Token Refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(400, "Invalid Access Token")
    }
})

// Additional functionalities to be added regarding users

// changing password is only viable if you are logged in (access token is to be active), forgot password is different thing
const updatePassword = asyncHandler(async (req, res) => {
    const {oldPassword, newPassword} = req.body
    /*
    This is called object destructuring in JavaScript
    It automatically extracts the properties named oldPassword and newPassword from req.body.
    The property names must match exactly.
    If a property doesn't exist in req.body, its value becomes undefined. 
    Above is equivalent to : const oldPassword = req.body.oldPassword; const newPassword = req.body.newPassword;
    */

    // before this the verifyJWT would have been definitely middlewared therefore req.user will consist user
    const user = req.user
    if(!user) throw new ApiError(400, "Failed to change password")

    const isCorrectPassword = await user.isvalidPassword(oldPassword)
    if(!isCorrectPassword) throw new ApiError(401, "Incorrect Password")
 
    user.password = newPassword //The pre middleware in user model hashs it again
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(200, {}, "Password changed successfully")
})

// verifyJWT MW injected
const getUserDetails = asyncHandler(async (req, res) => {
    const user = req.user
    if(!user) throw new ApiError(400, "Failed to fetch user details")

    return res
    .status(200)
    .json(new ApiResponse(200, {user}, "Successfully fetched user")) // or user : req.user without storing in user var above 
    // not directly req.user as shorthand accepts variables, names etc not properties like req., res. etc in JS
})

// Depends on backend developer what fields are allowed to change  
const updateUserDetails = asyncHandler(async (req, res) => {
    const {fullName, email} = req.body
    // Here multiple fields need to be updated and saved therefore do it with findAndUpdate

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                email,
                fullName
            }
        },
        {
            new: true
        }
    ).select("-password -refreshToken")

    return res
    .status(200)
    .json(new ApiResponse(200, {user}, "Successfully saved changes"))
})

//Note : try to update file changes separately for less congestion
const updateAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path //.file instead of files depends on the multer input if it is single or fields
    if(!avatarLocalPath) throw new ApiError(400, "Failed to fetch local path")
    
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if(!avatar.url) throw new ApiError(400, "Failed to upload")

    // The below works fine but prefer to use it when task is related to password otherwise use set methd (find+update)
    req.user.avatar = avatar.url
    await req.user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "avatar changed Successfully"))
})

const updateCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path //.file instead of files depends on the multer input if it is single or fields
    if(!coverImageLocalPath) throw new ApiError(400, "Failed to fetch local path")
    
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!coverImage.url) throw new ApiError(400, "Failed to upload")

    // The below works fine but prefer to use it when task is related to password otherwise use set methd (find+update)
    req.user.coverImage = coverImage.url
    await req.user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "coverImage changed Successfully"))
})

// To find subscribers and subscribedTo
const getUserChannelProfile = asyncHandler(async (req, res) => {
    const {username} = req.params // params are used to access dynamic values present in the URL path, username of the channel on whose profile we are hovering
    if(!username?.trim()) throw new ApiError(400, "unable to fetch user info")
    const channel = await User.aggregate([ // channel holds the returned array by aggregate pipeline containing the docs satifying structure of project, in our case it contains only one user for which we are discovering
        {
            $model: {
                username : username?.toLowerCase()
            }
        },
        { // To find subscribers
            $lookup : {
                from: "subscriptions", // The mongoDB name small + plural
                localField: "_id",
                foreignField: "channel",
                as: "subscribers" // array contains docs of the subscription schema (contains whole doc i.e both channel and sub but found on basis of the key channel)
            }
        },
        { // To find subcribed to which channels
            $lookup : {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo" //array 
            }
        },
        { 
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers" //$ depicts string literal as feild 
                },
                subscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: { // Stores true if "i"(loggedIn user) exist in subscribers of the channel (with given username)
                    $cond: { //check on condition
                        if: {
                            $in: [req.user?._id, "$subscribers.subscriber"],
                            then: true,
                            else: false
                        }
                    }
                }
            }
        },
        { // projection of those fields we need to display for the channel the logged in user is hovering on
            $project: {
                fullName: 1,
                username: 1,
                email: 1,
                subscribersCount: 1,
                subscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1
            }
        }
    ])

    if(!channel?.length) throw new ApiError(404, "user details not fetched") //Not !channel as it hold empty array and it marked as "exist" therefore check through size of array (empty or not)
    
    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User Channel" ) // channel array contains only one el (details of hovered channel),, which is present at index 0
    )
})

export { registerUser, loginUser, logoutUser, refreshAccessToken, updatePassword, getUserDetails, updateUserDetails, updateAvatar, updateCoverImage} 