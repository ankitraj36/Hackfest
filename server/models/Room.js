import mongoose from 'mongoose';

const RoomSchema = new mongoose.Schema({
  roomId: { type: String, unique: true, required: true },
  createdAt: { type: Date, default: Date.now },
  broadcasterSocketId: { type: String, default: null },
  videoUrl: { type: String, default: '' },
  playbackState: {
    action: { type: String, default: 'pause' },
    currentTime: { type: Number, default: 0 },
    isPlaying: { type: Boolean, default: false },
    lastUpdated: { type: Number, default: Date.now },
  },
  connectedUsers: [
    {
      socketId: String,
      callsign: String,
      role: String,
      latency: { type: Number, default: 0 },
    },
  ],
});

export default mongoose.model('Room', RoomSchema);
