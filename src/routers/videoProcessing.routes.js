import { Router } from "express";
import {
  processUploadedVideo,
  generateThumbnailAtTime,
  getProcessingStatus,
  compressVideoEndpoint,
  trimVideoEndpoint,
} from "../controllers/videoProcessing.controller.js";
import { verifyJWT } from "../middlewares/authMiddleware.js";

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// Process uploaded video (generate HLS, thumbnails, variants)
router.route("/process/:videoId").post(processUploadedVideo);

// Get processing status
router.route("/status/:videoId").get(getProcessingStatus);

// Generate thumbnail at specific timestamp
router.route("/thumbnail/:videoId").post(generateThumbnailAtTime);

// Compress video
router.route("/compress/:videoId").post(compressVideoEndpoint);

// Trim video
router.route("/trim/:videoId").post(trimVideoEndpoint);

export default router;
