import { verifyJWT } from "../middlewares/authMiddleware.js";
import{
    getVideoComments,
    addComment,
    updateComment,
    deleteComment,
}from "../controllers/comment.controllers.js"
import { Router } from "express";
const router = Router();

router.use(verifyJWT);

// Get comments for a video
router.get("/:videoId", getVideoComments);
// Create a new comment
router.post("/:videoId", addComment);
// Delete a comment
router.delete("/:videoId/:commentId", deleteComment); 
// Update a comment
router.put("/:videoId/:commentId", updateComment);

export default router;
