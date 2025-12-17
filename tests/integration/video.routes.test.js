import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../../src/app.js';
import connectDB from '../../src/db/index.js';
import { Video } from '../../src/models/video.model.js';
import { User } from '../../src/models/user.model.js';
import jwt from 'jsonwebtoken';

// Global variable to hold the JWT token for an authenticated user
let authToken;
let testUser;

// Setup: Connect to the database and create a test user before all tests run
beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await connectDB();

  // Create a dummy user for authentication
  testUser = await User.create({
    username: 'testuser',
    email: 'test@example.com',
    password: 'password123',
    fullName: 'Test User',
    avatar: 'http://example.com/avatar.jpg', // Add required avatar field
  });

  // Generate a JWT token for the test user
  authToken = jwt.sign({ _id: testUser._id }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: '1d',
  });
});

// Teardown: Disconnect from the database and clean up after all tests run
afterAll(async () => {
  await User.deleteMany({});
  await Video.deleteMany({});
  await mongoose.connection.close();
});

describe('Video Routes', () => {
  describe('POST /api/v1/videos', () => {
    it('should upload a video and return 202 Accepted', async () => {
      const response = await request(app)
        .post('/api/v1/videos')
        .set('Authorization', `Bearer ${authToken}`)
        .field('title', 'My Test Video')
        .field('description', 'A description for my test video')
        .attach('videoFile', Buffer.from('fake video data'), 'test-video.mp4')
        .attach('thumbnail', Buffer.from('fake thumbnail data'), 'test-thumbnail.jpg');

      // 1. Assert the HTTP response
      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.data.video).toBeDefined();
      expect(response.body.data.video.processingStatus).toBe('processing');

      // 2. Assert that the video was created in the database
      const videoInDb = await Video.findById(response.body.data.video._id);
      expect(videoInDb).not.toBeNull();
      expect(videoInDb.title).toBe('My Test Video');
      expect(videoInDb.processingStatus).toBe('processing');
    });

    it('should return 400 if title or description is missing', async () => {
        const response = await request(app)
          .post('/api/v1/videos')
          .set('Authorization', `Bearer ${authToken}`)
          .field('description', 'A description for my test video')
          .attach('videoFile', Buffer.from('fake video data'), 'test-video.mp4');
  
        expect(response.status).toBe(400);
      });

      it('should return 400 if video file is missing', async () => {
        const response = await request(app)
          .post('/api/v1/videos')
          .set('Authorization', `Bearer ${authToken}`)
          .field('title', 'My Test Video')
          .field('description', 'A description for my test video');
  
        expect(response.status).toBe(400);
      });

      it('should return 401 if user is not authenticated', async () => {
        const response = await request(app)
          .post('/api/v1/videos')
          .field('title', 'My Test Video')
          .field('description', 'A description for my test video')
          .attach('videoFile', Buffer.from('fake video data'), 'test-video.mp4');
  
        expect(response.status).toBe(401);
      });
  });
});
