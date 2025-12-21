import React, { useState } from 'react';
import {
  Zap,
  FolderOpen,
  FileText,
  Eye,
  Code,
  TestTube,
  CheckCircle,
  XCircle,
  Loader2,
  StopCircle,
  Play,
  X,
  Copy,
  Download,
  Sparkles,
  Settings,
} from 'lucide-react';
import { useAutomation } from '../context/AutomationContext';

// Otomasyon adımları - yalnızca koşum için
const AUTOMATION_STEPS = [
  { id: 'init', label: 'Başlatılıyor', icon: Zap },
  { id: 'test', label: 'Test Koşumu', icon: TestTube },
  { id: 'complete', label: 'Tamamlandı', icon: CheckCircle },
];

export default function AutomationPanel() {
  const {
    projects,
    scenarios,
    selectedProject,
    selectedScenarios,
    automationLogs,
    isRunning,
    currentStep,
    testResults,
    liveScreenshot,
    showCodePopup,
    selectedScript,
    testSettings,
    selectProject,
    toggleScenarioSelection,
    toggleAllScenarios,
    startAutomation,
    cancelAutomation,
    setShowCodePopup,
    setTestSettings,
  } = useAutomation();

  const [copySuccess, setCopySuccess] = useState(false);

  // Adım durumunu hesapla
  const getStepStatus = (stepId) => {
    const stepIndex = AUTOMATION_STEPS.findIndex(s => s.id === stepId);
    const currentIndex = AUTOMATION_STEPS.findIndex(s => s.id === currentStep);

    if (currentIndex === -1) return 'pending';
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  // Kodu kopyala
  const copyCode = async () => {
    if (selectedScript?.script) {
      try {
        await navigator.clipboard.writeText(selectedScript.script);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Copy failed:', err);
      }
    }
  };

  // Kodu indir
  const downloadCode = () => {
    if (selectedScript?.script) {
      const blob = new Blob([selectedScript.script], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedScript.filename || 'test-script.spec.js';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Zap className="text-amber-500" size={28} />
            Otomasyon Paneli
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Senaryoları otomatik olarak çalıştırın ve test edin
          </p>
        </div>
        {isRunning && (
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <Loader2 size={16} className="animate-spin text-amber-500" />
            <span className="text-amber-400 text-sm font-medium">Çalışıyor...</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Configuration */}
        <div className="lg:col-span-3 space-y-6">
          {/* Project Selection */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FolderOpen size={18} className="text-blue-400" />
              Proje Seçimi
            </h2>
            <select
              value={selectedProject?.id || ''}
              onChange={(e) => {
                const proj = projects.find((p) => p.id === parseInt(e.target.value));
                selectProject(proj || null);
              }}
              disabled={isRunning}
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="">Proje seçin...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Scenario Selection */}
          {selectedProject && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FileText size={18} className="text-indigo-400" />
                  Senaryolar
                </h2>
                {scenarios.length > 0 && !isRunning && (
                  <button
                    onClick={toggleAllScenarios}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    {selectedScenarios.length === scenarios.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {scenarios.length === 0 ? (
                  <p className="text-slate-500 text-sm">Senaryo bulunamadı</p>
                ) : (
                  scenarios.map((scenario) => (
                    <label key={scenario.id} className="flex items-center space-x-3 p-3 bg-slate-900/50 rounded-lg hover:bg-slate-900 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={selectedScenarios.some((s) => s.id === scenario.id)}
                        onChange={() => toggleScenarioSelection(scenario)}
                        disabled={isRunning}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 disabled:opacity-50"
                      />
                      <span className="text-sm text-slate-300 truncate">{scenario.title}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Test Settings */}
          {selectedProject && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Settings size={18} className="text-purple-400" />
                Test Ayarları
              </h2>

              <div className="space-y-4">
                {/* Browser Selection */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Tarayıcı</label>
                  <select
                    value={testSettings.browser}
                    onChange={(e) => setTestSettings({ ...testSettings, browser: e.target.value })}
                    disabled={isRunning}
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                  >
                    <option value="chromium">Chrome/Chromium</option>
                    <option value="firefox">Firefox</option>
                    <option value="webkit">Safari/WebKit</option>
                  </select>
                </div>

                {/* Headless Mode */}
                <div className="flex items-center justify-between">
                  <label className="text-sm text-slate-400">Headless Mod</label>
                  <button
                    onClick={() => setTestSettings({ ...testSettings, headless: !testSettings.headless })}
                    disabled={isRunning}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${
                      testSettings.headless ? 'bg-purple-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        testSettings.headless ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Slow Motion */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Yavaş Hareket (ms): {testSettings.slowMo}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    step="50"
                    value={testSettings.slowMo}
                    onChange={(e) => setTestSettings({ ...testSettings, slowMo: parseInt(e.target.value) })}
                    disabled={isRunning}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 accent-purple-600"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>Hızlı</span>
                    <span>Yavaş</span>
                  </div>
                </div>

                {/* Max Concurrent Tests */}
                <div>
                  <label className="block text-sm text-slate-400 mb-2">
                    Eş Zamanlı Test Limiti: {testSettings.maxConcurrent}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={testSettings.maxConcurrent}
                    onChange={(e) => setTestSettings({ ...testSettings, maxConcurrent: parseInt(e.target.value) })}
                    disabled={isRunning}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 accent-purple-600"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>1</span>
                    <span>5</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Start/Cancel Button */}
          {isRunning ? (
            <button
              onClick={cancelAutomation}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-rose-600/20 border border-rose-500 text-rose-400 rounded-xl font-bold hover:bg-rose-600/30 transition"
            >
              <StopCircle size={20} />
              <span>İptal Et</span>
            </button>
          ) : (
            <button
              onClick={startAutomation}
              disabled={!selectedProject || selectedScenarios.length === 0}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-bold transition shadow-lg shadow-amber-900/30 disabled:shadow-none"
            >
              <Play size={20} />
              <span>Testleri Çalıştır</span>
            </button>
          )}

          {/* Progress Steps */}
          {currentStep && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-slate-400 mb-4">İlerleme</h3>
              <div className="space-y-2">
                {AUTOMATION_STEPS.map((step) => {
                  const status = getStepStatus(step.id);
                  const Icon = step.icon;
                  return (
                    <div
                      key={step.id}
                      className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                        status === 'active' && step.id === 'complete'
                          ? 'bg-emerald-600/20 border border-emerald-500'
                          : status === 'active'
                          ? 'bg-indigo-600/20 border border-indigo-500'
                          : status === 'completed'
                          ? 'bg-emerald-600/10'
                          : 'bg-slate-900/30'
                      }`}
                    >
                      <div
                        className={`p-1.5 rounded-lg ${
                          status === 'active' && step.id === 'complete'
                            ? 'bg-emerald-500 text-white'
                            : status === 'active'
                            ? 'bg-indigo-500 text-white'
                            : status === 'completed'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-700 text-slate-500'
                        }`}
                      >
                        {status === 'active' && step.id === 'complete' ? (
                          <CheckCircle size={14} />
                        ) : status === 'active' ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : status === 'completed' ? (
                          <CheckCircle size={14} />
                        ) : (
                          <Icon size={14} />
                        )}
                      </div>
                      <span className={`text-xs ${
                        status === 'active' && step.id === 'complete' ? 'text-emerald-400 font-medium' :
                        status === 'active' ? 'text-indigo-400 font-medium' :
                        status === 'completed' ? 'text-emerald-400' : 'text-slate-500'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Middle: Logs */}
        <div className="lg:col-span-5 space-y-6">
          {/* Browser Live Preview */}
          {isRunning && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Eye size={20} className="text-cyan-400" />
                Canlı Tarayıcı Görünümü
              </h2>

              <div className="relative bg-black rounded-lg overflow-hidden aspect-video border border-slate-600">
                {liveScreenshot ? (
                  <img
                    src={`data:image/png;base64,${liveScreenshot}`}
                    alt="Browser screenshot"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Loader2 size={32} className="animate-spin text-slate-600 mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">Screenshot bekleniyor...</p>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-500 mt-2">
                Test çalışırken browser otomatik olarak güncellenir
              </p>
            </div>
          )}

          {/* Logs */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 h-full">
            <h2 className="text-lg font-semibold text-white mb-4">Loglar</h2>
            <div className="bg-black/50 rounded-lg p-4 h-[500px] overflow-y-auto space-y-1 font-mono text-xs">
              {automationLogs.map((log, idx) => (
                <div key={idx} className="flex space-x-3">
                  <span className="text-slate-600 shrink-0">[{log.time}]</span>
                  <span
                    className={`${
                      log.type === 'error'
                        ? 'text-red-400'
                        : log.type === 'success'
                        ? 'text-green-400'
                        : log.type === 'warning'
                        ? 'text-yellow-400'
                        : 'text-blue-400'
                    }`}
                  >
                    {log.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Test Results Only */}
        <div className="lg:col-span-4 space-y-6">
          {/* Test Results */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TestTube size={18} className="text-emerald-400" />
              Test Sonuçları ({testResults.filter(t => t.status === 'passed').length}/{testResults.length})
            </h2>
            <div className="bg-slate-900/50 rounded-lg h-96 overflow-y-auto p-4 space-y-2">
              {testResults.length === 0 ? (
                <p className="text-slate-600 text-sm text-center py-8">Test henüz koşulmadı</p>
              ) : (
                <div className="space-y-2">
                  {testResults.map((result, i) => (
                    <div
                      key={i}
                      className={`flex items-start gap-3 p-3 rounded-lg border ${
                        result.status === 'passed'
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-rose-500/10 border-rose-500/30'
                      }`}
                    >
                      {result.status === 'passed' ? (
                        <CheckCircle size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${
                          result.status === 'passed' ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {result.scenarioTitle || result.title || `Test ${i + 1}`}
                        </p>
                        {result.duration && (
                          <p className="text-xs text-slate-500">⏱️ {(result.duration / 1000).toFixed(2)}s</p>
                        )}
                        {result.error && (
                          <p className="text-xs text-rose-300 mt-1">{result.error}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Kod Görüntüleme Popup */}
      {showCodePopup && selectedScript && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
            {/* Popup Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-500/20 rounded-lg">
                  <Code size={20} className="text-violet-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    {selectedScript.scenarioTitle || 'Test Script'}
                    {selectedScript.generatedByAI && (
                      <span className="flex items-center gap-1 text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                        <Sparkles size={10} />
                        AI ile üretildi
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-slate-400">{selectedScript.filename}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyCode}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition ${
                    copySuccess
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <Copy size={14} />
                  {copySuccess ? 'Kopyalandı!' : 'Kopyala'}
                </button>
                <button
                  onClick={downloadCode}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-lg text-sm transition"
                >
                  <Download size={14} />
                  İndir
                </button>
                <button
                  onClick={() => setShowCodePopup(false)}
                  className="p-2 hover:bg-slate-800 rounded-lg transition text-slate-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Kod İçeriği */}
            <div className="flex-1 overflow-auto p-4">
              <pre className="bg-slate-950 border border-slate-800 rounded-lg p-4 overflow-auto text-sm font-mono">
                <code className="text-slate-300 whitespace-pre-wrap">
                  {selectedScript.script || 'Kod yükleniyor...'}
                </code>
              </pre>
            </div>

            {/* Popup Footer */}
            <div className="p-4 border-t border-slate-700 flex justify-between items-center">
              <div className="text-xs text-slate-500">
                {selectedScript.filePath && (
                  <span>Dosya: {selectedScript.filePath}</span>
                )}
              </div>
              <button
                onClick={() => setShowCodePopup(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
