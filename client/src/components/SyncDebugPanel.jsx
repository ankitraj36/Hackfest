/**
 * SyncDebugPanel.jsx — Developer debug overlay
 * 
 * Toggled with Ctrl+Shift+D keyboard shortcut.
 * Shows: socket ID, room ID, role, latency, connection status,
 * video timecode, last 20 WebSocket events, packet loss, and per-user latency.
 * "EXPORT LOG" button downloads debug-log.txt.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export default function SyncDebugPanel({ socket, roomId, role, latency, videoRef, users = [] }) {
  const [visible, setVisible] = useState(false);
  const [events, setEvents] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('CONNECTED');
  const missedHeartbeatsRef = useRef(0);
  const totalHeartbeatsRef = useRef(0);

  // Toggle with Ctrl+Shift+D
  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setVisible((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Track WebSocket events
  useEffect(() => {
    if (!socket) return;

    // Intercept all events for debug logging
    const originalEmit = socket.emit.bind(socket);
    const logEvent = (direction, event, data) => {
      setEvents((prev) => {
        const next = [
          ...prev,
          {
            direction,
            event,
            time: new Date().toLocaleTimeString('en-US', { hour12: false }),
            data: typeof data === 'object' ? JSON.stringify(data).slice(0, 60) : String(data || ''),
          },
        ];
        return next.slice(-20); // Keep last 20 events
      });
    };

    // Track connection status
    const onConnect = () => setConnectionStatus('CONNECTED');
    const onDisconnect = () => setConnectionStatus('DISCONNECTED');
    const onReconnecting = () => setConnectionStatus('RECONNECTING');

    // Track heartbeats for packet loss
    const onHeartbeat = () => {
      totalHeartbeatsRef.current++;
      logEvent('IN', 'heartbeat-correction', {});
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('reconnecting', onReconnecting);
    socket.on('heartbeat-correction', onHeartbeat);

    // Log inbound events
    const logInbound = (event) => (data) => logEvent('IN', event, data);
    const trackedEvents = [
      'sync-state', 'user-connected', 'user-disconnected',
      'chat-broadcast', 'reaction-broadcast', 'countdown-start',
      'broadcaster-left', 'broadcaster-promoted',
    ];
    trackedEvents.forEach((evt) => socket.on(evt, logInbound(evt)));

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('reconnecting', onReconnecting);
      socket.off('heartbeat-correction', onHeartbeat);
      trackedEvents.forEach((evt) => socket.off(evt, logInbound(evt)));
    };
  }, [socket]);

  // Export debug log
  const exportLog = useCallback(() => {
    const lines = [
      `CEREBRO DEBUG LOG — ${new Date().toISOString()}`,
      `Socket ID: ${socket?.id || 'N/A'}`,
      `Room: ${roomId || 'N/A'}`,
      `Role: ${role || 'N/A'}`,
      `Latency: ${latency}ms`,
      `Status: ${connectionStatus}`,
      `Video Time: ${videoRef?.current?.currentTime?.toFixed(2) || 'N/A'}`,
      '',
      '═══ EVENTS ═══',
      ...events.map((e) => `[${e.time}] ${e.direction} ${e.event} ${e.data}`),
      '',
      '═══ USERS ═══',
      ...users.map((u) => `${u.callsign} (${u.role}) — ${u.latency || 0}ms`),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'debug-log.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [socket, roomId, role, latency, connectionStatus, events, users, videoRef]);

  if (!visible) return null;

  const packetLoss = totalHeartbeatsRef.current > 0
    ? ((missedHeartbeatsRef.current / totalHeartbeatsRef.current) * 100).toFixed(1)
    : '0.0';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1rem',
        right: '1rem',
        width: '380px',
        maxHeight: '500px',
        overflowY: 'auto',
        background: 'rgba(5,5,5,0.97)',
        border: '1px solid #ff0000',
        boxShadow: '0 0 20px rgba(255,0,0,0.3)',
        padding: '1rem',
        zIndex: 10000,
        fontSize: '0.85rem',
        fontFamily: "'VT323', monospace",
        color: '#00ff41',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          borderBottom: '1px solid #ff0000',
          paddingBottom: '0.5rem',
          marginBottom: '0.5rem',
        }}
      >
        <span style={{ color: '#ff0000', letterSpacing: '2px' }}>⌁ DEBUG CONSOLE</span>
        <button
          onClick={() => setVisible(false)}
          style={{
            background: 'none',
            border: '1px solid #ff0000',
            color: '#ff0000',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: '0.8rem',
            padding: '0 6px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem', marginBottom: '0.5rem' }}>
        <span style={{ color: '#666' }}>SOCKET:</span>
        <span>{socket?.id?.slice(0, 12) || 'N/A'}</span>

        <span style={{ color: '#666' }}>ROOM:</span>
        <span>{roomId || 'N/A'}</span>

        <span style={{ color: '#666' }}>ROLE:</span>
        <span style={{ color: role === 'broadcaster' ? '#ff0000' : '#00ff41' }}>
          {role?.toUpperCase() || 'N/A'}
        </span>

        <span style={{ color: '#666' }}>LATENCY:</span>
        <span>{latency}ms</span>

        <span style={{ color: '#666' }}>STATUS:</span>
        <span
          style={{
            color:
              connectionStatus === 'CONNECTED'
                ? '#00ff41'
                : connectionStatus === 'RECONNECTING'
                ? '#ffaa00'
                : '#ff0000',
          }}
        >
          {connectionStatus}
        </span>

        <span style={{ color: '#666' }}>TIMECODE:</span>
        <span>{videoRef?.current?.currentTime?.toFixed(2) || '0.00'}s</span>

        <span style={{ color: '#666' }}>PKT LOSS:</span>
        <span>{packetLoss}%</span>
      </div>

      {/* Event log */}
      <div
        style={{
          borderTop: '1px solid #333',
          paddingTop: '0.5rem',
          maxHeight: '180px',
          overflowY: 'auto',
          marginBottom: '0.5rem',
        }}
      >
        <div style={{ color: '#ff0000', marginBottom: '0.3rem' }}>═══ EVENT LOG ═══</div>
        {events.map((e, i) => (
          <div key={i} style={{ fontSize: '0.75rem', lineHeight: '1.4' }}>
            <span style={{ color: '#666' }}>[{e.time}]</span>{' '}
            <span style={{ color: e.direction === 'IN' ? '#00ff41' : '#ffaa00' }}>
              {e.direction}
            </span>{' '}
            <span>{e.event}</span>
          </div>
        ))}
      </div>

      {/* Per-user latency */}
      {users.length > 0 && (
        <div style={{ borderTop: '1px solid #333', paddingTop: '0.5rem', marginBottom: '0.5rem' }}>
          <div style={{ color: '#ff0000', marginBottom: '0.3rem' }}>═══ AGENTS ═══</div>
          {users.map((u) => (
            <div key={u.socketId} style={{ fontSize: '0.8rem' }}>
              <span style={{ color: '#ff6600' }}>{u.callsign}</span>{' '}
              <span style={{ color: '#666' }}>({u.role})</span>{' '}
              <span>{u.latency || 0}ms</span>
            </div>
          ))}
        </div>
      )}

      {/* Export button */}
      <button
        className="retro-button"
        onClick={exportLog}
        style={{ width: '100%', fontSize: '0.9rem', padding: '0.3rem' }}
      >
        📥 EXPORT LOG
      </button>
    </div>
  );
}
