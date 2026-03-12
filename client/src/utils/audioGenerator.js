/**
 * audioGenerator.js — Pure Web Audio API sound synthesis
 * 
 * All sounds are generated via OscillatorNode — zero audio files needed.
 * Each function takes an AudioContext and returns a disposable sound.
 */

/**
 * Create a short beep tone
 * @param {AudioContext} ctx
 * @param {number} freq — frequency in Hz (default 880)
 * @param {number} duration — seconds (default 0.1)
 * @param {number} volume — 0–1 (default 0.3)
 */
export function createBeep(ctx, freq = 880, duration = 0.1, volume = 0.3) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'square';
  osc.frequency.value = freq;
  gain.gain.value = volume;

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);

  // Clean up nodes after sound completes
  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

/**
 * Create a tone that decays (fades out) — used for pings/notifications
 * @param {AudioContext} ctx
 * @param {number} freq — frequency in Hz (default 1200)
 * @param {number} duration — seconds (default 0.3)
 */
export function createDecayTone(ctx, freq = 1200, duration = 0.3) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.4, ctx.currentTime);
  // Exponential decay to near-silence
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);

  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

/**
 * Create an oscillating siren that sweeps between two frequencies
 * @param {AudioContext} ctx
 * @param {number} freqLow — lower frequency (default 400)
 * @param {number} freqHigh — upper frequency (default 800)
 * @param {number} duration — seconds (default 1)
 */
export function createOscSiren(ctx, freqLow = 400, freqHigh = 800, duration = 1) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  gain.gain.value = 0.2;

  // Sweep frequency up and down across the duration
  const now = ctx.currentTime;
  const cycles = 4;
  for (let i = 0; i < cycles; i++) {
    const t = now + (duration / cycles) * i;
    osc.frequency.setValueAtTime(freqLow, t);
    osc.frequency.linearRampToValueAtTime(freqHigh, t + duration / cycles / 2);
    osc.frequency.linearRampToValueAtTime(freqLow, t + duration / cycles);
  }

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration);

  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

/**
 * Create a continuous low drone — returns start/stop controls
 * Used for "Upside Down" mode ambient sound
 * @param {AudioContext} ctx
 * @param {number} freq — frequency in Hz (default 60)
 * @returns {{ start: Function, stop: Function }}
 */
export function createDrone(ctx, freq = 60) {
  let osc = null;
  let gain = null;

  return {
    start() {
      if (osc) return; // Already running

      osc = ctx.createOscillator();
      gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      gain.gain.value = 0.08; // Very low volume — ambient hum

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
    },
    stop() {
      if (osc) {
        osc.stop();
        osc.disconnect();
        gain.disconnect();
        osc = null;
        gain = null;
      }
    },
  };
}
