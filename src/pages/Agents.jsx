/**
 * Agents Page
 * AI Ajan Havuzu yönetimi
 */

import React, { useState, useCallback } from 'react';
import {
  Cpu,
  RefreshCw,
  Play,
  Square,
  Activity,
  Zap,
  Clock,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAgentUpdates } from '../hooks/useWebSocket';
import { agentsAPI } from '../services/api';
import { AgentCard, LiveConsole, Modal } from '../components';

export default function Agents() {
  const { agents, logs, fetchAgents, updateAgent } = useApp();
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // WebSocket
  const handleAgentUpdate = useCallback(
    (agent) => {
      updateAgent(agent);
    },
    [updateAgent]
  );
  useAgentUpdates(handleAgentUpdate);

  // Start agent
  const handleStart = async (id, task = 'Manuel başlatıldı') => {
    try {
      await agentsAPI.start(id, { task });
      fetchAgents();
    } catch (error) {
      console.error('Start error:', error);
    }
  };

  // Stop agent
  const handleStop = async (id) => {
    try {
      await agentsAPI.stop(id);
      fetchAgents();
    } catch (error) {
      console.error('Stop error:', error);
    }
  };

  // Reset all agents
  const handleResetAll = async () => {
    setIsResetting(true);
    try {
      await agentsAPI.reset();
      fetchAgents();
    } catch (error) {
      console.error('Reset error:', error);
    } finally {
      setIsResetting(false);
    }
  };

  // Stats
  const workingCount = agents.filter((a) => a.status === 'WORKING').length;
  const idleCount = agents.filter((a) => a.status === 'IDLE').length;
  const totalCost = agents.reduce((sum, a) => sum + parseFloat(a.totalCost || 0), 0);
  const avgEfficiency =
    agents.length > 0
      ? agents.reduce((sum, a) => sum + parseFloat(a.efficiency || 0), 0) / agents.length
      : 0;

  return (
    <div className="p-8 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Cpu className="text-blue-500" />
            Agent Havuzu
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Tüm ajanlarınızı yönetin ve izleyin
          </p>
        </div>

        <button
          onClick={handleResetAll}
          disabled={isResetting}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 transition"
        >
          <RefreshCw size={18} className={isResetting ? 'animate-spin' : ''} />
          <span>Tümünü Sıfırla</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Cpu size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-slate-500 text-sm">Toplam Ajan</p>
              <p className="text-2xl font-bold text-white">{agents.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Activity size={20} className="text-amber-400" />
            </div>
            <div>
              <p className="text-slate-500 text-sm">Çalışıyor</p>
              <p className="text-2xl font-bold text-amber-400">{workingCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <BarChart3 size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-slate-500 text-sm">Ort. Verimlilik</p>
              <p className="text-2xl font-bold text-emerald-400">
                %{avgEfficiency.toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <DollarSign size={20} className="text-purple-400" />
            </div>
            <div>
              <p className="text-slate-500 text-sm">Toplam Maliyet</p>
              <p className="text-2xl font-bold text-purple-400">${totalCost.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-8">
        {/* Agents Grid */}
        <div className="col-span-8">
          <div className="grid grid-cols-2 gap-4">
            {agents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => {
                  setSelectedAgent(agent);
                  setIsModalOpen(true);
                }}
                className="cursor-pointer"
              >
                <AgentCard
                  agent={agent}
                  onStart={(id) => handleStart(id)}
                  onStop={(id) => handleStop(id)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Logs */}
        <div className="col-span-4">
          <h3 className="text-lg font-semibold text-white mb-4">Ajan Logları</h3>
          <LiveConsole
            logs={logs.filter((l) => l.agentId)}
            maxHeight="h-[500px]"
          />
        </div>
      </div>

      {/* Agent Detail Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedAgent?.name}
        size="lg"
      >
        {selectedAgent && (
          <div className="space-y-6">
            {/* Agent Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 p-4 rounded-xl">
                <p className="text-slate-500 text-sm mb-1">Rol</p>
                <p className="text-white font-medium">{selectedAgent.role}</p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-xl">
                <p className="text-slate-500 text-sm mb-1">Tip</p>
                <p className="text-white font-medium">{selectedAgent.type}</p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-xl">
                <p className="text-slate-500 text-sm mb-1">Verimlilik</p>
                <p className="text-emerald-400 font-medium">
                  %{parseFloat(selectedAgent.efficiency || 0).toFixed(1)}
                </p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-xl">
                <p className="text-slate-500 text-sm mb-1">Toplam Maliyet</p>
                <p className="text-blue-400 font-medium">
                  ${parseFloat(selectedAgent.totalCost || 0).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Current Task */}
            <div className="bg-slate-800/50 p-4 rounded-xl">
              <p className="text-slate-500 text-sm mb-1">Mevcut Görev</p>
              <p className="text-white">{selectedAgent.currentTask || 'Görev yok'}</p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              {selectedAgent.status === 'WORKING' ? (
                <button
                  onClick={() => {
                    handleStop(selectedAgent.id);
                    setIsModalOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition"
                >
                  <Square size={18} />
                  Durdur
                </button>
              ) : (
                <button
                  onClick={() => {
                    handleStart(selectedAgent.id);
                    setIsModalOpen(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition"
                >
                  <Play size={18} />
                  Başlat
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
