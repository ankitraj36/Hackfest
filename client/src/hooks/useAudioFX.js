/**
 * useAudioFX.js — Retro sound effects via Web Audio API
 * 
 * All sounds are synthesized oscillators — no audio files.
 * Provides play functions + Upside Down drone toggle.
 */

import { useRef, useState, useCallback } from 'react';
import { createBeep, createDecayTone, createOscSiren, createDrone } from '../utils/audioGenerator';

export default function useAudioFX() {
  const ctxRef = useRef(null);
  const droneRef = useRef(null);
  const [upsideDownActive, setUpsideDownActive] = useState(false);

  // Lazy-init AudioContext on first user interaction (browser autoplay policy)
  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    // Resume if suspended (autoplay policy)
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume();
    }
    return ctxRef.current;
  }, []);

  // Short 880Hz beep — room connect
  const playBeep = useCallback(() => {
    createBeep(getCtx(), 880, 0.1, 0.3);
  }, [getCtx]);

  // Low 80Hz thud — play/pause toggle
  const playThud = useCallback(() => {
    createBeep(getCtx(), 80, 0.15, 0.4);
  }, [getCtx]);

  // 1200Hz ping with decay — listener joins
  const playPing = useCallback(() => {
    createDecayTone(getCtx(), 1200, 0.3);
  }, [getCtx]);

  // Oscillating 400↔800Hz siren — sync drift alert
  const playAlert = useCallback(() => {
    createOscSiren(getCtx(), 400, 800, 1);
  }, [getCtx]);

  // Continuous 60Hz drone — Upside Down ambient
  const playDrone = useCallback(() => {
    const ctx = getCtx();
    if (!droneRef.current) {
      droneRef.current = createDrone(ctx, 60);
    }
    droneRef.current.start();
  }, [getCtx]);

  // Stop drone
  const stopDrone = useCallback(() => {
    if (droneRef.current) {
      droneRef.current.stop();
      droneRef.current = null;
    }
  }, []);

  // Toggle Upside Down mode
  const toggleUpsideDown = useCallback(() => {
    setUpsideDownActive((prev) => {
      if (!prev) {
        playDrone();
      } else {
        stopDrone();
      }
      return !prev;
    });
  }, [playDrone, stopDrone]);

  return {
    playBeep,
    playThud,
    playPing,
    playAlert,
    playDrone,
    stopDrone,
    upsideDownActive,
    toggleUpsideDown,
  };
}
