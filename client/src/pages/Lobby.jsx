/**
 * Lobby.jsx — Pre-broadcast waiting room
 * 
 * Left: RadarSweep + blinking "AWAITING TRANSMISSION" + Room ID
 * Right: Connected agents list with latency
 * Broadcaster: "BEGIN BROADCAST" button → countdown → navigate
 * Listener: "STANDING BY..." → auto-navigate when countdown completes
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import useSocket from '../hooks/useSocket';
import useLatency from '../hooks/useLatency';
import useAudioFX from '../hooks/useAudioFX';
import RadarSweep from '../components/RadarSweep';

export default function Lobby({ callsign, setCallsign }) {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') || 'listener';
  const navigate = useNavigate();

  const { socket, connected } = useSocket();
  const { latency } = useLatency(socket);
  const { playBeep, playPing } = useAudioFX();

  const [users, setUsers] = useState([]);
  const [countdown, setCountdown] = useState(null);
  const [copied, setCopied] = useState(false);

  // Prompt for callsign if not set
  useEffect(() => {
    if (!callsign) {
      const name = prompt('ENTER YOUR CALLSIGN, AGENT:') || 'UNKNOWN';
      setCallsign(name.toUpperCase());
    }
  }, [callsign, setCallsign]);

  // Join room on socket connect
  useEffect(() => {
    if (!socket || !connected || !callsign) return;

    socket.emit('join-room', { roomId, role, callsign });
    playBeep();
  }, [socket, connected, roomId, role, callsign, playBeep]);

  // Listen for user list updates
  useEffect(() => {
    if (!socket) return;

    const handleUserConnected = ({ userList }) => {
      setUsers(userList);
      playPing();
    };

    const handleUserDisconnected = ({ userList }) => {
      setUsers(userList);
    };

    // Countdown event from broadcaster
    const handleCountdown = ({ seconds }) => {
      setCountdown(seconds);

      // Count down from `seconds` to 0
      let remaining = seconds;
      const interval = setInterval(() => {
        remaining--;
        setCountdown(remaining);

        if (remaining <= 0) {
          clearInterval(interval);
          // Navigate to appropriate view
          if (role === 'broadcaster') {
            navigate(`/broadcast/${roomId}`);
          } else {
            navigate(`/watch/${roomId}`);
          }
        }
      }, 1000);
    };

    socket.on('user-connected', handleUserConnected);
    socket.on('user-disconnected', handleUserDisconnected);
    socket.on('countdown-start', handleCountdown);

    return () => {
      socket.off('user-connected', handleUserConnected);
      socket.off('user-disconnected', handleUserDisconnected);
      socket.off('countdown-start', handleCountdown);
    };
  }, [socket, role, roomId, navigate, playPing]);

  // Begin broadcast (broadcaster only)
  const beginBroadcast = useCallback(() => {
    if (socket) {
      socket.emit('countdown-start', { roomId, seconds: 5 });
    }
  }, [socket, roomId]);

  // Copy room ID to clipboard
  function copyRoomId() {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Countdown overlay
  if (countdown !== null) {
    return (
      <div className="countdown-overlay">
        <div className="countdown-number">
          {countdown > 0 ? countdown : 'GO'}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '2rem',
        padding: '1rem',
        minHeight: '70vh',
      }}
    >
      {/* Left Panel — Radar + Status */}
      <div className="retro-panel" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
        <div className="section-header" style={{ width: '100%', textAlign: 'center' }}>
          ⌁ FREQUENCY: {roomId}
        </div>

        <RadarSweep agents={users} />

        <div
          style={{
            color: '#ff0000',
            fontSize: '1.3rem',
            letterSpacing: '3px',
            animation: 'blink 1.5s infinite',
            textAlign: 'center',
          }}
        >
          AWAITING TRANSMISSION
        </div>

        {/* Room ID with copy */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ color: '#666' }}>ROOM CODE:</span>
          <span
            style={{
              color: '#00ff41',
              fontSize: '1.8rem',
              letterSpacing: '6px',
              textShadow: '0 0 10px rgba(0,255,65,0.5)',
            }}
          >
            {roomId}
          </span>
          <button className="copy-button" onClick={copyRoomId}>
            {copied ? '✓ COPIED' : '⎘ COPY'}
          </button>
        </div>

        {/* Alphabet wall — decorative */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
            justifyContent: 'center',
            padding: '0.5rem',
          }}
        >
          {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter) => (
            <span
              key={letter}
              style={{
                color: '#333',
                fontSize: '1.2rem',
                width: '24px',
                textAlign: 'center',
                transition: 'all 0.3s',
              }}
            >
              {letter}
            </span>
          ))}
        </div>
      </div>

      {/* Right Panel — User List + Actions */}
      <div className="retro-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="section-header">👤 CONNECTED AGENTS</div>

        {/* Agent list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {users.length === 0 && (
            <div style={{ color: '#333', textAlign: 'center', padding: '2rem 0' }}>
              NO AGENTS DETECTED...
            </div>
          )}

          {users.map((user) => (
            <div
              key={user.socketId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem',
                padding: '0.5rem',
                borderBottom: '1px solid #1a1a1a',
              }}
            >
              <span className="status-dot" />
              <span style={{ color: '#00ff41', flex: 1 }}>{user.callsign}</span>
              <span className={`badge ${user.role}`}>{user.role.toUpperCase()}</span>
              <span style={{ color: '#666', fontSize: '0.9rem' }}>{user.latency || latency}ms</span>
            </div>
          ))}
        </div>

        {/* Connection status */}
        <div style={{ color: '#666', fontSize: '0.9rem', textAlign: 'center' }}>
          {connected ? (
            <span style={{ color: '#00ff41' }}>⬤ UPLINK ACTIVE — {latency}ms</span>
          ) : (
            <span style={{ color: '#ff0000', animation: 'blink 1s infinite' }}>
              ⬤ REESTABLISHING UPLINK...
            </span>
          )}
        </div>

        {/* Action buttons */}
        {role === 'broadcaster' ? (
          <button
            className="retro-button"
            onClick={beginBroadcast}
            style={{
              fontSize: '1.5rem',
              padding: '1rem',
              boxShadow: '0 0 20px rgba(255,0,0,0.5)',
            }}
          >
            ⌁ BEGIN BROADCAST
          </button>
        ) : (
          <div
            style={{
              textAlign: 'center',
              color: '#ffaa00',
              fontSize: '1.3rem',
              letterSpacing: '3px',
              animation: 'blink 2s infinite',
            }}
          >
            STANDING BY...
          </div>
        )}
      </div>
    </div>
  );
}
