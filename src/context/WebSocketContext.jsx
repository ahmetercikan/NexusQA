/**
 * WebSocket Context
 * Tüm uygulama için tek bir paylaşılan WebSocket bağlantısı
 */

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:3001';

const WebSocketContext = createContext(null);

// Singleton socket instance - StrictMode'da çift bağlantı önlemek için
let globalSocket = null;

export function WebSocketProvider({ children }) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const listenersRef = useRef(new Map());
  const mountedRef = useRef(false);

  useEffect(() => {
    // Zaten bağlı socket varsa kullan
    if (globalSocket && globalSocket.connected) {
      socketRef.current = globalSocket;
      setIsConnected(true);
      return;
    }

    // İlk mount değilse (StrictMode ikinci çağrısı) bekle
    if (mountedRef.current) {
      return;
    }
    mountedRef.current = true;

    // Yeni socket oluştur
    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      autoConnect: true,
      forceNew: false,
    });

    globalSocket = socket;
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('WebSocket connected:', socket.id);
      setIsConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);

      // Otomatik reconnect
      if (reason === 'io server disconnect' || reason === 'transport close') {
        setTimeout(() => {
          if (!socket.connected) {
            socket.connect();
          }
        }, 1000);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket error:', error.message);
      setIsConnected(false);
    });

    // Cleanup - sadece unmount'ta
    return () => {
      // StrictMode'da hemen disconnect etme
      // Gerçek unmount'ta socket açık kalabilir (SPA)
    };
  }, []);

  // Kanala abone ol
  const subscribe = useCallback((channel) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(`subscribe:${channel}`);
    }
  }, []);

  // Abonelikten çık
  const unsubscribe = useCallback((channel) => {
    if (socketRef.current) {
      socketRef.current.emit(`unsubscribe:${channel}`);
    }
  }, []);

  // Event dinleyici ekle
  const on = useCallback((event, callback) => {
    if (socketRef.current) {
      // Önceki listener'ı kaldır (duplikasyonu önle)
      if (listenersRef.current.has(event)) {
        socketRef.current.off(event, listenersRef.current.get(event));
      }

      const wrappedCallback = (data) => {
        callback(data);
      };

      listenersRef.current.set(event, wrappedCallback);
      socketRef.current.on(event, wrappedCallback);
    }
  }, []);

  // Event dinleyici kaldır
  const off = useCallback((event) => {
    if (socketRef.current) {
      if (listenersRef.current.has(event)) {
        socketRef.current.off(event, listenersRef.current.get(event));
        listenersRef.current.delete(event);
      }
    }
  }, []);

  const value = {
    socket: socketRef.current,
    isConnected,
    subscribe,
    unsubscribe,
    on,
    off,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

// Custom hook to use WebSocket context
export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  return context;
}

// Alias for convenience
export const useWebSocket = useWebSocketContext;

export default WebSocketContext;
