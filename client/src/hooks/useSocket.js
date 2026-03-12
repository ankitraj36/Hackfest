/**
 * useSocket.js — Socket.io connection hook
 * 
 * Manages a single socket connection with:
 * - Auto-reconnect with exponential backoff
 * - Connection status tracking
 * - Reconnect attempt counter
 * - Centralized emit/on/off helpers
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:5000';

export default function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  useEffect(() => {
    // Create socket connection with reconnection config
    const socket = io(SERVER_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      // Exponential backoff factor
      randomizationFactor: 0.5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setReconnectAttempt(0);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('reconnect_attempt', (attempt) => {
      setReconnectAttempt(attempt);
    });

    socket.on('reconnect', () => {
      setConnected(true);
      setReconnectAttempt(0);
    });

    socket.on('reconnect_failed', () => {
      setReconnectAttempt(-1); // -1 signals all attempts exhausted
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Helper: emit with optional acknowledgement
  const emit = useCallback((event, data) => {
    if (socketRef.current) {
      socketRef.current.emit(event, data);
    }
  }, []);

  // Helper: subscribe to event
  const on = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.on(event, handler);
    }
  }, []);

  // Helper: unsubscribe from event
  const off = useCallback((event, handler) => {
    if (socketRef.current) {
      socketRef.current.off(event, handler);
    }
  }, []);

  return {
    socket: socketRef.current,
    connected,
    reconnectAttempt,
    emit,
    on,
    off,
  };
}
