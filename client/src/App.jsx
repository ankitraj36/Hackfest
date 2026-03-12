/**
 * App.jsx — Root application with routing
 * 
 * Routes:
 *   /              → BootSequence (one-time per session)
 *   /home          → HomePage (create/join room)
 *   /lobby/:roomId → Lobby (pre-broadcast waiting room)
 *   /broadcast/:roomId → BroadcasterView
 *   /watch/:roomId     → ListenerView
 */

import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import BootSequence from './pages/BootSequence';
import HomePage from './pages/HomePage';
import Lobby from './pages/Lobby';
import BroadcasterView from './pages/BroadcasterView';
import ListenerView from './pages/ListenerView';
import ParticleBackground from './components/ParticleBackground';
import ChristmasLights from './components/ChristmasLights';

export default function App() {
  // Upside Down mode: inverts colors + activates drone sound
  const [upsideDown, setUpsideDown] = useState(false);
  // Callsign persisted across navigations
  const [callsign, setCallsign] = useState('');

  return (
    <div
      className={`app-root ${upsideDown ? 'upside-down' : ''}`}
      style={{ minHeight: '100vh', position: 'relative' }}
    >
      <ParticleBackground />
      <ChristmasLights />

      {/* Upside Down toggle in header */}
      <header className="app-header">
        <span className="header-title">⌁ CEREBRO v3.0</span>

        {/* Mobile field agent label */}
        <span className="field-agent-label">[ FIELD AGENT MODE ]</span>

        <button
          className="retro-button upside-down-toggle"
          onClick={() => setUpsideDown((prev) => !prev)}
        >
          {upsideDown ? 'EXIT UPSIDE DOWN' : '⌁ UPSIDE DOWN'}
        </button>
      </header>

      <main className="app-main">
        <Routes>
          <Route path="/" element={<BootSequence />} />
          <Route
            path="/home"
            element={<HomePage callsign={callsign} setCallsign={setCallsign} />}
          />
          <Route
            path="/lobby/:roomId"
            element={<Lobby callsign={callsign} setCallsign={setCallsign} />}
          />
          <Route
            path="/broadcast/:roomId"
            element={<BroadcasterView callsign={callsign} />}
          />
          <Route
            path="/watch/:roomId"
            element={<ListenerView callsign={callsign} />}
          />
        </Routes>
      </main>
    </div>
  );
}
