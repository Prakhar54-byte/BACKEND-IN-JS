import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

// Set up CORS
app.use(cors({
    origin:  "http://localhost:3000",  // Ensure CORS Origin is correct
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



// Serve static files from the 'public' folder
// Ensure correct MIME types for HLS assets.
app.use(
  express.static('public', {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.m3u8')) {
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      }
      if (filePath.endsWith('.ts')) {
        res.setHeader('Content-Type', 'video/mp2t');
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


