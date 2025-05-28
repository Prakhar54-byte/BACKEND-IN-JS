import { Router } from 'express';
import {
    toggleVideoLike,
    toggleCommentLike,
    toggleTweetLike,
    getLikedVideos,
    getLikedComments,
    getLikedTweets
} from "../controllers/like.controllers.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";

const router = Router();

// Apply JWT verification to all routes in this router
router.use(verifyJWT);

// Toggle like/unlike routes (POST)
router.post('/video/:id/toggle', toggleVideoLike);
router.post('/comment/:id/toggle', toggleCommentLike);
router.post('/tweet/:id/toggle', toggleTweetLike);

// Get all liked items for the logged-in user (GET)
router.get('/videos', getLikedVideos);
router.get('/comments', getLikedComments);
router.get('/tweets', getLikedTweets);

export default router;
