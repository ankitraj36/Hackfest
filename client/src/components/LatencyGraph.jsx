/**
 * LatencyGraph.jsx — Canvas-based sparkline latency graph
 * 
 * Draws one sparkline per connected user (last 60 data points).
 * Color coding: green < 100ms, yellow 100–300ms, red > 300ms
 * Shows SYNC HEALTH percentage.
 */

import { useEffect, useRef } from 'react';
import { calculateSyncHealth } from '../utils/syncCalculator';

export default function LatencyGraph({ users = [] }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = 280;
    const height = 120;
    canvas.width = width;
    canvas.height = height;

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Y-axis grid lines (0, 100, 200, 300, 400, 500ms)
    ctx.strokeStyle = 'rgba(255,0,0,0.15)';
    ctx.lineWidth = 0.5;
    for (let ms = 0; ms <= 500; ms += 100) {
      const y = height - (ms / 500) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      // Label
      ctx.fillStyle = 'rgba(255,0,0,0.3)';
      ctx.font = '10px monospace';
      ctx.fillText(`${ms}ms`, 2, y - 2);
    }

    // Draw sparkline for each user
    users.forEach((user, idx) => {
      const data = user.latencyHistory || [];
      if (data.length < 2) return;

      const points = data.slice(-60); // Last 60 data points
      const stepX = width / 60;

      ctx.beginPath();
      ctx.lineWidth = 1.5;

      points.forEach((val, i) => {
        const x = i * stepX;
        const y = height - Math.min(val, 500) / 500 * height;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      // Color based on latest value
      const latest = points[points.length - 1] || 0;
      if (latest < 100) {
        ctx.strokeStyle = '#00ff41';
      } else if (latest < 300) {
        ctx.strokeStyle = '#ffaa00';
      } else {
        ctx.strokeStyle = '#ff0000';
      }

      ctx.stroke();

      // Callsign label at the end of the line
      const lastY = height - Math.min(points[points.length - 1], 500) / 500 * height;
      ctx.fillStyle = ctx.strokeStyle;
      ctx.font = '11px VT323, monospace';
      ctx.fillText(user.callsign, width - 60, lastY - 4);
    });
  }, [users]);

  // Calculate sync health from all users' latest latencies
  const drifts = users
    .map((u) => {
      const h = u.latencyHistory || [];
      return h.length > 0 ? h[h.length - 1] / 1000 : 0;
    })
    .filter(Boolean);

  const health = calculateSyncHealth(drifts);

  return (
    <div className="retro-panel" style={{ padding: '0.8rem' }}>
      <div
        className="section-header"
        style={{ fontSize: '1rem', marginBottom: '0.5rem' }}
      >
        📡 LATENCY MONITOR
      </div>

      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '120px', display: 'block' }}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '0.5rem',
          fontSize: '1.1rem',
        }}
      >
        <span>SYNC HEALTH:</span>
        <span
          style={{
            color: health > 80 ? '#00ff41' : health > 50 ? '#ffaa00' : '#ff0000',
            fontWeight: 'bold',
          }}
        >
          {health}%
        </span>
      </div>
    </div>
  );
}
