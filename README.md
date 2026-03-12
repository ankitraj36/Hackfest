# 🔴 CEREBRO'S CODE RED SYNCHRONIZER v3.0

> *Real-time synchronized video broadcasting platform*
> *Inspired by Stranger Things / Hawkins Lab / 1980s Cerebro machine console aesthetic*

```
╔══════════════════════════════════════════╗
║   CEREBRO'S CODE RED SYNCHRONIZER v3.0  ║
╚══════════════════════════════════════════╝
```

## ✨ Features

- **Real-time Video Sync** — WebSocket-powered playback synchronization
- **CRT Monitor Aesthetic** — Scanlines, phosphor glow, vignette effects
- **Retro Terminal UI** — VT323 font, classified document styling
- **Boot Sequence** — Typewriter animation on first load
- **Sync Engine** — Drift detection, auto-correction, manual resync
- **Latency Monitoring** — Per-user sparkline graphs with health scoring
- **Chat System** — Ham radio transmission log with pinnable messages
- **Emoji Reactions** — Floating emoji animations with broadcaster tallies
- **Radar Sweep** — Canvas-animated radar showing connected agents
- **Christmas Lights** — Stranger Things alphabet wall light strip
- **Particle Background** — Ambient red/orange particle drift
- **Upside Down Mode** — Inverts colors + 60Hz drone sound
- **Debug Panel** — Ctrl+Shift+D for full diagnostics
- **Sound Effects** — Web Audio API oscillator-based (zero audio files)
- **Mobile Responsive** — Field Agent Mode for < 768px screens

## 📋 Prerequisites

- **Node.js** 18+
- **MongoDB** running locally on default port (27017)
- Two terminal windows

## 🚀 Installation

```bash
# Clone/download the project, then:

# Terminal 1 — Install server dependencies
cd cerebro-sync/server
npm install

# Terminal 2 — Install client dependencies
cd cerebro-sync/client
npm install
```

## ▶️ Run

```bash
# Terminal 1 — Start the server
cd cerebro-sync/server
npm start

# Terminal 2 — Start the client
cd cerebro-sync/client
npm run dev
```

Server runs on `http://localhost:5000`
Client runs on `http://localhost:5173`

## 🧪 Testing Sync

1. Open `http://localhost:5173` in **two browser tabs**
2. **Tab 1**: Enter callsign → Create Room → Copy the 6-char room code
3. **Tab 2**: Enter callsign → Join Room → Paste the room code
4. In the Lobby, click **BEGIN BROADCAST** (Tab 1)
5. After countdown, paste this test video URL:
   ```
   https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4
   ```
6. Play/pause/seek in Tab 1 → Tab 2 syncs automatically!

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+D` | Toggle Debug Panel |

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                  CLIENT (React + Vite)          │
│                                                 │
│  ┌──────┐ ┌──────────┐ ┌───────────┐          │
│  │ Boot │→│ HomePage  │→│   Lobby   │          │
│  │ Seq  │ │Create/Join│ │  Waiting  │          │
│  └──────┘ └──────────┘ └─────┬─────┘          │
│                         ┌─────┴──────┐          │
│                    ┌────┴────┐ ┌─────┴────┐    │
│                    │Broadcast│ │ Listener  │    │
│                    │  View   │ │   View    │    │
│                    └─────────┘ └──────────┘    │
│                                                 │
│  Socket.io Client ←──────────────────────────┐ │
│  useSocket / useLatency / useSyncEngine      │ │
└──────────────────────────────────────────┬───┘ │
                                           │      │
                    WebSocket + REST API   │      │
                                           ▼      │
┌──────────────────────────────────────────────┐  │
│              SERVER (Express + Socket.io)      │
│                                                │
│  ┌──────────────┐  ┌──────────────────────┐   │
│  │  REST API    │  │  Socket Handlers     │   │
│  │  /api/room   │  │  join / sync / chat  │   │
│  └──────┬───────┘  └──────────┬───────────┘   │
│         │                     │                │
│         ▼                     ▼                │
│  ┌──────────────────────────────────┐          │
│  │         MongoDB (Mongoose)       │          │
│  │    Rooms / Messages              │          │
│  └──────────────────────────────────┘          │
└────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
cerebro-sync/
├── server/
│   ├── index.js              # Express + Socket.io entry
│   ├── socketHandlers.js     # All WS event handling
│   ├── routes/room.js        # REST API routes
│   ├── models/Room.js        # Mongoose Room schema
│   ├── models/Message.js     # Mongoose Message schema
│   ├── middleware/rateLimiter.js
│   └── .env
├── client/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx / App.jsx
│       ├── pages/            # 5 route pages
│       ├── components/       # 9 reusable components
│       ├── hooks/            # 4 custom hooks
│       ├── utils/            # Pure helper functions
│       └── styles/           # 3 CSS files (retro/crt/animations)
└── README.md
```

## ⚠️ Known Limitations

- **No Authentication** — Uses callsign-based identity only
- **No HTTPS** — Local development only (WebRTC/camera not used)
- **YouTube Embed** — Cross-origin limitations prevent direct sync of YouTube iframes
- **MongoDB Required** — Server starts without DB but room persistence is lost
- **Single Server** — No horizontal scaling (rooms stored in memory Map)
- **Browser Autoplay** — Some browsers may block auto-play; user interaction needed first

## 📜 License

MIT — Built for Hawkins Lab, Department of Energy. CLASSIFIED.
