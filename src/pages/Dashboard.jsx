/**
 * Dashboard Page
 * Ana orkestrasyon paneli ve otomasyon iş akışı
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Activity,
  CheckCircle,
  XCircle,
  Cpu,
  TrendingUp,
  DollarSign,
  Clock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLogUpdates, useAgentUpdates } from '../hooks/useWebSocket';
import { agentsAPI } from '../services/api';
import { AgentCard, LiveConsole, StatCard } from '../components';

export default function Dashboard() {
  const {
    agents,
    logs,
    stats,
    isTestRunning,
    fetchAgents,
    fetchStats,
    addLog,
    updateAgent,
    setTestRunning,
  } = useApp();

  const [recentActivities] = useState([
    { type: 'success', title: 'Login Modülü Testi', time: '2 dakika önce', agent: 'Agent Alpha' },
    { type: 'error', title: 'Ödeme Ağ Geçidi Timeout', time: '15 dakika önce', agent: 'SecBot Delta' },
  ]);

  // WebSocket handlers
  const handleAgentUpdate = useCallback(
    (agent) => {
      updateAgent(agent);
    },
    [updateAgent]
  );

  const handleNewLog = useCallback(
    (log) => {
      addLog(log);
    },
    [addLog]
  );

  // WebSocket subscriptions
  useAgentUpdates(handleAgentUpdate);
  useLogUpdates(handleNewLog);

  // Start autonomous test
  const startAutonomousTest = async () => {
    setTestRunning(true);

    try {
      const orchestrator = agents.find((a) => a.type === 'ORCHESTRATOR');
      if (orchestrator) {
        await agentsAPI.start(orchestrator.id, { task: 'Görev Dağıtımı Yapılıyor' });
      }
    } catch (error) {
      console.error('Test start error:', error);
    }
  };

  // Refresh data
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchStats]);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Orkestrasyon Paneli</h1>
          <p className="text-slate-400 text-sm mt-1">
            AI ajanlarınız ve test otomasyon iş akışı
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={startAutonomousTest}
            disabled={isTestRunning}
            className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg ${
              isTestRunning
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white hover:scale-105 shadow-blue-900/30'
            }`}
          >
            {isTestRunning ? (
              <Activity className="animate-spin" size={20} />
            ) : (
              <Play size={20} fill="currentColor" />
            )}
            <span>{isTestRunning ? 'Testler Çalışıyor...' : 'Hızlı Test'}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Toplam Test"
          value={stats?.testCases || '0'}
          change="+12%"
          color="text-white"
          icon={CheckCircle}
          trend="up"
        />
        <StatCard
          label="Başarılı"
          value={stats?.runs?.passed || '0'}
          change={`${stats?.runs?.passRate || 0}%`}
          color="text-emerald-400"
          icon={TrendingUp}
          trend="up"
        />
        <StatCard
          label="Başarısız"
          value={stats?.runs?.failed || '0'}
          change="-5%"
          color="text-rose-400"
          icon={XCircle}
          trend="down"
        />
        <StatCard
          label="Ajan Maliyeti"
          value={`$${stats?.totalCost || '0.00'}`}
          change="Optimize"
          color="text-blue-400"
          icon={DollarSign}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-8">
        {/* Left: Agent Pool */}
        <div className="col-span-8 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Cpu size={20} className="text-blue-500" />
              Aktif Ajan Havuzu
            </h2>
            <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">
              {agents.filter((a) => a.status === 'WORKING').length} / {agents.length} Çalışıyor
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {agents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onStart={async (id) => {
                  await agentsAPI.start(id, { task: 'Manuel başlatıldı' });
                  fetchAgents();
                }}
                onStop={async (id) => {
                  await agentsAPI.stop(id);
                  fetchAgents();
                }}
              />
            ))}
          </div>

          {/* Chart Area */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-slate-400 mb-4">
              Test Kapsamı & Başarı Oranı
            </h3>
            <div className="flex items-end space-x-2 h-32 w-full mt-4 px-2">
              {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 88, 75].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 bg-blue-500/20 rounded-t-sm relative hover:bg-blue-500/30 transition-colors"
                >
                  <div
                    style={{ height: `${h}%` }}
                    className="absolute bottom-0 w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-sm"
                  ></div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span>Oca</span>
              <span>Şub</span>
              <span>Mar</span>
              <span>Nis</span>
              <span>May</span>
              <span>Haz</span>
              <span>Tem</span>
              <span>Ağu</span>
              <span>Eyl</span>
              <span>Eki</span>
              <span>Kas</span>
              <span>Ara</span>
            </div>
          </div>
        </div>

        {/* Right: Logs & Activities */}
        <div className="col-span-4 flex flex-col gap-6">
          {/* Live Console */}
          <div className="flex-1">
            <LiveConsole logs={logs} maxHeight="h-80" />
          </div>

          {/* Recent Activities */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
              <Clock size={16} />
              Son Aktiviteler
            </h3>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div
                    className={`p-1.5 rounded ${
                      activity.type === 'success'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-rose-500/10 text-rose-500'
                    }`}
                  >
                    {activity.type === 'success' ? (
                      <CheckCircle size={16} />
                    ) : (
                      <XCircle size={16} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-slate-200">{activity.title}</p>
                    <p className="text-xs text-slate-500">
                      {activity.time} • {activity.agent}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
