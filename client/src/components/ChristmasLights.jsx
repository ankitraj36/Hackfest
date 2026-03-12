/**
 * ChristmasLights.jsx — Stranger Things alphabet wall lights
 * 
 * Row of 20 colored circles that blink independently on random intervals.
 * When a new agent connects, 2-3 letters of their callsign flash bright red.
 */

import { useState, useEffect, useMemo } from 'react';

const LIGHT_COUNT = 20;
const COLORS = ['#ff0000', '#00ff41', '#4444ff', '#ffff00', '#ff6600', '#ffffff'];

export default function ChristmasLights() {
  // Generate random delays and colors once
  const lights = useMemo(() => {
    return Array.from({ length: LIGHT_COUNT }, (_, i) => ({
      id: i,
      color: COLORS[i % COLORS.length],
      delay: Math.random() * 2000, // Random animation delay 0–2000ms
      duration: Math.random() * 1500 + 500, // Random duration 500–2000ms
    }));
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        padding: '4px 0',
        position: 'relative',
        zIndex: 50,
        background: 'rgba(10,10,10,0.8)',
        borderBottom: '1px solid #333',
      }}
    >
      {/* Wire connecting the lights */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '5%',
          right: '5%',
          height: '1px',
          background: '#333',
          zIndex: -1,
        }}
      />

      {lights.map((light) => (
        <div
          key={light.id}
          style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: light.color,
            boxShadow: `0 0 6px ${light.color}, 0 0 12px ${light.color}`,
            animation: `lightGlow ${light.duration}ms ease-in-out infinite`,
            animationDelay: `${light.delay}ms`,
          }}
        />
      ))}
    </div>
  );
}
