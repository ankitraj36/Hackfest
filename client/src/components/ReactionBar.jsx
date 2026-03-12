/**
 * ReactionBar.jsx — Emoji reactions with floating animation
 * 
 * 5 themed emoji buttons: 👁 ⚡ 🔴 📡 ❄️
 * On click: emit reaction event + spawn floating emoji
 * Shows tally counts for broadcaster overlay
 */

import { useState, useRef, useCallback } from 'react';

const REACTIONS = [
  { emoji: '👁', label: 'Watcher' },
  { emoji: '⚡', label: 'Shock' },
  { emoji: '🔴', label: 'Alert' },
  { emoji: '📡', label: 'Signal' },
  { emoji: '❄️', label: 'Freeze' },
];

export default function ReactionBar({ socket, roomId, showTally = false }) {
  const [tallies, setTallies] = useState({});
  const [floating, setFloating] = useState([]);
  const idCounter = useRef(0);

  // Subscribe to reaction broadcasts
  useState(() => {
    if (!socket) return;

    const handler = ({ emoji }) => {
      // Update tally
      setTallies((prev) => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));

      // Spawn a floating emoji
      spawnFloat(emoji);
    };

    socket.on('reaction-broadcast', handler);
    return () => socket.off('reaction-broadcast', handler);
  }, [socket]);

  // Emit reaction and spawn local float
  const sendReaction = useCallback(
    (emoji) => {
      if (!socket) return;
      socket.emit('reaction', { roomId, emoji });
    },
    [socket, roomId]
  );

  // Spawn a floating emoji that drifts up and fades
  const spawnFloat = useCallback((emoji) => {
    const id = ++idCounter.current;
    const left = 20 + Math.random() * 60; // Random horizontal position (20–80%)

    setFloating((prev) => [...prev, { id, emoji, left }]);

    // Remove after animation completes (2s)
    setTimeout(() => {
      setFloating((prev) => prev.filter((f) => f.id !== id));
    }, 2000);
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      {/* Floating emojis */}
      {floating.map((f) => (
        <div
          key={f.id}
          style={{
            position: 'absolute',
            bottom: '100%',
            left: `${f.left}%`,
            fontSize: '2rem',
            animation: 'floatUp 2s ease-out forwards',
            pointerEvents: 'none',
            zIndex: 100,
          }}
        >
          {f.emoji}
        </div>
      ))}

      {/* Reaction buttons */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          justifyContent: 'center',
          padding: '0.5rem',
        }}
      >
        {REACTIONS.map(({ emoji, label }) => (
          <button
            key={emoji}
            className="retro-button"
            onClick={() => sendReaction(emoji)}
            title={label}
            style={{
              fontSize: '1.4rem',
              padding: '0.3rem 0.6rem',
              position: 'relative',
            }}
          >
            {emoji}
            {/* Tally counter (broadcaster view) */}
            {showTally && tallies[emoji] > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  background: '#ff0000',
                  color: '#0a0a0a',
                  fontSize: '0.7rem',
                  padding: '0 4px',
                  borderRadius: '50%',
                  minWidth: '16px',
                  textAlign: 'center',
                }}
              >
                {tallies[emoji]}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
