import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configure ONCE when this utility file is executed
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
     
const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;

        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        }); 

        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        } //unlink on success

        return response;
    } catch (error) {
        console.error("Cloudinary upload failed:", error);

        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        } //unlink on failure as well

        return null;
    }
};

export { uploadOnCloudinary };