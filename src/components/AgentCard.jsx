/**
 * AgentCard Component
 * AI Ajan kartı
 */

import React from 'react';
import { Bug, Code, GitBranch, ShieldAlert, FileSearch, Play, Square } from 'lucide-react';

// İkon mapping
const iconMap = {
  Bug: Bug,
  Code: Code,
  GitBranch: GitBranch,
  ShieldAlert: ShieldAlert,
  FileSearch: FileSearch,
};

// Status Türkçe mapping
const statusMap = {
  IDLE: 'Beklemede',
  WORKING: 'Çalışıyor',
  COMPLETED: 'Tamamladı',
  ERROR: 'Hata',
};

export default function AgentCard({
  agent,
  onStart,
  onStop,
  showActions = true,
  compact = false,
}) {
  const { name, role, status, currentTask, efficiency, totalCost, icon } = agent;

  const Icon = iconMap[icon] || Bug;
  const displayStatus = statusMap[status] || status;

  const getStatusColor = (s) => {
    switch (s) {
      case 'WORKING':
        return 'text-amber-400 border-amber-400/30 bg-amber-400/10';
      case 'IDLE':
        return 'text-slate-400 border-slate-600/30 bg-slate-400/5';
      case 'COMPLETED':
        return 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10';
      case 'ERROR':
        return 'text-rose-400 border-rose-400/30 bg-rose-400/10';
      default:
        return 'text-slate-400';
    }
  };

  if (compact) {
    return (
      <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${getStatusColor(status)}`}>
            <Icon size={18} />
          </div>
          <div>
            <h4 className="text-white font-medium">{name}</h4>
            <p className="text-slate-500 text-xs">{displayStatus}</p>
          </div>
        </div>
        {showActions && (
          <div className="flex space-x-2">
            {status === 'WORKING' ? (
              <button
                onClick={() => onStop?.(agent.id)}
                className="p-2 bg-rose-500/10 text-rose-400 rounded-lg hover:bg-rose-500/20 transition"
              >
                <Square size={16} />
              </button>
            ) : (
              <button
                onClick={() => onStart?.(agent.id)}
                className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition"
              >
                <Play size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 hover:border-blue-500/30 transition-all duration-300 group">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-lg ${getStatusColor(status)}`}>
            <Icon size={24} />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">{role}</h3>
            <p className="text-slate-400 text-xs font-mono">{name}</p>
          </div>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(
            status
          )}`}
        >
          {displayStatus}
        </span>
      </div>

      {/* Current Task */}
      <div className="space-y-3">
        <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
          <span className="text-slate-500 text-xs uppercase tracking-wider block mb-1">
            Şu Anki Görev
          </span>
          <p className="text-slate-300 text-sm truncate font-medium">
            {currentTask || 'Görev atanmadı...'}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-900/30 p-2 rounded-lg">
            <span className="text-slate-500 text-xs block">Performans</span>
            <span className="text-emerald-400 text-sm font-bold">
              %{parseFloat(efficiency || 0).toFixed(1)}
            </span>
          </div>
          <div className="bg-slate-900/30 p-2 rounded-lg">
            <span className="text-slate-500 text-xs block">Maliyet</span>
            <span className="text-blue-400 text-sm font-bold">
              ${parseFloat(totalCost || 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="mt-4 flex space-x-2">
          {status === 'WORKING' ? (
            <button
              onClick={() => onStop?.(agent.id)}
              className="flex-1 py-2 bg-rose-500/10 text-rose-400 rounded-lg hover:bg-rose-500/20 transition flex items-center justify-center space-x-2"
            >
              <Square size={16} />
              <span className="text-sm">Durdur</span>
            </button>
          ) : (
            <button
              onClick={() => onStart?.(agent.id)}
              className="flex-1 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition flex items-center justify-center space-x-2"
            >
              <Play size={16} />
              <span className="text-sm">Başlat</span>
            </button>
          )}
        </div>
      )}

      {/* Loading Bar */}
      {status === 'WORKING' && (
        <div className="mt-4 w-full bg-slate-700 h-1 rounded-full overflow-hidden">
          <div className="bg-blue-500 h-full w-2/3 animate-loading-bar rounded-full"></div>
        </div>
      )}
    </div>
  );
}
