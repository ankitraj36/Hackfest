/**
 * useSyncEngine.js — Playback synchronization engine
 * 
 * Broadcaster: attaches to video events, emits sync + heartbeat
 * Listener: subscribes to sync-state, applies corrections, tracks drift
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { calculateDrift, shouldAutoCorrect, shouldShowResync } from '../utils/syncCalculator';

export default function useSyncEngine(videoRef, socket, role, latency) {
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced' | 'drifting' | 'lost'
  const [drift, setDrift] = useState(0);
  const [autoCorrectFlash, setAutoCorrectFlash] = useState(false);
  const heartbeatIntervalRef = useRef(null);
  const lastSyncTimeRef = useRef(0);

  useEffect(() => {
    if (!socket || !videoRef?.current) return;

    const video = videoRef.current;

    if (role === 'broadcaster') {
      // ── BROADCASTER MODE ──
      // Emit heartbeat every 5 seconds with current playback time
      heartbeatIntervalRef.current = setInterval(() => {
        if (video && !video.paused) {
          socket.emit('heartbeat-sync', { currentTime: video.currentTime });
        }
      }, 5000);

      return () => {
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
      };
    } else {
      // ── LISTENER MODE ──

      // Handle sync-state: play/pause/seek from broadcaster
      const handleSyncState = ({ action, currentTime, serverTime }) => {
        if (!video) return;

        // Compensate for half the round-trip latency
        const latencyOffset = (latency || 0) / 2000;

        switch (action) {
          case 'play':
            // Adjust for latency: jump ahead by half RTT
            video.currentTime = currentTime + latencyOffset;
            video.play().catch(() => {});
            setSyncStatus('synced');
            break;

          case 'pause':
            video.currentTime = currentTime;
            video.pause();
            setSyncStatus('synced');
            break;

          case 'seek':
            video.currentTime = currentTime;
            setSyncStatus('synced');
            break;

          default:
            break;
        }

        lastSyncTimeRef.current = currentTime;
      };

      // Handle heartbeat corrections from server
      const handleHeartbeat = ({ currentTime }) => {
        if (!video) return;

        const currentDrift = calculateDrift(video.currentTime, currentTime);
        setDrift(currentDrift);
        lastSyncTimeRef.current = currentTime;

        // Update sync status based on drift thresholds
        if (currentDrift < 0.5) {
          setSyncStatus('synced');
        } else if (currentDrift < 2) {
          setSyncStatus('drifting');
        } else {
          setSyncStatus('lost');
        }

        // Auto-correct if drift exceeds 0.5s (silently adjust)
        if (currentDrift > 0.5 && currentDrift <= 5) {
          video.currentTime = currentTime;
        }

        // Big drift: show auto-correcting flash
        if (shouldAutoCorrect(currentDrift)) {
          video.currentTime = currentTime;
          setAutoCorrectFlash(true);
          setTimeout(() => setAutoCorrectFlash(false), 1500);
        }
      };

      // Handle broadcaster leaving
      const handleBroadcasterLeft = () => {
        setSyncStatus('lost');
        video.pause();
      };

      // Handle video URL updates from broadcaster
      const handleVideoUrl = ({ videoUrl }) => {
        if (video && videoUrl) {
          video.src = videoUrl;
          video.load();
        }
      };

      socket.on('sync-state', handleSyncState);
      socket.on('heartbeat-correction', handleHeartbeat);
      socket.on('broadcaster-left', handleBroadcasterLeft);
      socket.on('video-url-update', handleVideoUrl);

      return () => {
        socket.off('sync-state', handleSyncState);
        socket.off('heartbeat-correction', handleHeartbeat);
        socket.off('broadcaster-left', handleBroadcasterLeft);
        socket.off('video-url-update', handleVideoUrl);
      };
    }
  }, [socket, videoRef, role, latency]);

  // Manual resync — triggered by user clicking RESYNC button
  const resync = useCallback(() => {
    if (socket) {
      const roomId = new URL(window.location.href).pathname.split('/').pop();
      socket.emit('request-state', { roomId });
    }
  }, [socket]);

  return { syncStatus, drift, autoCorrectFlash, resync };
}
