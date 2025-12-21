import { Router } from "express";
import { verifyJWT } from "../middlewares/authMiddleware.js";
import {
  createChannel,
  updateChannel,
  deleteChannel,
  getChannelProfile,
  getChannelSubscribers,
  toggleSubscription,
  getUserChannels,
  getUserChannel,
  uploadChannelAvatar,
  uploadChannelBanner
} from "../controllers/channel.controller.js";
import { upload } from "../middlewares/multer.middleware.js";


const router = Router();

// Create a new channel (authenticated)
router.post("/create", verifyJWT,upload.single("avatar"), createChannel);

// Update an existing channel (authenticated, owner only)
router.patch("/:channelId", verifyJWT, updateChannel);

// Delete a channel (authenticated, owner only)
router.delete("/:channelId", verifyJWT, deleteChannel);

// Get a channel's public profile (anyone)
router.get("/:channelId", getChannelProfile);

// Get all channels owned by the authenticated user
router.get("/user/me", verifyJWT, getUserChannels);

// Get the single channel owned by the authenticated user (for upload checks)
router.get("/user/current", verifyJWT, getUserChannel);

// Get subscribers of a channel (anyone)
router.get("/:channelId/subscribers", getChannelSubscribers);

// Toggle subscription to a channel (authenticated)
router.post("/:channelId/subscribe", verifyJWT, toggleSubscription);

// Upload channel avatar (authenticated, owner only)
router.post("/:channelId/avatar", verifyJWT, uploadChannelAvatar);

// Upload channel banner (authenticated, owner only)
router.post("/:channelId/banner", verifyJWT, uploadChannelBanner);

export default router;
