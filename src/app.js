import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();

// Set up CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",  // Ensure CORS Origin is correct
    credentials: true, 
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE']
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

console.log("Body size limit set to 10mb");

// Serve static files from the 'public' folder
app.use(express.static('public'));
console.log("Static files served from the 'public' folder");

// Set up cookie parser
app.use(cookieParser());
console.log("Cookie parser middleware added");

// Import user routes
import userRouter from "./routers/user.routes.js";

// Use routes
app.use("/api/v1/users", userRouter);

console.log(`App is running on port ${process.env.PORT || 8080}  `);


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

// Subscription routes
import subscriptionRouter from "./routers/subscription.routes.js";  
app.use("/api/v1/subscriptions", subscriptionRouter);

// Comment routes
import commentRouter from "./routers/comment.routes.js";  
app.use("/api/v1/comments", commentRouter);


// Export app for server initialization
export { app };


