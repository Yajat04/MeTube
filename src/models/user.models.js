import mongoose, {Schema} from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
    {
        username : {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true, //Trims the whitespaces
            index: true //Makes it easier to search in db, requires high computation therefore not to put everywhere 
        },

        email : {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        fullName : {
            type: String,
            required: true,
            lowercase: true,
            trim: true
        },

        avatar : {
            type: String, //Cloudinary url
            required: true
        },

        coverImage : {
            type: String
        },

        WatchHistory : [
            {
                type: Schema.Types.ObjectId,
                ref: "Video"
            }
        ],

        password: {
            type: String,
            required: [true, "Pass is reqd"]
        },

        refreshToken: {
            type: String
        }
    },
    {   timestamps: true    }
) 

userSchema.methods.isvalidPassword = async function(password){
    return await bcrypt.compare(password, this.password);
}

userSchema.methods.makeAccessToken = function(){
    return jwt.sign(
        {//all these attributes below is payload and they are defined by us, these att inly be responsible to verify the token
            _id: this._id, //mongoDB creates unique id for each user
            password: this.password,
            username: this.username,
            fullName: this.fullName,
        },

        process.env.ACCESS_TOKEN_SECRET_KEY,

        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY_KEY
        }
    )
}

userSchema.methods.makeRefreshToken = function(){
    return jwt.sign(
        {//all these attributes below is payload and they are defined by us, these att inly be responsible to verify the token
            _id: this._id, //mongoDB creates unique id for each user
        },

        process.env.REFRESH_TOKEN_SECRET_KEY,

        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY_KEY
        }
    )
}

userSchema.pre("save", async function(next){
    if(!(this.isModified("password"))) return;
    this.password = await bcrypt.hash(this.password, 10);
})


// userSchema.pre("save", async function(next){
//     if(!(this.isModified("password"))) return next();
//     this.password = await bcrypt.hash(this.password, 10);
//     next();
// })

//next	-> Refers to the callback function
//next() -> Executes the callback
//return next()	Executes the callback and exits the current function immediately after next() is executed successfully, therefore it is used just to ignore the beneath code
//at the end no return as it is not required since no extra code is there and curr ft auto ends 

//But in modern times if using the async then no need of using next() as function 

export const User = mongoose.model("User", userSchema);