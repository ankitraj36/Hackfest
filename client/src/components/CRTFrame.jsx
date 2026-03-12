/**
 * CRTFrame.jsx — CRT monitor bezel wrapper
 * 
 * Wraps children in a retro TV frame with:
 * - Thick dark bezel
 * - Scanline overlay
 * - Vignette darkened edges
 * - Phosphor glow (green or red based on isLive)
 * - "● REC" blinking indicator when live
 * - "SIGNAL LOST" static noise when no content
 */

export default function CRTFrame({ children, isLive = false, showStatic = false }) {
  return (
    <div className={`crt-frame ${isLive ? 'live' : ''}`}>
      {/* Vignette overlay */}
      <div className="crt-vignette" />

      {/* REC indicator */}
      {isLive && (
        <div className="crt-rec">
          <span className="crt-rec-dot" />
          <span>REC</span>
        </div>
      )}

      {/* SIGNAL LOST static noise overlay */}
      {showStatic && (
        <div className="crt-static">
          <span className="crt-static-text">SIGNAL LOST</span>
        </div>
      )}

      {/* Screen content area with slight curvature */}
      <div className="crt-screen">
        {children}
      </div>
    </div>
  );
}
