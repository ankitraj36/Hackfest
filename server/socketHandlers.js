/**
 * CEREBRO'S CODE RED SYNCHRONIZER — Socket.io Event Handlers
 * 
 * Manages all real-time communication:
 * - Room join/leave lifecycle
 * - Playback synchronization (play/pause/seek)
 * - Latency measurement via ping/pong
 * - Heartbeat drift detection & auto-correction
 * - Chat messaging
 * - Emoji reactions
 * - Broadcaster disconnect → auto-promotion
 */

import Room from './models/Room.js';
import Message from './models/Message.js';

// In-memory room state for fast access (MongoDB is for persistence)
const rooms = new Map();
// Track broadcaster disconnect timers for auto-promotion
const disconnectTimers = new Map();

/**
 * Get or create an in-memory room state object
 */
function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, {
      broadcaster: null,
      listeners: [],
      playbackState: {
        action: 'pause',
        currentTime: 0,
        isPlaying: false,
        lastUpdated: Date.now(),
      },
      videoUrl: '',
    });
  }
  return rooms.get(roomId);
}

export function initSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`> AGENT CONNECTED: ${socket.id}`);

    /**
     * JOIN ROOM
     * Adds user to room, tracks role, broadcasts user list update
     */
    socket.on('join-room', ({ roomId, role, callsign }) => {
      socket.join(roomId);
      socket.data = { roomId, role, callsign };

      const room = getRoom(roomId);
      const userEntry = { socketId: socket.id, callsign, role, latency: 0 };

      if (role === 'broadcaster') {
        room.broadcaster = userEntry;

        // Cancel any pending auto-promotion timer if broadcaster rejoins
        if (disconnectTimers.has(roomId)) {
          clearTimeout(disconnectTimers.get(roomId));
          disconnectTimers.delete(roomId);
        }
      } else {
        room.listeners.push(userEntry);
      }

      // Build full user list for the room
      const userList = getUserList(room);

      // Notify everyone in the room about the new connection
      io.to(roomId).emit('user-connected', {
        socketId: socket.id,
        callsign,
        role,
        userList,
      });

      // Persist connected users to MongoDB (fire and forget)
      Room.findOneAndUpdate(
        { roomId },
        { connectedUsers: userList },
        { upsert: false }
      ).catch(() => {});

      console.log(`> ${callsign} (${role}) joined room ${roomId}`);
    });

    /**
     * PLAYBACK SYNC
     * Broadcaster sends play/pause/seek actions → relay to all listeners
     */
    socket.on('playback-sync', ({ action, currentTime, serverTime }) => {
      const { roomId } = socket.data || {};
      if (!roomId) return;

      const room = getRoom(roomId);
      room.playbackState = {
        action,
        currentTime,
        isPlaying: action === 'play',
        lastUpdated: Date.now(),
      };

      // Persist playback state
      Room.findOneAndUpdate(
        { roomId },
        { playbackState: room.playbackState }
      ).catch(() => {});

      // Broadcast to all OTHER clients in the room
      socket.to(roomId).emit('sync-state', {
        action,
        currentTime,
        serverTime: serverTime || Date.now(),
      });
    });

    /**
     * LATENCY PING/PONG
     * Client sends ping with its timestamp, server bounces back with both times
     */
    socket.on('latency-ping', ({ clientTime }) => {
      socket.emit('latency-pong', {
        serverTime: Date.now(),
        clientTime,
      });
    });

    /**
     * HEARTBEAT SYNC
     * Broadcaster sends current time every 5s; server checks drift for each listener
     */
    socket.on('heartbeat-sync', ({ currentTime }) => {
      const { roomId } = socket.data || {};
      if (!roomId) return;

      const room = getRoom(roomId);
      room.playbackState.currentTime = currentTime;
      room.playbackState.lastUpdated = Date.now();

      // Broadcast heartbeat to listeners so they can check their own drift
      socket.to(roomId).emit('heartbeat-correction', { currentTime });
    });

    /**
     * CHAT MESSAGE
     * Relay chat messages and persist to MongoDB
     */
    socket.on('chat-message', async ({ roomId, callsign, message }) => {
      const timestamp = new Date();

      // Save to database
      try {
        await Message.create({ roomId, callsign, message, timestamp, pinned: false });
      } catch (e) {
        // Non-critical: continue even if DB save fails
      }

      // Broadcast to all in room
      io.to(roomId).emit('chat-broadcast', { callsign, message, timestamp });
    });

    /**
     * PIN MESSAGE
     * Broadcaster can pin a message for everyone to see
     */
    socket.on('pin-message', ({ roomId, messageId }) => {
      io.to(roomId).emit('message-pinned', { messageId });
    });

    /**
     * REACTION
     * Emoji reactions broadcast to all in room
     */
    socket.on('reaction', ({ roomId, emoji }) => {
      const callsign = socket.data?.callsign || 'UNKNOWN';
      io.to(roomId).emit('reaction-broadcast', { emoji, callsign });
    });

    /**
     * REQUEST STATE
     * New listener asks for current playback state (e.g., after reconnect)
     */
    socket.on('request-state', ({ roomId }) => {
      const room = getRoom(roomId);
      if (room) {
        socket.emit('sync-state', {
          action: room.playbackState.isPlaying ? 'play' : 'pause',
          currentTime: room.playbackState.currentTime,
          serverTime: Date.now(),
        });
      }
    });

    /**
     * COUNTDOWN START
     * Broadcaster initiates a synced 5-second countdown before playback
     */
    socket.on('countdown-start', ({ roomId, seconds }) => {
      io.to(roomId).emit('countdown-start', { seconds: seconds || 5 });
    });

    /**
     * VIDEO URL UPDATE
     * Broadcaster sets the video URL for the room
     */
    socket.on('video-url-update', ({ roomId, videoUrl }) => {
      const room = getRoom(roomId);
      room.videoUrl = videoUrl;

      Room.findOneAndUpdate({ roomId }, { videoUrl }).catch(() => {});

      socket.to(roomId).emit('video-url-update', { videoUrl });
    });

    /**
     * DISCONNECT
     * Handle cleanup, auto-promotion of oldest listener if broadcaster leaves
     */
    socket.on('disconnect', () => {
      const { roomId, role, callsign } = socket.data || {};
      if (!roomId) return;

      const room = getRoom(roomId);
      console.log(`> AGENT DISCONNECTED: ${callsign} (${role}) from ${roomId}`);

      if (role === 'broadcaster') {
        room.broadcaster = null;

        // Notify listeners that broadcaster left
        io.to(roomId).emit('broadcaster-left', { callsign });

        // Start 30-second timer: auto-promote oldest listener if broadcaster doesn't return
        const timer = setTimeout(() => {
          const room = getRoom(roomId);
          if (!room.broadcaster && room.listeners.length > 0) {
            const promoted = room.listeners.shift();
            promoted.role = 'broadcaster';
            room.broadcaster = promoted;

            io.to(roomId).emit('broadcaster-promoted', {
              newBroadcasterSocketId: promoted.socketId,
              callsign: promoted.callsign,
            });

            console.log(`> AUTO-PROMOTED ${promoted.callsign} to broadcaster in ${roomId}`);
          }
          disconnectTimers.delete(roomId);
        }, 30000);

        disconnectTimers.set(roomId, timer);
      } else {
        // Remove listener from room
        room.listeners = room.listeners.filter((l) => l.socketId !== socket.id);
      }

      const userList = getUserList(room);
      io.to(roomId).emit('user-disconnected', {
        socketId: socket.id,
        userList,
      });

      // Persist updated user list
      Room.findOneAndUpdate(
        { roomId },
        { connectedUsers: userList }
      ).catch(() => {});

      // Clean up empty rooms after 5 minutes
      if (!room.broadcaster && room.listeners.length === 0) {
        setTimeout(() => {
          const r = rooms.get(roomId);
          if (r && !r.broadcaster && r.listeners.length === 0) {
            rooms.delete(roomId);
            console.log(`> ROOM ${roomId} PURGED — NO AGENTS REMAINING`);
          }
        }, 300000);
      }
    });
  });
}

/**
 * Build a flat user list array from room's broadcaster + listeners
 */
function getUserList(room) {
  const list = [];
  if (room.broadcaster) list.push(room.broadcaster);
  list.push(...room.listeners);
  return list;
}
