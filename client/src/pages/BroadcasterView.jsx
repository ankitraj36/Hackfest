/**
 * BroadcasterView.jsx — Broadcaster control center
 * 
 * Left: CRT-framed video player with URL input
 * Right: Control panel with room info, play/pause, seek, latency graph, chat
 * Emits playback events on every action for listener sync
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import useSocket from '../hooks/useSocket';
import useLatency from '../hooks/useLatency';
import useAudioFX from '../hooks/useAudioFX';
import useSyncEngine from '../hooks/useSyncEngine';
import CRTFrame from '../components/CRTFrame';
import VideoPlayer from '../components/VideoPlayer';
import ChatPanel from '../components/ChatPanel';
import ReactionBar from '../components/ReactionBar';
import LatencyGraph from '../components/LatencyGraph';
import SyncDebugPanel from '../components/SyncDebugPanel';

export default function BroadcasterView({ callsign }) {
  const { roomId } = useParams();
  const { socket, connected } = useSocket();
  const { latency, latencyHistory } = useLatency(socket);
  const { playThud } = useAudioFX();
  const videoRef = useRef(null);
  useSyncEngine(videoRef, socket, 'broadcaster', latency);

  const [videoUrl, setVideoUrl] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [users, setUsers] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);

  // Join room on connect
  useEffect(() => {
    if (!socket || !connected) return;
    socket.emit('join-room', { roomId, role: 'broadcaster', callsign });
  }, [socket, connected, roomId, callsign]);

  // Track user list updates
  useEffect(() => {
    if (!socket) return;

    const handleUsers = ({ userList }) => setUsers(userList);
    socket.on('user-connected', handleUsers);
    socket.on('user-disconnected', handleUsers);

    return () => {
      socket.off('user-connected', handleUsers);
      socket.off('user-disconnected', handleUsers);
    };
  }, [socket]);

  // Load video URL with validation
  const loadVideo = useCallback(async () => {
    if (!urlInput.trim()) return;

    setScanning(true);
    setVideoError(false);

    try {
      // Validate URL by attempting a HEAD request
      const response = await fetch(urlInput, { method: 'HEAD', mode: 'no-cors' });
      setVideoUrl(urlInput);

      // Notify listeners of the video URL
      if (socket) {
        socket.emit('video-url-update', { roomId, videoUrl: urlInput });
      }
    } catch {
      // For cross-origin URLs, just try loading directly
      setVideoUrl(urlInput);
      if (socket) {
        socket.emit('video-url-update', { roomId, videoUrl: urlInput });
      }
    } finally {
      setScanning(false);
    }
  }, [urlInput, socket, roomId]);

  // Playback event handlers — emit to all listeners
  const handlePlay = useCallback(
    (currentTime) => {
      playThud();
      setIsPlaying(true);
      if (socket) {
        socket.emit('playback-sync', {
          action: 'play',
          currentTime,
          serverTime: Date.now(),
        });
      }
    },
    [socket, playThud]
  );

  const handlePause = useCallback(
    (currentTime) => {
      playThud();
      setIsPlaying(false);
      if (socket) {
        socket.emit('playback-sync', {
          action: 'pause',
          currentTime,
        });
      }
    },
    [socket, playThud]
  );

  const handleSeek = useCallback(
    (currentTime) => {
      if (socket) {
        socket.emit('playback-sync', {
          action: 'seek',
          currentTime,
        });
      }
    },
    [socket]
  );

  function copyRoomId() {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Build user data for latency graph
  const graphUsers = users.map((u) => ({
    ...u,
    latencyHistory: u.socketId === socket?.id ? latencyHistory : [u.latency || 0],
  }));

  const listenerCount = users.filter((u) => u.role === 'listener').length;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', minHeight: '80vh' }}>
      {/* Left — Video Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* URL input bar */}
        <div className="retro-panel" style={{ padding: '0.8rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="retro-input"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="PASTE VIDEO URL — MP4 / DIRECT LINK"
              style={{ flex: 1 }}
            />
            <button className="retro-button" onClick={loadVideo} disabled={scanning}>
              {scanning ? 'SCANNING...' : '▶ LOAD'}
            </button>
          </div>

          {/* Scanning progress bar */}
          {scanning && (
            <div
              style={{
                height: '3px',
                background: '#1a1a1a',
                marginTop: '0.5rem',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  background: '#ff0000',
                  animation: 'progressFill 2s ease-in-out',
                }}
              />
            </div>
          )}
        </div>

        {/* CRT-framed video */}
        <CRTFrame isLive={isPlaying} showStatic={!videoUrl}>
          {videoUrl ? (
            <VideoPlayer
              ref={videoRef}
              src={videoUrl}
              isController={true}
              onPlay={handlePlay}
              onPause={handlePause}
              onSeek={handleSeek}
            />
          ) : (
            <div
              style={{
                aspectRatio: '16/9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ff0000',
                fontSize: '1.5rem',
                letterSpacing: '4px',
                animation: 'flicker 2s infinite',
              }}
            >
              SIGNAL LOST — LOAD VIDEO URL
            </div>
          )}
        </CRTFrame>

        {/* Live indicator */}
        {isPlaying && (
          <div className="live-indicator">
            <span className="live-dot" />
            <span>LIVE BROADCAST</span>
          </div>
        )}

        {/* Reactions */}
        <ReactionBar socket={socket} roomId={roomId} showTally={true} />
      </div>

      {/* Right — Control Panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Room info */}
        <div className="retro-panel" style={{ padding: '0.8rem' }}>
          <div className="section-header" style={{ fontSize: '1rem' }}>
            ⌁ BROADCAST CONTROL
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ color: '#666' }}>FREQUENCY:</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ color: '#00ff41', fontSize: '1.3rem', letterSpacing: '3px' }}>{roomId}</span>
              <button className="copy-button" onClick={copyRoomId}>
                {copied ? '✓' : '⎘'}
              </button>
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ color: '#666' }}>AGENTS:</span>
            <span style={{ color: '#00ff41' }}>{listenerCount} CONNECTED</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#666' }}>LATENCY:</span>
            <span style={{ color: latency < 100 ? '#00ff41' : latency < 300 ? '#ffaa00' : '#ff0000' }}>
              {latency}ms
            </span>
          </div>
        </div>

        {/* Latency graph */}
        <LatencyGraph users={graphUsers} />

        {/* Chat panel */}
        <ChatPanel
          roomId={roomId}
          callsign={callsign}
          isBroadcaster={true}
          socket={socket}
        />
      </div>

      {/* Debug panel */}
      <SyncDebugPanel
        socket={socket}
        roomId={roomId}
        role="broadcaster"
        latency={latency}
        videoRef={videoRef}
        users={users}
      />
    </div>
  );
}
