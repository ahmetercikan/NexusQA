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
  Eye,
  X,
  Image as ImageIcon,
  AlertCircle,
  MessageCircle,
  Send,
  Sparkles,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { testRunsAPI, dashboardAPI, agentsAPI } from '../services/api';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6366f1'];

export default function Reports() {
  const [runs, setRuns] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('week');
  const [selectedRun, setSelectedRun] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Agent panel states
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [agentQuestion, setAgentQuestion] = useState('');
  const [agentResponse, setAgentResponse] = useState(null);
  const [agentLoading, setAgentLoading] = useState(false);

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

  const exportReport = () => {
    // Prepare data for export
    const exportData = runs.map((run) => ({
      'Test Suite': run.suite?.name || `Suite #${run.suiteId}`,
      'Ajan': run.agent?.name || '-',
      'Durum': run.status,
      'Süre (ms)': run.durationMs || 0,
      'Tarih': new Date(run.startedAt).toLocaleString('tr-TR'),
      'Hata': run.error || '-',
    }));

    // Create CSV content
    const headers = Object.keys(exportData[0] || {});
    const csvContent = [
      headers.join(','),
      ...exportData.map((row) =>
        headers.map((header) => `"${row[header]}"`).join(',')
      ),
    ].join('\n');

    // Create blob and download
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `nexus-qa-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const askAgent = async () => {
    if (!agentQuestion.trim()) return;

    setAgentLoading(true);
    try {
      // Prepare report context for agent
      const reportContext = {
        totalRuns: runs.length,
        passedTests: runs.filter(r => r.status === 'PASSED').length,
        failedTests: runs.filter(r => r.status === 'FAILED').length,
        averageDuration: runs.length > 0
          ? (runs.reduce((sum, r) => sum + (r.durationMs || 0), 0) / runs.length).toFixed(0)
          : 0,
        recentRuns: runs.slice(0, 10).map(r => ({
          suite: r.suite?.name,
          status: r.status,
          duration: r.durationMs,
          error: r.errorMessage
        }))
      };

      const response = await agentsAPI.query('REPORT_ANALYST', {
        question: agentQuestion,
        context: reportContext
      });

      setAgentResponse(response.response || response.answer);
      setAgentQuestion('');
    } catch (error) {
      console.error('Agent query error:', error);
      setAgentResponse('Agent ile iletişim kurulamadı. Lütfen tekrar deneyin.');
    } finally {
      setAgentLoading(false);
    }
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

          <button
            onClick={exportReport}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl transition"
          >
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

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        {/* Test Trend Chart */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Son 7 Gün Test Trendi</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart
              data={runs.slice(0, 7).reverse().map((run, i) => ({
                name: new Date(run.startedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }),
                başarılı: run.status === 'PASSED' ? 1 : 0,
                başarısız: run.status === 'FAILED' ? 1 : 0,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '8px' }}
              />
              <Legend />
              <Line type="monotone" dataKey="başarılı" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="başarısız" stroke="#ef4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pass/Fail Rate Pie Chart */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Başarı Oranı</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Başarılı', value: stats?.runs?.passed || 0 },
                  { name: 'Başarısız', value: stats?.runs?.failed || 0 },
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {[0, 1].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Detay
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {runs.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-800/30 transition cursor-pointer">
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
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedRun(run);
                          setShowDetailModal(true);
                        }}
                        className="text-blue-400 hover:text-blue-300 transition"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Test Detail Modal */}
      {showDetailModal && selectedRun && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FileText className="text-blue-500" size={24} />
                  Test Koşumu Detayları
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  {selectedRun.suite?.name || `Suite #${selectedRun.suiteId}`}
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Test Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 rounded-xl p-4">
                  <p className="text-slate-500 text-sm mb-1">Durum</p>
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${getStatusColor(
                      selectedRun.status
                    )}`}
                  >
                    {getStatusIcon(selectedRun.status)}
                    {selectedRun.status}
                  </span>
                </div>

                <div className="bg-slate-900/50 rounded-xl p-4">
                  <p className="text-slate-500 text-sm mb-1">Süre</p>
                  <p className="text-white font-medium">
                    {formatDuration(selectedRun.durationMs)}
                  </p>
                </div>

                <div className="bg-slate-900/50 rounded-xl p-4">
                  <p className="text-slate-500 text-sm mb-1">Ajan</p>
                  <p className="text-white font-medium">
                    {selectedRun.agent?.name || '-'}
                  </p>
                </div>

                <div className="bg-slate-900/50 rounded-xl p-4">
                  <p className="text-slate-500 text-sm mb-1">Başlangıç Zamanı</p>
                  <p className="text-white font-medium">
                    {new Date(selectedRun.startedAt).toLocaleString('tr-TR')}
                  </p>
                </div>
              </div>

              {/* Error Message */}
              {selectedRun.error && (
                <div className="bg-rose-600/10 border border-rose-500/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="text-rose-400 mt-1" size={20} />
                    <div className="flex-1">
                      <h3 className="text-rose-400 font-semibold mb-2">Hata Mesajı</h3>
                      <pre className="text-sm text-rose-300 whitespace-pre-wrap font-mono bg-rose-950/30 p-3 rounded-lg overflow-x-auto">
                        {selectedRun.error}
                      </pre>
                    </div>
                  </div>
                </div>
              )}

              {/* Test Results */}
              {selectedRun.testResults && selectedRun.testResults.length > 0 && (
                <div className="bg-slate-900/50 rounded-xl p-4">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <CheckCircle size={18} className="text-emerald-400" />
                    Test Sonuçları
                  </h3>
                  <div className="space-y-2">
                    {selectedRun.testResults.map((result, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-white text-sm">
                            {result.scenario?.name || `Test ${idx + 1}`}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              result.success
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-rose-500/10 text-rose-400'
                            }`}
                          >
                            {result.success ? 'PASSED' : 'FAILED'}
                          </span>
                        </div>
                        {result.error && (
                          <p className="text-rose-400 text-xs mt-2 font-mono">
                            {result.error}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Screenshots */}
              {selectedRun.screenshots && selectedRun.screenshots.length > 0 && (
                <div className="bg-slate-900/50 rounded-xl p-4">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <ImageIcon size={18} className="text-blue-400" />
                    Ekran Görüntüleri
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedRun.screenshots.map((screenshot, idx) => (
                      <div key={idx} className="bg-slate-800/50 rounded-lg p-2">
                        <img
                          src={screenshot.url}
                          alt={`Screenshot ${idx + 1}`}
                          className="w-full h-auto rounded-lg"
                        />
                        <p className="text-slate-400 text-xs mt-2 text-center">
                          {screenshot.name || `Ekran ${idx + 1}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Logs */}
              {selectedRun.logs && (
                <div className="bg-slate-900/50 rounded-xl p-4">
                  <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <FileText size={18} className="text-slate-400" />
                    Execution Logs
                  </h3>
                  <pre className="text-sm text-slate-300 whitespace-pre-wrap font-mono bg-slate-950/50 p-4 rounded-lg overflow-x-auto max-h-96">
                    {selectedRun.logs}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-slate-800 border-t border-slate-700 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Agent Button */}
      <button
        onClick={() => setShowAgentPanel(!showAgentPanel)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-full shadow-2xl flex items-center justify-center transition-all z-40 group"
      >
        {showAgentPanel ? (
          <X size={24} className="text-white" />
        ) : (
          <MessageCircle size={24} className="text-white group-hover:scale-110 transition-transform" />
        )}
      </button>

      {/* Agent Panel */}
      {showAgentPanel && (
        <div className="fixed bottom-28 right-8 w-96 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl z-40 overflow-hidden">
          {/* Panel Header */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold">Rapor Analisti</h3>
                <p className="text-white/80 text-xs">Test Raporlama Uzmanı</p>
              </div>
            </div>
          </div>

          {/* Panel Content */}
          <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
            {/* Agent Response */}
            {agentResponse && (
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700">
                <div className="flex items-start gap-3">
                  <Sparkles size={16} className="text-purple-400 mt-1 flex-shrink-0" />
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {agentResponse}
                  </p>
                </div>
              </div>
            )}

            {/* Suggested Questions */}
            {!agentResponse && (
              <div className="space-y-2">
                <p className="text-slate-500 text-xs font-medium">Önerilen Sorular:</p>
                {[
                  'Test sonuçlarımı analiz eder misin?',
                  'Başarısız testlerdeki ortak sorunlar neler?',
                  'Test performansımı nasıl iyileştirebilirim?'
                ].map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => setAgentQuestion(question)}
                    className="w-full text-left px-3 py-2 bg-slate-900/50 hover:bg-slate-900 border border-slate-700 rounded-lg text-slate-300 text-xs transition"
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-700 p-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={agentQuestion}
                onChange={(e) => setAgentQuestion(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && askAgent()}
                placeholder="Rapor hakkında soru sor..."
                disabled={agentLoading}
                className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 disabled:opacity-50"
              />
              <button
                onClick={askAgent}
                disabled={agentLoading || !agentQuestion.trim()}
                className="w-10 h-10 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 rounded-xl flex items-center justify-center transition disabled:cursor-not-allowed"
              >
                {agentLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send size={18} className="text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
