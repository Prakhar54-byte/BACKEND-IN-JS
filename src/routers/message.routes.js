import { Router } from "express";
import {
  sendMessage,
  getInboxByTier,
  getConversationMessages,
  setupAutoWelcome,
  getAutoWelcomeConfig,
  deleteMessage,
} from "../controllers/message.controllers.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";

const router = Router();
router.use(verifyJWT);

// Message routes
router.route("/send").post(sendMessage);
router.route("/inbox").get(getInboxByTier);
router.route("/conversation/:otherUserId").get(getConversationMessages);
router.route("/:messageId").delete(deleteMessage);

// Auto-welcome routes
router.route("/auto-welcome/setup").post(setupAutoWelcome);
router.route("/auto-welcome/config").get(getAutoWelcomeConfig);

export default router;
