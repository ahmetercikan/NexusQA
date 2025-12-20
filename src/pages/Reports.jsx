/**
 * Reports Page
 * Raporlar ve Analiz
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Filter,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
} from 'lucide-react';
import { testRunsAPI, dashboardAPI } from '../services/api';

export default function Reports() {
  const [runs, setRuns] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('week');

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [runsRes, statsRes] = await Promise.all([
        testRunsAPI.getAll({ limit: 50 }),
        dashboardAPI.getStats(),
      ]);
      setRuns(runsRes.data || []);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PASSED':
        return 'text-emerald-400 bg-emerald-500/10';
      case 'FAILED':
        return 'text-rose-400 bg-rose-500/10';
      case 'RUNNING':
        return 'text-amber-400 bg-amber-500/10';
      case 'ERROR':
        return 'text-red-400 bg-red-500/10';
      default:
        return 'text-slate-400 bg-slate-500/10';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PASSED':
        return <CheckCircle size={16} />;
      case 'FAILED':
        return <XCircle size={16} />;
      case 'RUNNING':
        return <Activity size={16} className="animate-spin" />;
      default:
        return <Clock size={16} />;
    }
  };

  const formatDuration = (ms) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="text-blue-500" />
            Raporlar & Analiz
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Test sonuçlarınızı analiz edin
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
          >
            <option value="today">Bugün</option>
            <option value="week">Bu Hafta</option>
            <option value="month">Bu Ay</option>
            <option value="all">Tümü</option>
          </select>

          <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl transition">
            <Download size={18} />
            <span>Rapor İndir</span>
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-500/30 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-400 text-sm">Toplam Koşum</span>
            <BarChart3 size={20} className="text-blue-400" />
          </div>
          <p className="text-3xl font-bold text-white">{stats?.runs?.total || 0}</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-800/20 border border-emerald-500/30 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-emerald-400 text-sm">Başarılı</span>
            <TrendingUp size={20} className="text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-emerald-400">{stats?.runs?.passed || 0}</p>
          <p className="text-emerald-400/60 text-sm mt-1">
            %{stats?.runs?.passRate || 0} başarı oranı
          </p>
        </div>

        <div className="bg-gradient-to-br from-rose-600/20 to-rose-800/20 border border-rose-500/30 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-rose-400 text-sm">Başarısız</span>
            <TrendingDown size={20} className="text-rose-400" />
          </div>
          <p className="text-3xl font-bold text-rose-400">{stats?.runs?.failed || 0}</p>
        </div>

        <div className="bg-gradient-to-br from-amber-600/20 to-amber-800/20 border border-amber-500/30 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-amber-400 text-sm">Çalışıyor</span>
            <Activity size={20} className="text-amber-400" />
          </div>
          <p className="text-3xl font-bold text-amber-400">{stats?.runs?.running || 0}</p>
        </div>
      </div>

      {/* Chart Placeholder */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">Günlük Test Trendi</h3>
        <div className="flex items-end space-x-2 h-48 px-4">
          {[35, 55, 45, 70, 85, 65, 90, 75, 95, 80, 88, 92, 78, 85].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-sm transition-all hover:from-blue-500 hover:to-blue-300"
                style={{ height: `${h}%` }}
              ></div>
              <span className="text-[10px] text-slate-500">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Runs Table */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Son Test Koşumları</h3>
          <span className="text-sm text-slate-500">{runs.length} kayıt</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : runs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <FileText size={48} className="mb-4" />
            <p>Henüz test koşumu yok</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Test Suite
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Ajan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Süre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Tarih
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {runs.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">
                          {run.suite?.name || `Suite #${run.suiteId}`}
                        </p>
                        <p className="text-slate-500 text-sm">{run.suite?.type}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {run.agent?.name || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(
                          run.status
                        )}`}
                      >
                        {getStatusIcon(run.status)}
                        {run.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {formatDuration(run.durationMs)}
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {formatDate(run.startedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
