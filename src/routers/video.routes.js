
import { Router } from 'express';
import {
    deleteVideo,
    getAllVideos,
    homepageVideos,
    getVideoById,
    publishAVideo,
    togglePublishStatus,
    updateVideo,
    addToWatchHistory
} from "../controllers/video.controllers.js"
import {verifyJWT} from "../middlewares/authMiddleware.js"
import {upload} from "../middlewares/multer.middleware.js"

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

router
    .route("/")
    .get(homepageVideos)
    .post(
        upload.fields([
            {
                name: "videoFile",
                maxCount: 1,
            },
            {
                name: "thumbnail",
                maxCount: 1,
            },
            
        ]),
        publishAVideo
    );

router.route("/search").get(getAllVideos)

router.route("/atwh/:videoId").post(addToWatchHistory)

router
    .route("/:videoId")
    .get(getVideoById)
    .delete(deleteVideo)
    .patch(upload.single("thumbnail"), updateVideo);

    

router.route("/toggle/publish/:videoId").patch(togglePublishStatus);

export default router
