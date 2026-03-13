/**
 * CEREBRO'S CODE RED SYNCHRONIZER v3.0 — Server Entry Point
 * 
 * Express + Socket.io server that handles:
 * - REST API routes for room management
 * - Real-time WebSocket events for video synchronization
 * - MongoDB connection for persistent storage
 */

import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import roomRoutes from './routes/room.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import { initSocketHandlers } from './socketHandlers.js';

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/cerebro-sync';

// Socket.io with CORS configured for Vite dev server
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());
app.use(rateLimiter);

// REST routes
app.use('/api/room', roomRoutes);

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'CEREBRO UPLINK ACTIVE', timestamp: Date.now() });
});

// Initialize Socket.io event handlers
initSocketHandlers(io);

// Connect to MongoDB then start the server
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║   CEREBRO DATABASE UPLINK: CONNECTED     ║');
    console.log('╚══════════════════════════════════════════╝');

    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`> CEREBRO SERVER ONLINE — PORT ${PORT}`);
      console.log(`> CLIENT ORIGIN ALLOWED: ${CLIENT_URL}`);
    });
  })
  .catch((err) => {
    console.error('> DATABASE UPLINK FAILURE:', err.message);
    // Start server anyway so socket connections still work
    httpServer.listen(PORT, () => {
      console.log(`> CEREBRO SERVER ONLINE (NO DB) — PORT ${PORT}`);
    });
  });
