import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  callsign: { type: String, required: true },
  message: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  pinned: { type: Boolean, default: false },
});

export default mongoose.model('Message', MessageSchema);
