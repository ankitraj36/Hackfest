/**
 * syncCalculator.js — Pure math functions for synchronization
 * 
 * No side effects, no state — just calculations.
 */

/**
 * Calculate median latency from an array of RTT samples.
 * Uses median instead of average to ignore outlier spikes.
 * @param {number[]} samples — array of round-trip times in ms
 * @returns {number} — median latency in ms
 */
export function calculateMedianLatency(samples) {
  if (!samples || samples.length === 0) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  // For even-length arrays, average the two middle values
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate the drift between local video time and the synced time.
 * Positive = local is ahead, negative = local is behind.
 * @param {number} videoTime — current video playback time in seconds
 * @param {number} syncTime — expected time from broadcaster in seconds
 * @returns {number} — drift in seconds (absolute value)
 */
export function calculateDrift(videoTime, syncTime) {
  return Math.abs(videoTime - syncTime);
}

/**
 * Calculate sync health score from an array of drift values.
 * 100 = perfect sync, 0 = max drift.
 * @param {number[]} drifts — array of drift values in seconds
 * @returns {number} — 0–100 score
 */
export function calculateSyncHealth(drifts) {
  if (!drifts || drifts.length === 0) return 100;
  const maxDrift = 5; // 5 seconds = worst case
  const avgDrift = drifts.reduce((sum, d) => sum + d, 0) / drifts.length;
  const health = 100 - (avgDrift / maxDrift) * 100;
  return Math.max(0, Math.min(100, Math.round(health)));
}

/**
 * Should auto-correct be triggered? (drift > 5 seconds)
 * @param {number} drift — drift in seconds
 * @returns {boolean}
 */
export function shouldAutoCorrect(drift) {
  return drift > 5;
}

/**
 * Should the manual RESYNC button be shown? (drift > 2 seconds)
 * @param {number} drift — drift in seconds
 * @returns {boolean}
 */
export function shouldShowResync(drift) {
  return drift > 2;
}
