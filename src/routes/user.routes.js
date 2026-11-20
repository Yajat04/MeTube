import { registerUser, loginUser, logoutUser, refreshAccessToken, updateCoverImage, updatePassword, getUserDetails, updateUserDetails, updateAvatar, getUserChannelProfile, getWatchHistory } from "../controllers/user.contoller.js"; 
import {Router} from "express";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

//Let this is the operation to register a user(add = post, as user)
const router = Router()
router.route("/register").post(
    upload.fields([
        {
            name : "avatar",
            maxCount : 1
        },
        {
            name : "coverImage",
            maxCount : 1
        }
    ]),

    registerUser
)

router.route("/login").post(loginUser)

router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-Token").post(refreshAccessToken) //When to send or not (end point creation) handled by frontend
router.route("/change-password").post(verifyJWT, updatePassword);
router.route("/current-user").patch(verifyJWT, getUserDetails);
router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateAvatar);
router.route("/update-coverImage").patch(verifyJWT, upload.single("coverImage"), updateCoverImage);
router.route("/c/:username").get(verifyJWT, getUserChannelProfile);
router.route("/history").get(verifyJWT, getWatchHistory);


export default router
