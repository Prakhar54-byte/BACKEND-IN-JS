import { Router } from 'express';
import {
    createTweet,
    deleteTweet,
    getUserTweets,
    updateTweet,
    sendMessage,
    getInboxByTier,
    getConversationMessages,
    setupAutoWelcome,
    getAutoWelcomeConfig,
} from "../controllers/tweet.controllers.js"
import {verifyJWT} from "../middlewares/authMiddleware.js"

const router = Router();
router.use(verifyJWT); // Apply verifyJWT middleware to all routes in this file

// Tweet routes
router.route("/").post(createTweet);
router.route("/user/:userId").get(getUserTweets);
router.route("/:tweetId").patch(updateTweet).delete(deleteTweet);

// Message routes (using tweet model)
router.route("/send").post(sendMessage);
router.route("/inbox").get(getInboxByTier);
router.route("/conversation/:otherUserId").get(getConversationMessages);
router.route("/auto-welcome/setup").post(setupAutoWelcome);
router.route("/auto-welcome/config").get(getAutoWelcomeConfig);

export default router