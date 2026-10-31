import mongoose, {Schema} from "mongoose";
import mongooseAggregatepaginate from "mongoose-aggregate-paginate-v2"

const videoSchema = new Schema(
    {   //Cloudinary provides various information like video url, thumbnail, duration etc
        videoFile : {
            type: String, //Cloudinary
            required: true,
        },

        thumbnail : {
            type: String, //Cloudinary
            required: true,
        },

        title : {
            type: String, 
            required: true,
        },

        description : {
            type: String, 
            required: true
        },

        duration : {
            type: Number, //Cloudinary
            required: true,
        },

        views : {
            type: Number,
            default : 0
        },

        isPublished : {
            type: boolean,
            default : true
        },

        owner : {
            type: Schema.Types.ObjectId,
            ref : "User"
        }
    },
    {   timestamps: true    }
) 

videoSchema.plugin(mongooseAggregatepaginate)

export const Video = mongoose.model("Video", videoSchema);