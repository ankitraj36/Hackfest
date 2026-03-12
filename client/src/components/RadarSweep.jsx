/**
 * RadarSweep.jsx — Animated radar canvas with phosphor green sweep
 * 
 * Features:
 * - Rotating sweep line with fading trail
 * - Agent dots placed at random positions
 * - Ping ripple animation when new agents connect
 */

import { useEffect, useRef } from 'react';

export default function RadarSweep({ agents = [] }) {
  const canvasRef = useRef(null);
  const angleRef = useRef(0);
  const agentDotsRef = useRef([]);
  const pingsRef = useRef([]);

  // Update agent dots when agents list changes
  useEffect(() => {
    // Add new dots for new agents, preserve existing positions
    const existing = agentDotsRef.current.map((d) => d.callsign);
    agents.forEach((agent) => {
      if (!existing.includes(agent.callsign)) {
        // Place new agent at random position within radar circle
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 0.7 + 0.1; // 10-80% from center
        agentDotsRef.current.push({
          callsign: agent.callsign,
          angle,
          radius,
        });

        // Trigger ping ripple for new agent
        pingsRef.current.push({ x: 0, y: 0, radius: 0, opacity: 1, angle, dist: radius });
      }
    });
  }, [agents]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animId;

    const size = 200;
    canvas.width = size;
    canvas.height = size;

    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 10;

    function draw() {
      // Semi-transparent clear for trailing effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, size, size);

      // Outer circle
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = '#00ff41';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3;
      ctx.stroke();

      // Inner circle guides
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = 0.15;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.25, 0, Math.PI * 2);
      ctx.stroke();

      // Cross hairs
      ctx.beginPath();
      ctx.moveTo(cx - r, cy);
      ctx.lineTo(cx + r, cy);
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx, cy + r);
      ctx.stroke();

      ctx.globalAlpha = 1;

      // Sweep line
      const sweepAngle = angleRef.current;
      const sx = cx + Math.cos(sweepAngle) * r;
      const sy = cy + Math.sin(sweepAngle) * r;

      // Sweep gradient (fading trail)
      const gradient = ctx.createConicalGradient
        ? null
        : null; // Fallback: draw a filled sector

      // Draw sweep sector with fading
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, sweepAngle - 0.5, sweepAngle);
      ctx.closePath();
      ctx.fillStyle = 'rgba(0, 255, 65, 0.15)';
      ctx.fill();

      // Sweep line itself
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(sx, sy);
      ctx.strokeStyle = '#00ff41';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.9;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Agent dots
      for (const dot of agentDotsRef.current) {
        const dx = cx + Math.cos(dot.angle) * (dot.radius * r);
        const dy = cy + Math.sin(dot.angle) * (dot.radius * r);

        ctx.beginPath();
        ctx.arc(dx, dy, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#00ff41';
        ctx.shadowColor = '#00ff41';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Ping ripples
      pingsRef.current = pingsRef.current.filter((ping) => {
        const px = cx + Math.cos(ping.angle) * (ping.dist * r);
        const py = cy + Math.sin(ping.angle) * (ping.dist * r);

        ctx.beginPath();
        ctx.arc(px, py, ping.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 255, 65, ${ping.opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        ping.radius += 0.5;
        ping.opacity -= 0.015;

        return ping.opacity > 0;
      });

      angleRef.current += 0.03;
      animId = requestAnimationFrame(draw);
    }

    draw();

    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '200px',
        height: '200px',
        display: 'block',
        margin: '0 auto',
      }}
    />
  );
}
