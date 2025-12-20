/**
 * Nexus QA - WebSocket Hook
 * Real-time güncellemeler için Socket.io bağlantısı
 * WebSocketContext'i kullanır - tek paylaşılan bağlantı
 */

import { useEffect, useRef } from 'react';
import { useWebSocketContext } from '../context/WebSocketContext';

// Ana WebSocket hook - context'ten alır
export function useWebSocket() {
  return useWebSocketContext();
}

// Ajanlar için özel hook
export function useAgentUpdates(onAgentUpdate) {
  const { subscribe, unsubscribe, on, off, isConnected } = useWebSocketContext();
  const callbackRef = useRef(onAgentUpdate);

  useEffect(() => {
    callbackRef.current = onAgentUpdate;
  }, [onAgentUpdate]);

  useEffect(() => {
    if (isConnected) {
      subscribe('agents');
      on('agent:status', (data) => callbackRef.current?.(data));

      return () => {
        off('agent:status');
        unsubscribe('agents');
      };
    }
  }, [isConnected, subscribe, unsubscribe, on, off]);

  return { isConnected };
}

// Loglar için özel hook
export function useLogUpdates(onNewLog) {
  const { subscribe, unsubscribe, on, off, isConnected } = useWebSocketContext();
  const callbackRef = useRef(onNewLog);

  useEffect(() => {
    callbackRef.current = onNewLog;
  }, [onNewLog]);

  useEffect(() => {
    if (isConnected) {
      subscribe('logs');
      on('log:new', (data) => callbackRef.current?.(data));

      return () => {
        off('log:new');
        unsubscribe('logs');
      };
    }
  }, [isConnected, subscribe, unsubscribe, on, off]);

  return { isConnected };
}

// Test güncellemeleri için özel hook
export function useTestUpdates(callbacks) {
  const { subscribe, unsubscribe, on, off, isConnected } = useWebSocketContext();
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    if (isConnected) {
      subscribe('tests');

      on('test:started', (data) => callbacksRef.current?.onStarted?.(data));
      on('test:completed', (data) => callbacksRef.current?.onCompleted?.(data));
      on('test:failed', (data) => callbacksRef.current?.onFailed?.(data));

      return () => {
        off('test:started');
        off('test:completed');
        off('test:failed');
        unsubscribe('tests');
      };
    }
  }, [isConnected, subscribe, unsubscribe, on, off]);

  return { isConnected };
}

// Döküman güncellemeleri için özel hook
export function useDocumentUpdates(callbacks) {
  const { subscribe, unsubscribe, on, off, isConnected } = useWebSocketContext();
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    if (isConnected) {
      subscribe('documents');

      on('document:status', (data) => callbacksRef.current?.onStatus?.(data));
      on('document:analyzing', (data) => callbacksRef.current?.onAnalyzing?.(data));
      on('document:completed', (data) => callbacksRef.current?.onCompleted?.(data));
      on('scenario:created', (data) => callbacksRef.current?.onScenarioCreated?.(data));

      return () => {
        off('document:status');
        off('document:analyzing');
        off('document:completed');
        off('scenario:created');
        unsubscribe('documents');
      };
    }
  }, [isConnected, subscribe, unsubscribe, on, off]);

  return { isConnected };
}

// Otomasyon güncellemeleri için özel hook
export function useAutomationUpdates(callbacks) {
  const { subscribe, unsubscribe, on, off, isConnected } = useWebSocketContext();
  const callbacksRef = useRef(callbacks);

  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  useEffect(() => {
    if (isConnected) {
      subscribe('automation');

      // Workflow events
      on('automation:started', (data) => callbacksRef.current?.onStarted?.(data));
      on('automation:step', (data) => callbacksRef.current?.onStep?.(data));
      on('automation:completed', (data) => callbacksRef.current?.onCompleted?.(data));
      on('automation:error', (data) => callbacksRef.current?.onError?.(data));

      // Element discovery events
      on('automation:element', (data) => callbacksRef.current?.onElement?.(data));

      // Script generation events
      on('automation:script', (data) => callbacksRef.current?.onScript?.(data));

      // Test execution events
      on('automation:testStart', (data) => callbacksRef.current?.onTestStart?.(data));
      on('automation:testPass', (data) => callbacksRef.current?.onTestPass?.(data));
      on('automation:testFail', (data) => callbacksRef.current?.onTestFail?.(data));

      return () => {
        off('automation:started');
        off('automation:step');
        off('automation:completed');
        off('automation:error');
        off('automation:element');
        off('automation:script');
        off('automation:testStart');
        off('automation:testPass');
        off('automation:testFail');
        unsubscribe('automation');
      };
    }
  }, [isConnected, subscribe, unsubscribe, on, off]);

  return { isConnected };
}

export default useWebSocket;
