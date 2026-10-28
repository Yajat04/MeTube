import mongoose from "mongoose";
import {DB_NAME} from "../constants.js";

const connectDB = async () => {
    try{
        const connectionInstance = await mongoose.connect(`${MONGODB_URI}/${DB_NAME}`);
        console.log(`DB is connected at host ${connectionInstance.connection.host}`);
    }
    catch(error){
        console.log("DB connection FAILED!");
        process.exit(1);
    } 
}

export default connectDB;