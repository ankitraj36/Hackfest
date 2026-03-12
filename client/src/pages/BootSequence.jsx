/**
 * BootSequence.jsx — Terminal boot animation (shows once per session)
 * 
 * Typewriter effect displaying classified access messages.
 * ~4 seconds total, with skip button. Stores "booted" in sessionStorage.
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const BOOT_LINES = [
  '> CEREBRO UPLINK SYSTEM v3.0 ... INITIALIZING',
  '> HAWKINS LAB — CLASSIFIED ACCESS ONLY',
  '> SCANNING FOR UPSIDE DOWN INTERFERENCE...',
  '> NEURAL LINK CALIBRATING... ████████ 87%',
  '> CONNECTION ESTABLISHED ██████████ 100%',
  '> WELCOME, AGENT.',
];

const CHAR_DELAY = 40; // ms per character

export default function BootSequence() {
  const navigate = useNavigate();
  const [currentLine, setCurrentLine] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [displayedLines, setDisplayedLines] = useState([]);
  const [fadeOut, setFadeOut] = useState(false);
  const [done, setDone] = useState(false);
  const timerRef = useRef(null);

  // Check if already booted this session
  useEffect(() => {
    if (sessionStorage.getItem('cerebro-booted')) {
      navigate('/home', { replace: true });
    }
  }, [navigate]);

  // Typewriter effect
  useEffect(() => {
    if (done) return;

    if (currentLine >= BOOT_LINES.length) {
      // All lines typed — fade out and navigate
      finishBoot();
      return;
    }

    const line = BOOT_LINES[currentLine];

    if (currentChar <= line.length) {
      timerRef.current = setTimeout(() => {
        // Update the current typing line
        setDisplayedLines((prev) => {
          const next = [...prev];
          next[currentLine] = line.slice(0, currentChar);
          return next;
        });
        setCurrentChar((c) => c + 1);
      }, CHAR_DELAY);
    } else {
      // Move to next line after a brief pause
      timerRef.current = setTimeout(() => {
        setCurrentLine((l) => l + 1);
        setCurrentChar(0);
        setDisplayedLines((prev) => [...prev, '']);
      }, 200);
    }

    return () => clearTimeout(timerRef.current);
  }, [currentLine, currentChar, done]);

  function finishBoot() {
    setDone(true);
    setFadeOut(true);
    sessionStorage.setItem('cerebro-booted', 'true');
    setTimeout(() => navigate('/home', { replace: true }), 800);
  }

  function skipBoot() {
    clearTimeout(timerRef.current);
    finishBoot();
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0a0a0a',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '2rem 3rem',
        zIndex: 9999,
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.8s ease-out',
      }}
    >
      {/* Boot lines */}
      <div style={{ maxWidth: '700px' }}>
        {displayedLines.map((line, i) => (
          <div
            key={i}
            style={{
              color: i === displayedLines.length - 1 && !done ? '#00ff41' : '#00cc33',
              fontSize: '1.4rem',
              lineHeight: '2',
              letterSpacing: '1px',
              textShadow: '0 0 8px rgba(0,255,65,0.5)',
            }}
          >
            {line}
            {/* Blinking cursor on current line */}
            {i === displayedLines.length - 1 && !done && (
              <span
                style={{
                  animation: 'cursorBlink 0.8s step-end infinite',
                  color: '#00ff41',
                }}
              >
                ▌
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Skip button */}
      {!done && (
        <button
          onClick={skipBoot}
          style={{
            position: 'fixed',
            bottom: '2rem',
            right: '2rem',
            background: 'transparent',
            border: '1px solid #333',
            color: '#666',
            fontFamily: "'VT323', monospace",
            fontSize: '1rem',
            padding: '0.3rem 1rem',
            cursor: 'pointer',
            letterSpacing: '2px',
          }}
        >
          [ SKIP ]
        </button>
      )}
    </div>
  );
}
