/**
 * ParticleBackground.jsx — Full-screen ambient particle canvas
 * 
 * 60 small red/orange dots drifting upward with sine-wave horizontal drift.
 * Low opacity so it doesn't overpower the UI content.
 */

import { useEffect, useRef } from 'react';

const PARTICLE_COUNT = 60;

export default function ParticleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animId;
    let particles = [];

    // Size canvas to window
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    // Initialize particles with random positions
    function initParticles() {
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 1,
          speed: Math.random() * 0.5 + 0.2,
          // Horizontal drift parameters for sin wave
          driftFreq: Math.random() * 0.02 + 0.005,
          driftAmp: Math.random() * 30 + 10,
          phase: Math.random() * Math.PI * 2,
          // Red to orange color spectrum
          hue: Math.random() * 30, // 0=red, 30=orange
        });
      }
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        // Drift upward
        p.y -= p.speed;
        p.phase += p.driftFreq;

        // Horizontal sine wave drift
        const xOffset = Math.sin(p.phase) * p.driftAmp;

        // Reset to bottom when reaching top
        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }

        ctx.beginPath();
        ctx.arc(p.x + xOffset, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 50%, 0.3)`;
        ctx.fill();
      }

      animId = requestAnimationFrame(animate);
    }

    resize();
    initParticles();
    animate();

    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    />
  );
}
