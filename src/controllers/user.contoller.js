import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const userRegister = asyncHandler(async (req, res) => { //passes the request using the express objects (req, res, next) to asyncH
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
    console.log(email)
    
    if(
        [fullName, username, email, password].some(
            (field) => field?.trim() === ""
        )
    ){
        throw new ApiError(400, "All fields are required")
    }

    const userExists = User.findOne(
        {
            $or: [{ username }, { email }]
        }
    )

    if(userExists){
        throw new ApiError(409, "User already exists")
    }

    // get path of imgs etc on local where multer stores it

    const avatarLocalPath = req.files?.avatar[0]?.path
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    if(!avatarLocalPath){
        throw new ApiError(409, "Avatar is required")
    }

    // upload on cloudinary
    const avatarOnCloudinary = await uploadOnCloudinary(avatarLocalPath) 

    let coverImageOnCloudinary
    if(coverImageLocalPath){
        coverImageOnCloudinary = await uploadOnCloudinary(coverImageLocalPath) 
    } 

    if(!avatarOnCloudinary){
        throw new ApiError(409, "Avatar is required")
    }

    const user = await User.create({
        fullName,
        avatar : avatarOnCloudinary.url,
        coverImage : coverImageOnCloudinary?.url,
        email,
        username,
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

export {userRegister}