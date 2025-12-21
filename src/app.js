import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, '..');
const publicDir = path.join(backendRoot, 'public')

;

// For development/debugging: avoid conditional 304s that hide actual payload sizes.
// (HLS manifests are small by design; segments carry the bulk of data.)
app.set('etag', false);

// Set up CORS
app.use(cors({
    origin:  "http://localhost:3000" ,  // Ensure CORS Origin is correct
    credentials: true, 
    allowedHeaders: ['Content-Type', 'Authorization','x-access-token', 'Range'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    exposedHeaders:['x-access-token', 'Content-Type', 'Authorization', 'Content-Range', 'Accept-Ranges', 'Content-Length']
}));




app.get("/ping", (req, res) => {
  console.log("Ping route hit");
  res.json({ message: "pong" });
});

// // Increase body size limit to 10MB
// app.use(express.urlencoded({ extended: true, limit: "10mb" }));
// app.use(express.json({ limit: "10mb" }));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Avoid caching API responses (prevents confusing 304s for XHR/fetch).
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});



// Serve static files from the 'public' folder
// Ensure correct MIME types for HLS assets.
// Compatibility redirect: old "/temp/hls-*" paths now live at root "/hls-*"
app.get(/^\/temp\/hls-[^/]+\/.+$/, (req, res, next) => {
  // Only redirect when the asset exists in the new location.
  // This avoids breaking already-generated assets that still live under public/temp.
  const target = req.originalUrl.replace(/^\/temp\//, '/');
  const absoluteTarget = path.join(publicDir, target.replace(/^\//, ''));
  if (fs.existsSync(absoluteTarget)) {
    return res.redirect(301, target);
  }
  // Let express.static serve from public/temp if present.
  return next();
});

app.use(
  express.static(publicDir, {
    setHeaders: (res, filePath) => {
      
      
      //TODO 




      if (filePath.endsWith('.m3u8')) {
        // Many players expect this exact MIME type for HLS manifests
        res.setHeader('Content-Type', 'application/x-mpegURL');
        // Prevent stale manifests during dev; also avoids conditional 304s.
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
      if (filePath.endsWith('.ts')) {
        res.setHeader('Content-Type', 'video/mp2t');
        // Prevent conditional caching during dev (makes Network tab clearer).
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    },
  })
);
console.log("Static files served from the 'public' folder");

// Set up cookie parser
app.use(cookieParser());
console.log("Cookie parser middleware added");

// Import user routes
import userRouter from "./routers/user.routes.js";

// Use routes
app.use("/api/v1/users", userRouter);

console.log(`App is running on port ${process.env.PORT }  `);


import { User } from './models/user.model.js';

const createTestUser = async () =>{
  const user = new User({
    username: "testuser",
    email: "trwe@gmail.com",
    fullName: "Test User",
    password: "testpassword",
    avatar:"https://example.com/avatar.png",
  })

  await user.save()
  console.log("Test user created:", user);
  
}

// createTestUser()

// Like routes
import likeRouter from "./routers/like.routes.js";
app.use("/api/v1/likes", likeRouter);

// Tweet routes
import tweetRouter from "./routers/tweet.routes.js";
app.use("/api/v1/tweets", tweetRouter);


// Playlist routes
import playlistRouter from "./routers/playlist.routes.js";  
app.use("/api/v1/playlists", playlistRouter);

// Video routes
import videoRouter from "./routers/video.routes.js";
app.use("/api/v1/videos", videoRouter);

// Video Processing routes
import videoProcessingRouter from "./routers/videoProcessing.routes.js";
app.use("/api/v1/video-processing", videoProcessingRouter);

// Subscription routes
import subscriptionRouter from "./routers/subscription.routes.js";  
app.use("/api/v1/subscriptions", subscriptionRouter);

// Comment routes
import commentRouter from "./routers/comment.routes.js";  
app.use("/api/v1/comments", commentRouter);

// Channel routes
import channelRouter from "./routers/channel.routes.js";  
app.use("/api/v1/channels", channelRouter);

// Message routes
import messageRouter from "./routers/message.routes.js";
app.use("/api/v1/messages", messageRouter);

// Export app for server initialization
export { app };


