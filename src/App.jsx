/**
 * Nexus QA - Main App Component
 * Routing ve Layout
 */

import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components';
import { Dashboard, TestSuites, Agents, Reports, Settings, Documents, TestScenarios } from './pages';
import AutomationPanel from './components/AutomationPanel';
import { useWebSocket, useLogUpdates, useAgentUpdates } from './hooks/useWebSocket';
import { useApp } from './context/AppContext';

function AppContent() {
  const { wsConnected, setWsConnected, updateAgent, addLog } = useApp();
  const { isConnected, on, subscribe, unsubscribe } = useWebSocket();
  const mainContentRef = useRef(null);
  const location = useLocation();

  // Scroll to top on route change
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  // WebSocket connection status
  useEffect(() => {
    setWsConnected(isConnected);
  }, [isConnected, setWsConnected]);

  // Subscribe to WebSocket events
  const handleAgentUpdate = (agent) => {
    updateAgent(agent);
  };

  const handleNewLog = (log) => {
    addLog(log);
  };

  useAgentUpdates(handleAgentUpdate);
  useLogUpdates(handleNewLog);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
      {/* Sidebar */}
      <Sidebar wsConnected={wsConnected} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex items-center justify-between px-8 z-10">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-white">Nexus QA</h1>
            <div className="h-4 w-px bg-slate-700"></div>
            <div
              className={`flex items-center space-x-2 text-sm ${
                wsConnected ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500' : 'bg-red-500'} animate-pulse`}></div>
              <span>{wsConnected ? 'Bağlı' : 'Bağlantı Yok'}</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
              <span className="font-bold text-xs">AE</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div ref={mainContentRef} className="flex-1 overflow-auto custom-scrollbar">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/test-suites" element={<TestSuites />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/test-scenarios" element={<TestScenarios />} />
            <Route path="/automation" element={<AutomationPanel />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>

      {/* Global Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569;
        }

        @keyframes loading-bar {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
        .animate-loading-bar {
          animation: loading-bar 1.5s infinite linear;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}