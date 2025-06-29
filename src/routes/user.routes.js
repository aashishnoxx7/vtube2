import express from "express";
import { registerUser, logOut, loginUser } from "../controllers/user.controllers.js";
import {upload} from "../middlewares/multer.middlewares.js"
import { verifyJWT } from "../middlewares/auth.middlewares.js";
const router = express.Router(); // ✅ Use express.Router, NOT the `router` package


//router.post("/register", registerUser);
router.route("/register").post(
    upload.fields([
        {
            name : "avatar",
            maxCount : 1
        }, {
            name : "coverImage",
            maxCount : 1
        }
    ]),
    registerUser
)
//secured route

router.route("/logout").post(verifyJWT, logOut)

export default router;
