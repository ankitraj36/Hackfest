/**
 * ChatPanel.jsx — Ham radio transmission log styled chat
 * 
 * Features:
 * - Messages formatted as [HH:MM:SS] CALLSIGN: message
 * - Broadcaster can pin messages (shown as blinking banner)
 * - Auto-scrolls to latest message
 * - Retains last 100 messages in state
 * - Mobile: collapses to slide-up drawer
 */

import { useState, useRef, useEffect } from 'react';

export default function ChatPanel({ roomId, callsign, isBroadcaster, socket }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [pinnedMessage, setPinnedMessage] = useState(null);
  const [isOpen, setIsOpen] = useState(true); // For mobile drawer
  const messagesEndRef = useRef(null);

  // Subscribe to chat broadcasts
  useEffect(() => {
    if (!socket) return;

    const handleChat = ({ callsign: sender, message, timestamp }) => {
      setMessages((prev) => {
        const next = [...prev, { sender, message, timestamp, id: Date.now() + Math.random() }];
        // Keep last 100 messages
        return next.length > 100 ? next.slice(-100) : next;
      });
    };

    const handlePinned = ({ messageId }) => {
      setMessages((prev) => {
        const msg = prev.find((m) => m.id === messageId);
        if (msg) setPinnedMessage(msg);
        return prev;
      });
    };

    socket.on('chat-broadcast', handleChat);
    socket.on('message-pinned', handlePinned);

    return () => {
      socket.off('chat-broadcast', handleChat);
      socket.off('message-pinned', handlePinned);
    };
  }, [socket]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  function sendMessage(e) {
    e.preventDefault();
    if (!input.trim() || !socket) return;

    socket.emit('chat-message', {
      roomId,
      callsign,
      message: input.trim(),
    });

    setInput('');
  }

  // Pin a message (broadcaster only)
  function pinMessage(msg) {
    if (!isBroadcaster || !socket) return;
    socket.emit('pin-message', { roomId, messageId: msg.id });
    setPinnedMessage(msg);
  }

  // Format timestamp
  function formatTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour12: false });
  }

  return (
    <div
      className="retro-panel chat-panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: '400px',
      }}
    >
      {/* Header with mobile toggle */}
      <div
        className="section-header"
        style={{
          fontSize: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
        }}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span>📻 TRANSMISSION LOG</span>
        <span className="mobile-toggle">{isOpen ? '▼' : '▲'}</span>
      </div>

      {isOpen && (
        <>
          {/* Pinned message banner */}
          {pinnedMessage && (
            <div
              style={{
                background: 'rgba(255,0,0,0.15)',
                border: '1px solid #ff0000',
                padding: '0.3rem 0.5rem',
                marginBottom: '0.5rem',
                animation: 'blink 2s infinite',
                fontSize: '0.95rem',
              }}
            >
              📌 [{formatTime(pinnedMessage.timestamp)}]{' '}
              <span style={{ color: '#ff0000' }}>{pinnedMessage.sender}</span>:{' '}
              {pinnedMessage.message}
            </div>
          )}

          {/* Message log */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              marginBottom: '0.5rem',
              fontSize: '1rem',
              lineHeight: '1.6',
            }}
          >
            {messages.length === 0 && (
              <div style={{ color: '#333', textAlign: 'center', padding: '2rem 0' }}>
                AWAITING TRANSMISSIONS...
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  padding: '0.1rem 0',
                  cursor: isBroadcaster ? 'pointer' : 'default',
                  borderLeft: pinnedMessage?.id === msg.id ? '2px solid #ff0000' : 'none',
                  paddingLeft: pinnedMessage?.id === msg.id ? '0.5rem' : '0',
                }}
                onClick={() => pinMessage(msg)}
                title={isBroadcaster ? 'Click to pin' : ''}
              >
                <span style={{ color: '#666' }}>[{formatTime(msg.timestamp)}]</span>{' '}
                <span style={{ color: '#ff6600' }}>{msg.sender}</span>:{' '}
                <span style={{ color: '#00ff41' }}>{msg.message}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input form */}
          <form
            onSubmit={sendMessage}
            style={{ display: 'flex', gap: '0.5rem' }}
          >
            <input
              type="text"
              className="retro-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="TRANSMISSION:"
              maxLength={500}
              style={{ flex: 1 }}
            />
            <button type="submit" className="retro-button" style={{ fontSize: '1rem', padding: '0.3rem 0.8rem' }}>
              TRANSMIT ▶
            </button>
          </form>
        </>
      )}
    </div>
  );
}
