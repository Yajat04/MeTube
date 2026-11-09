import { registerUser, loginUser, logoutUser } from "../controllers/user.contoller.js"; 
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

router.route("/login").post(verifyJWT, loginUser)

export default router
