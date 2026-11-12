import mongoose, {mongo, Schema} from "mongoose"

// Data Modelling : id (by db), subscribed by (user i.e channel), subscribed to ( channel ), created at - updated at (timestamps)
const subscriptionSchema = new Schema({
    channel : {
        type : Schema.Types.ObjectId,
        ref : "User"
    },

    subscriber : {
        type : Schema.Types.ObjectId,
        ref : "User"
    }
}, {timestamps : true}
)

export const Subscription = mongoose.model("Subscription", subscriptionSchema)