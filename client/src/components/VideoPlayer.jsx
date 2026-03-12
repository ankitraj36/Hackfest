/**
 * VideoPlayer.jsx — Native video element wrapper
 * 
 * Props:
 * - src: video source URL
 * - isController: true = broadcaster, false = listener (controls disabled)
 * - onPlay, onPause, onSeek, onTimeUpdate: event callbacks
 * - videoRef: forwarded ref to the <video> element for external control
 */

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';

const VideoPlayer = forwardRef(function VideoPlayer(
  { src, isController = false, onPlay, onPause, onSeek, onTimeUpdate },
  ref
) {
  const videoRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const seekingRef = useRef(false);

  // Expose the video element to parent via ref
  useImperativeHandle(ref, () => videoRef.current, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(video.duration || 0);
    };

    const handlePlay = () => {
      if (isController) {
        onPlay?.(video.currentTime);
      }
    };

    const handlePause = () => {
      if (isController) {
        onPause?.(video.currentTime);
      }
    };

    // Debounced seek: only emit on mouseup/touchend, not during scrub
    const handleSeeked = () => {
      if (isController && seekingRef.current) {
        onSeek?.(video.currentTime);
        seekingRef.current = false;
      }
    };

    const handleSeeking = () => {
      seekingRef.current = true;
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('seeking', handleSeeking);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('seeking', handleSeeking);
    };
  }, [isController, onPlay, onPause, onSeek, onTimeUpdate]);

  // Format seconds to MM:SS
  function formatTime(secs) {
    if (!secs || isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  return (
    <div style={{ position: 'relative' }}>
      <video
        ref={videoRef}
        src={src || undefined}
        controls={isController}
        style={{
          display: 'block',
          width: '100%',
          aspectRatio: '16 / 9',
          background: '#000',
          // Disable pointer events for listeners so they can't control playback
          pointerEvents: isController ? 'auto' : 'none',
        }}
      />

      {/* Timecode display below video */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '0.3rem 0.5rem',
          color: '#00ff41',
          fontSize: '1rem',
          background: 'rgba(10,10,10,0.9)',
          borderTop: '1px solid #333',
        }}
      >
        <span>▶ {formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
});

export default VideoPlayer;
