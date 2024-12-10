import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";
import { loggedOut, logInUser, refreshAccessToken, registerUser } from "../controllers/user.controller.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1
    },
    {
      name: "coverImage",
      maxCount: 1
    },
  ]),
  registerUser
);

router.route("/login").post(logInUser)


//secure routes
router.route("/logout").post(verifyJWT,loggedOut)
router.route("/refesh-token").post(refreshAccessToken)

export default router;
