/**
 * ListenerView.jsx — Synced viewer experience
 * 
 * Full-width CRT video (controls disabled) + sync status badge
 * Drift detection → RESYNC button / AUTO-CORRECTING flash
 * Chat panel + reactions below video
 * "SIGNAL LOST" overlay if broadcaster disconnects
 */

import { useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import useSocket from '../hooks/useSocket';
import useLatency from '../hooks/useLatency';
import useAudioFX from '../hooks/useAudioFX';
import useSyncEngine from '../hooks/useSyncEngine';
import CRTFrame from '../components/CRTFrame';
import VideoPlayer from '../components/VideoPlayer';
import ChatPanel from '../components/ChatPanel';
import ReactionBar from '../components/ReactionBar';
import SyncDebugPanel from '../components/SyncDebugPanel';

export default function ListenerView({ callsign }) {
  const { roomId } = useParams();
  const { socket, connected, reconnectAttempt } = useSocket();
  const { latency } = useLatency(socket);
  const { playBeep, playAlert } = useAudioFX();
  const videoRef = useRef(null);

  const { syncStatus, drift, autoCorrectFlash, resync } = useSyncEngine(
    videoRef,
    socket,
    'listener',
    latency
  );

  const [videoUrl, setVideoUrl] = useState('');
  const [broadcasterLeft, setBroadcasterLeft] = useState(false);
  const [users, setUsers] = useState([]);

  // Join room on connect
  useEffect(() => {
    if (!socket || !connected) return;
    socket.emit('join-room', { roomId, role: 'listener', callsign });
    // Request current state in case we're joining mid-broadcast
    socket.emit('request-state', { roomId });
    playBeep();
  }, [socket, connected, roomId, callsign, playBeep]);

  // Subscribe to events
  useEffect(() => {
    if (!socket) return;

    const handleVideoUrl = ({ videoUrl: url }) => {
      setVideoUrl(url);
    };

    const handleBroadcasterLeft = () => {
      setBroadcasterLeft(true);
    };

    const handleBroadcasterPromoted = () => {
      setBroadcasterLeft(false);
    };

    const handleUsers = ({ userList }) => {
      setUsers(userList);
    };

    socket.on('video-url-update', handleVideoUrl);
    socket.on('broadcaster-left', handleBroadcasterLeft);
    socket.on('broadcaster-promoted', handleBroadcasterPromoted);
    socket.on('user-connected', handleUsers);
    socket.on('user-disconnected', handleUsers);

    return () => {
      socket.off('video-url-update', handleVideoUrl);
      socket.off('broadcaster-left', handleBroadcasterLeft);
      socket.off('broadcaster-promoted', handleBroadcasterPromoted);
      socket.off('user-connected', handleUsers);
      socket.off('user-disconnected', handleUsers);
    };
  }, [socket]);

  // Alert sound on high drift
  useEffect(() => {
    if (drift > 1) {
      playAlert();
    }
  }, [drift > 1, playAlert]);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Connection error overlay */}
      {!connected && (
        <div className="overlay" style={{ position: 'fixed' }}>
          <div className="overlay-text">
            REESTABLISHING UPLINK...
            {reconnectAttempt > 0 && ` ATTEMPT ${reconnectAttempt}/5`}
            {reconnectAttempt === -1 && (
              <div style={{ fontSize: '1rem', marginTop: '1rem' }}>
                CONNECTION LOST — PLEASE REFRESH
              </div>
            )}
          </div>
        </div>
      )}

      {/* CRT Video */}
      <div style={{ position: 'relative' }}>
        <CRTFrame isLive={!broadcasterLeft && syncStatus === 'synced'} showStatic={broadcasterLeft}>
          <VideoPlayer
            ref={videoRef}
            src={videoUrl}
            isController={false}
          />

          {/* Broadcaster left overlay */}
          {broadcasterLeft && (
            <div
              className="overlay"
              style={{
                position: 'absolute',
                flexDirection: 'column',
                gap: '1rem',
              }}
            >
              <div className="overlay-text">SIGNAL LOST</div>
              <div style={{ color: '#ffaa00', fontSize: '1rem', letterSpacing: '2px' }}>
                AWAITING BROADCASTER...
              </div>
            </div>
          )}

          {/* Auto-correcting flash */}
          {autoCorrectFlash && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(255,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 30,
                animation: 'flashOverlay 1.5s ease-out forwards',
              }}
            >
              <span style={{ color: '#ffaa00', fontSize: '1.5rem', letterSpacing: '4px' }}>
                AUTO-CORRECTING...
              </span>
            </div>
          )}
        </CRTFrame>

        {/* Sync status badge — floating top-right over video */}
        <div style={{ position: 'absolute', top: '16px', left: '16px', zIndex: 20 }}>
          {syncStatus === 'synced' && (
            <span className="sync-badge synced">SYNCED ✓</span>
          )}
          {syncStatus === 'drifting' && (
            <span className="sync-badge drifting">DRIFTING ⚠ {drift.toFixed(1)}s</span>
          )}
          {syncStatus === 'lost' && (
            <span className="sync-badge lost">LOST ✕</span>
          )}
        </div>

        {/* RESYNC button — appears when drift > 2s */}
        {drift > 2 && !broadcasterLeft && (
          <button
            className="retro-button"
            onClick={resync}
            style={{
              position: 'absolute',
              bottom: '60px',
              right: '16px',
              zIndex: 20,
              fontSize: '1rem',
              boxShadow: '0 0 15px rgba(255,0,0,0.6)',
            }}
          >
            ⟲ RESYNC
          </button>
        )}
      </div>

      {/* Status bar below video */}
      <div
        className="retro-panel"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.5rem 1rem',
          marginTop: '0.5rem',
        }}
      >
        <span>
          TIMECODE: {videoRef.current?.currentTime?.toFixed(2) || '0.00'}s
        </span>
        <span>
          LATENCY: <span style={{ color: latency < 100 ? '#00ff41' : '#ffaa00' }}>{latency}ms</span>
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span className={`status-dot ${connected ? '' : 'red'}`} />
          {connected ? 'CONNECTED' : 'OFFLINE'}
        </span>
      </div>

      {/* Reactions + Chat */}
      <div style={{ marginTop: '1rem' }}>
        <ReactionBar socket={socket} roomId={roomId} />
      </div>

      <div style={{ marginTop: '1rem' }}>
        <ChatPanel
          roomId={roomId}
          callsign={callsign}
          isBroadcaster={false}
          socket={socket}
        />
      </div>

      {/* Debug panel */}
      <SyncDebugPanel
        socket={socket}
        roomId={roomId}
        role="listener"
        latency={latency}
        videoRef={videoRef}
        users={users}
      />
    </div>
  );
}
