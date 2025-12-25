/**
 * Live Browser Viewer Component (React)
 * CDP Screencast ile canlı browser görüntüsü gösterir
 *
 * KULLANIM:
 * import LiveBrowserViewer from './LiveBrowserViewer';
 * <LiveBrowserViewer workflowId="workflow-1234567890" />
 */

import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const LiveBrowserViewer = ({ workflowId, autoConnect = true }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [fps, setFps] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [resolution, setResolution] = useState('-');
  const [latency, setLatency] = useState('-');

  const socketRef = useRef(null);
  const imgRef = useRef(null);
  const fpsCounterRef = useRef(0);
  const fpsIntervalRef = useRef(null);

  useEffect(() => {
    if (autoConnect && workflowId) {
      connectToScreencast();
    }

    return () => {
      disconnectFromScreencast();
    };
  }, [workflowId]);

  const connectToScreencast = () => {
    if (!workflowId) {
      console.error('Workflow ID gerekli!');
      return;
    }

    // Socket.IO bağlantısı
    const socket = io('http://localhost:3001', {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('✅ WebSocket bağlantısı kuruldu');
      setIsConnected(true);

      // Subscribe to rooms
      socket.emit('subscribe:automation');
      socket.emit('subscribe:screencast', workflowId);

      // FPS counter başlat
      startFPSCounter();
    });

    socket.on('disconnect', () => {
      console.log('❌ WebSocket bağlantısı kesildi');
      setIsConnected(false);
      setIsStreaming(false);
      stopFPSCounter();
    });

    // Screencast frame event
    socket.on('browser:screencast:frame', (frameData) => {
      const { data, metadata, timestamp } = frameData;

      // Base64 image data'yı img'e set et
      if (imgRef.current) {
        imgRef.current.src = `data:image/jpeg;base64,${data}`;
      }

      // Stats güncelle
      setFrameCount(prev => prev + 1);
      fpsCounterRef.current++;

      // Resolution
      if (metadata) {
        setResolution(`${metadata.deviceWidth || 0}x${metadata.deviceHeight || 0}`);
      }

      // Latency
      const now = Date.now();
      const latency = now - timestamp;
      setLatency(latency);
    });

    // Screencast başladı
    socket.on('browser:screencast:started', (data) => {
      console.log('🎬 Screencast başladı:', data.workflowId);
      setIsStreaming(true);
    });

    // Screencast durdu
    socket.on('browser:screencast:stopped', (data) => {
      console.log('⏹️ Screencast durdu:', data.workflowId);
      setIsStreaming(false);
      stopFPSCounter();
    });

    socketRef.current = socket;
  };

  const disconnectFromScreencast = () => {
    if (socketRef.current) {
      socketRef.current.emit('unsubscribe:screencast', workflowId);
      socketRef.current.emit('unsubscribe:automation');
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    setIsConnected(false);
    setIsStreaming(false);
    setFrameCount(0);
    setFps(0);
    setResolution('-');
    setLatency('-');
    stopFPSCounter();
  };

  const startFPSCounter = () => {
    stopFPSCounter();
    fpsIntervalRef.current = setInterval(() => {
      setFps(fpsCounterRef.current);
      fpsCounterRef.current = 0;
    }, 1000);
  };

  const stopFPSCounter = () => {
    if (fpsIntervalRef.current) {
      clearInterval(fpsIntervalRef.current);
      fpsIntervalRef.current = null;
    }
  };

  return (
    <div className="live-browser-viewer">
      {/* Header */}
      <div className="viewer-header">
        <div className="status">
          <div className={`status-dot ${isConnected ? 'connected' : ''}`} />
          <span>
            {isStreaming ? '🎬 Canlı Yayın' : isConnected ? '⏸️ Bekleniyor' : '⏹️ Bağlı Değil'}
          </span>
        </div>

        <div className="stats-mini">
          <span>{fps} FPS</span>
          <span>{resolution}</span>
          <span>{latency} ms</span>
        </div>
      </div>

      {/* Browser Screen */}
      <div className="browser-viewport">
        {!isStreaming && (
          <div className="placeholder">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
              <line x1="8" y1="21" x2="16" y2="21"></line>
              <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>
            <p>Canlı görüntü bekleniyor...</p>
          </div>
        )}
        <img ref={imgRef} alt="Live Browser" className="browser-screen" />
      </div>

      {/* Stats */}
      <div className="viewer-stats">
        <div className="stat-card">
          <div className="stat-value">{fps}</div>
          <div className="stat-label">FPS</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{frameCount}</div>
          <div className="stat-label">Total Frames</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{resolution}</div>
          <div className="stat-label">Resolution</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{latency}</div>
          <div className="stat-label">Latency (ms)</div>
        </div>
      </div>

      <style jsx>{`
        .live-browser-viewer {
          background: #16213e;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 8px 32px rgba(0, 212, 255, 0.1);
        }

        .viewer-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
          padding-bottom: 15px;
          border-bottom: 2px solid #0f3460;
        }

        .status {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 600;
          color: #eee;
        }

        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #ff3333;
          animation: pulse 2s infinite;
        }

        .status-dot.connected {
          background: #00ff88;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .stats-mini {
          display: flex;
          gap: 15px;
          font-size: 0.9rem;
          color: #aaa;
        }

        .browser-viewport {
          position: relative;
          width: 100%;
          background: #000;
          border-radius: 8px;
          overflow: hidden;
          min-height: 600px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .browser-screen {
          width: 100%;
          height: auto;
          display: block;
          object-fit: contain;
        }

        .placeholder {
          position: absolute;
          text-align: center;
          color: #666;
        }

        .placeholder svg {
          margin-bottom: 10px;
          opacity: 0.5;
        }

        .placeholder p {
          font-size: 1rem;
        }

        .viewer-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 10px;
          margin-top: 15px;
        }

        .stat-card {
          background: #0f3460;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: bold;
          color: #00d4ff;
        }

        .stat-label {
          font-size: 0.85rem;
          color: #aaa;
          margin-top: 5px;
        }
      `}</style>
    </div>
  );
};

export default LiveBrowserViewer;
