import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
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

export { registerUser, loginUser, logoutUser, refreshAccessToken} 