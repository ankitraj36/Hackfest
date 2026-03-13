/**
 * Room REST API Routes
 * - POST /api/room/create: Generate a new room with a 6-char alphanumeric ID
 * - GET  /api/room/:roomId: Fetch room metadata
 */

import { Router } from 'express';
import { customAlphabet } from 'nanoid';
import Room from '../models/Room.js';

const router = Router();

// Generate 6-character alphanumeric room IDs
const generateRoomId = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 6);

/**
 * POST /api/room/create
 * Creates a new room and saves it to MongoDB
 */
router.post('/create', async (_req, res) => {
  try {
    const roomId = generateRoomId();
    const room = await Room.create({
      roomId,
      createdAt: new Date(),
      broadcasterSocketId: null,
      videoUrl: '',
      playbackState: {
        action: 'pause',
        currentTime: 0,
        isPlaying: false,
        lastUpdated: Date.now(),
      },
      connectedUsers: [],
    });

    res.status(201).json({ roomId: room.roomId, createdAt: room.createdAt });
  } catch (err) {
    console.error('> ROOM CREATION FAILURE:', err.message);
    res.status(500).json({ error: 'CEREBRO UPLINK ERROR — ROOM CREATION FAILED' });
  }
});

/**
 * GET /api/room/:roomId
 * Returns room metadata, connected users, and playback state
 */
router.get('/:roomId', async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId });
    if (!room) {
      return res.status(404).json({ error: 'FREQUENCY NOT FOUND' });
    }
    res.json({
      roomId: room.roomId,
      createdAt: room.createdAt,
      videoUrl: room.videoUrl,
      playbackState: room.playbackState,
      connectedUsers: room.connectedUsers,
    });
  } catch (err) {
    console.error('> ROOM LOOKUP FAILURE:', err.message);
    res.status(500).json({ error: 'CEREBRO UPLINK ERROR' });
  }
});

export default router;
