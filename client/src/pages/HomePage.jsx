/**
 * HomePage.jsx — Main menu: Create Room or Join Room
 * 
 * Styled as classified document headers.
 * Create: POST /api/room/create → navigate to lobby as broadcaster
 * Join: validate room exists → navigate to lobby as listener
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HomePage({ callsign, setCallsign }) {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Create a new room
  async function createRoom() {
    if (!callsign.trim()) {
      setError('CALLSIGN REQUIRED');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/room/create', { method: 'POST' });
      const data = await res.json();

      if (data.roomId) {
        navigate(`/lobby/${data.roomId}?role=broadcaster`);
      } else {
        setError('UPLINK FAILURE — ROOM CREATION FAILED');
      }
    } catch {
      setError('CEREBRO SERVER UNREACHABLE');
    } finally {
      setLoading(false);
    }
  }

  // Join an existing room
  async function joinRoom(e) {
    e.preventDefault();

    if (!callsign.trim()) {
      setError('CALLSIGN REQUIRED');
      return;
    }

    if (!roomCode.trim()) {
      setError('FREQUENCY CODE REQUIRED');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/room/${roomCode.toUpperCase()}`);

      if (res.status === 404) {
        setError('FREQUENCY NOT FOUND');
        setLoading(false);
        return;
      }

      const data = await res.json();

      if (data.roomId) {
        navigate(`/lobby/${data.roomId}?role=listener`);
      } else {
        setError('FREQUENCY NOT FOUND');
      }
    } catch {
      setError('CEREBRO SERVER UNREACHABLE');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        gap: '2rem',
        padding: '2rem',
      }}
    >
      {/* Title */}
      <div style={{ textAlign: 'center' }}>
        <h1
          style={{
            color: '#ff0000',
            fontSize: '2.5rem',
            letterSpacing: '6px',
            textShadow: '0 0 20px rgba(255,0,0,0.5)',
            animation: 'flicker 3s infinite',
          }}
        >
          CEREBRO'S CODE RED
        </h1>
        <h2
          style={{
            color: '#00ff41',
            fontSize: '1.5rem',
            letterSpacing: '4px',
            marginTop: '0.5rem',
          }}
        >
          SYNCHRONIZER v3.0
        </h2>
      </div>

      {/* Callsign input */}
      <div className="retro-panel" style={{ width: '100%', maxWidth: '450px' }}>
        <div className="section-header" style={{ fontSize: '1rem' }}>
          [[ AGENT IDENTIFICATION ]]
        </div>
        <input
          type="text"
          className="retro-input"
          value={callsign}
          onChange={(e) => setCallsign(e.target.value.toUpperCase())}
          placeholder="ENTER CALLSIGN"
          maxLength={20}
          style={{ textTransform: 'uppercase' }}
        />
      </div>

      {/* Create Room */}
      <div className="retro-panel" style={{ width: '100%', maxWidth: '450px', textAlign: 'center' }}>
        <div className="section-header" style={{ fontSize: '1rem' }}>
          [[ ESTABLISH UPLINK ]]
        </div>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          CREATE A NEW BROADCAST FREQUENCY
        </p>
        <button
          className="retro-button"
          onClick={createRoom}
          disabled={loading}
          style={{ width: '100%' }}
        >
          {loading ? 'TRANSMITTING...' : '⌁ CREATE ROOM'}
        </button>
      </div>

      {/* Join Room */}
      <div className="retro-panel" style={{ width: '100%', maxWidth: '450px' }}>
        <div className="section-header" style={{ fontSize: '1rem' }}>
          [[ FREQUENCY CODE ]]
        </div>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          TUNE INTO EXISTING BROADCAST
        </p>
        <form
          onSubmit={joinRoom}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}
        >
          <input
            type="text"
            className="retro-input"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="ENTER 6-CHAR ROOM CODE"
            maxLength={6}
            style={{ textTransform: 'uppercase', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '6px' }}
          />
          <button
            type="submit"
            className="retro-button green"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'SCANNING...' : '📡 JOIN ROOM'}
          </button>
        </form>
      </div>

      {/* Error display */}
      {error && (
        <div
          style={{
            color: '#ff0000',
            fontSize: '1.3rem',
            animation: 'glitch 0.5s infinite',
            letterSpacing: '3px',
            textAlign: 'center',
          }}
        >
          ⚠ {error}
        </div>
      )}
    </div>
  );
}
