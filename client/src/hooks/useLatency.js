/**
 * useLatency.js — Latency measurement hook
 * 
 * Emits ping every 3 seconds, measures round-trip time,
 * and returns the median of the last 5 samples.
 * Median is preferred over average to filter out spikes.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { calculateMedianLatency } from '../utils/syncCalculator';

export default function useLatency(socket) {
  const [latency, setLatency] = useState(0);
  const [latencyHistory, setLatencyHistory] = useState([]);
  const pingTimeRef = useRef(0);
  const samplesRef = useRef([]);

  useEffect(() => {
    if (!socket) return;

    // Ping interval — every 3 seconds
    const interval = setInterval(() => {
      pingTimeRef.current = Date.now();
      socket.emit('latency-ping', { clientTime: pingTimeRef.current });
    }, 3000);

    // Pong handler — compute round-trip
    const handlePong = ({ clientTime }) => {
      const rtt = Date.now() - clientTime;
      const samples = samplesRef.current;

      // Keep only last 5 samples
      samples.push(rtt);
      if (samples.length > 5) samples.shift();

      samplesRef.current = samples;

      const median = calculateMedianLatency(samples);
      setLatency(median);
      setLatencyHistory((prev) => {
        const next = [...prev, median];
        // Keep last 60 data points for graphs
        return next.length > 60 ? next.slice(-60) : next;
      });
    };

    socket.on('latency-pong', handlePong);

    return () => {
      clearInterval(interval);
      socket.off('latency-pong', handlePong);
    };
  }, [socket]);

  // Force a single ping measurement (for on-demand checks)
  const measureOnce = useCallback(() => {
    if (!socket) return;
    pingTimeRef.current = Date.now();
    socket.emit('latency-ping', { clientTime: pingTimeRef.current });
  }, [socket]);

  return { latency, latencyHistory, measureOnce };
}
