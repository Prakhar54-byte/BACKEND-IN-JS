import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// ES module __dirname workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the project root directory
const projectRoot = path.resolve(__dirname, "../../"); 

// Absolute path for temp uploads
const uploadPath = path.join(projectRoot, "public", "temp");

// Create upload directory if it doesn't exist
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Configure Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // We will use the original file name for now and handle conflicts later
    cb(null, file.originalname);
  },
});

// Multer instance that accepts any file field
export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 * 1024, // 10 GB limit
  },
});
