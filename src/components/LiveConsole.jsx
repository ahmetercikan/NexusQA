/**
 * LiveConsole Component
 * Canlı log görüntüleyici
 */

import React, { useEffect, useRef } from 'react';
import { Terminal, Trash2 } from 'lucide-react';

// Log level renkleri
const levelColors = {
  ERROR: 'text-rose-400',
  SUCCESS: 'text-emerald-400',
  INFO: 'text-blue-400',
  WARNING: 'text-amber-400',
  DEBUG: 'text-slate-500',
  SYSTEM: 'text-purple-400',
};

export default function LiveConsole({ logs = [], onClear, maxHeight = 'h-64' }) {
  const consoleRef = useRef(null);

  // Otomatik scroll - sadece console içinde, sayfa scroll'unu etkilemez
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  // Zaman formatı
  const formatTime = (timestamp) => {
    if (!timestamp) return '--:--:--';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('tr-TR');
  };

  return (
    <div
      className={`bg-black/80 rounded-xl border border-slate-800 overflow-hidden flex flex-col ${maxHeight} font-mono text-xs`}
    >
      {/* Header */}
      <div className="bg-slate-900/80 px-4 py-2 border-b border-slate-800 flex justify-between items-center shrink-0">
        <div className="flex items-center space-x-2">
          <Terminal size={14} className="text-slate-400" />
          <span className="text-slate-300">Canlı Sistem Logları</span>
          <span className="text-slate-600 text-[10px]">({logs.length} kayıt)</span>
        </div>
        <div className="flex items-center space-x-3">
          {onClear && (
            <button
              onClick={onClear}
              className="text-slate-500 hover:text-slate-300 transition"
              title="Temizle"
            >
              <Trash2 size={14} />
            </button>
          )}
          <div className="flex space-x-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500"></div>
          </div>
        </div>
      </div>

      {/* Logs */}
      <div ref={consoleRef} className="flex-1 p-4 overflow-y-auto space-y-1.5 custom-scrollbar">
        {logs.length === 0 ? (
          <div className="text-slate-600 text-center py-8">
            Henüz log kaydı yok...
          </div>
        ) : (
          logs.map((log, index) => (
            <div key={log.id || index} className="flex space-x-2 animate-fade-in">
              <span className="text-slate-600 shrink-0">
                [{formatTime(log.createdAt || log.time)}]
              </span>
              {log.agent && (
                <span className="text-purple-400 shrink-0">{log.agent.name}:</span>
              )}
              <span className={levelColors[log.level] || 'text-slate-300'}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
