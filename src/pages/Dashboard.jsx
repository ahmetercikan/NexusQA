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
  Zap,
  Search,
  FileCode,
  TestTube,
  FolderOpen,
  FileText,
  Eye,
  Code,
  Loader2,
  StopCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLogUpdates, useAgentUpdates, useAutomationUpdates } from '../hooks/useWebSocket';
import { agentsAPI, projectsAPI, scenariosAPI, automationAPI } from '../services/api';
import { AgentCard, LiveConsole, StatCard } from '../components';

// Otomasyon adımları
const AUTOMATION_STEPS = [
  { id: 'init', label: 'Başlatılıyor', icon: Zap },
  { id: 'discover', label: 'Element Keşfi', icon: Search },
  { id: 'generate', label: 'Script Üretimi', icon: FileCode },
  { id: 'test', label: 'Test Koşumu', icon: TestTube },
  { id: 'complete', label: 'Tamamlandı', icon: CheckCircle },
];

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

  // Otomasyon state
  const [projects, setProjects] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedScenarios, setSelectedScenarios] = useState([]);
  const [automationRunning, setAutomationRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);
  const [workflowId, setWorkflowId] = useState(null);
  const [automationLogs, setAutomationLogs] = useState([]);
  const [discoveredElements, setDiscoveredElements] = useState([]);
  const [generatedScripts, setGeneratedScripts] = useState([]);
  const [testResults, setTestResults] = useState([]);
  const [showAutomationPanel, setShowAutomationPanel] = useState(false);

  const [recentActivities, setRecentActivities] = useState([
    { type: 'success', title: 'Login Modülü Testi', time: '2 dakika önce', agent: 'Agent Alpha' },
    { type: 'error', title: 'Ödeme Ağ Geçidi Timeout', time: '15 dakika önce', agent: 'SecBot Delta' },
  ]);

  // Projeleri yükle
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await projectsAPI.getAll();
        setProjects(data.projects || data || []);
      } catch (error) {
        console.error('Projects load error:', error);
      }
    };
    loadProjects();
  }, []);

  // Proje seçildiğinde senaryoları yükle
  useEffect(() => {
    if (selectedProject) {
      const loadScenarios = async () => {
        try {
          const data = await scenariosAPI.getAll({ projectId: selectedProject.id });
          setScenarios(data.scenarios || data || []);
        } catch (error) {
          console.error('Scenarios load error:', error);
        }
      };
      loadScenarios();
    } else {
      setScenarios([]);
    }
  }, [selectedProject]);

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

  // Otomasyon log ekleme
  const addAutomationLog = useCallback((type, message) => {
    setAutomationLogs((prev) => [
      { type, message, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 49),
    ]);
  }, []);

  // Otomasyon event handlers - hook içinde ref ile yönetiliyor
  const automationCallbacks = {
    onStarted: (data) => {
      setWorkflowId(data.workflowId);
      setCurrentStep('init');
      addAutomationLog('info', `Otomasyon başlatıldı: ${data.workflowId}`);
    },
    onStep: (data) => {
      setCurrentStep(data.step);
      addAutomationLog('info', `Adım: ${data.step} - ${data.message || ''}`);
    },
    onElement: (data) => {
      setDiscoveredElements((prev) => [...prev, data]);
      addAutomationLog('success', `Element keşfedildi: ${data.selector}`);
    },
    onScript: (data) => {
      setGeneratedScripts((prev) => [...prev, data]);
      addAutomationLog('success', `Script üretildi: ${data.scenarioTitle}`);
    },
    onTestStart: (data) => {
      addAutomationLog('info', `Test başladı: ${data.scenarioTitle}`);
    },
    onTestPass: (data) => {
      setTestResults((prev) => [...prev, { ...data, status: 'passed' }]);
      addAutomationLog('success', `Test başarılı: ${data.scenarioTitle}`);
    },
    onTestFail: (data) => {
      setTestResults((prev) => [...prev, { ...data, status: 'failed' }]);
      addAutomationLog('error', `Test başarısız: ${data.scenarioTitle} - ${data.error}`);
    },
    onCompleted: (data) => {
      setCurrentStep('complete');
      setAutomationRunning(false);
      addAutomationLog('success', `Otomasyon tamamlandı! Başarılı: ${data.passed}, Başarısız: ${data.failed}`);
    },
    onError: (data) => {
      setAutomationRunning(false);
      addAutomationLog('error', `Hata: ${data.error}`);
    },
  };

  // WebSocket subscriptions
  useAgentUpdates(handleAgentUpdate);
  useLogUpdates(handleNewLog);
  useAutomationUpdates(automationCallbacks);

  // Otomasyon başlat
  const startAutomation = async () => {
    if (!selectedProject) {
      addAutomationLog('error', 'Lütfen bir proje seçin');
      return;
    }

    if (selectedScenarios.length === 0) {
      addAutomationLog('error', 'Lütfen en az bir senaryo seçin');
      return;
    }

    setAutomationRunning(true);
    setCurrentStep('init');
    setAutomationLogs([]);
    setDiscoveredElements([]);
    setGeneratedScripts([]);
    setTestResults([]);

    try {
      const response = await automationAPI.start({
        projectId: selectedProject.id,
        scenarioIds: selectedScenarios.map((s) => s.id),
        runTests: true,
        headless: false,
      });

      setWorkflowId(response.workflowId);
      addAutomationLog('success', `Workflow başlatıldı: ${response.workflowId}`);
    } catch (error) {
      console.error('Automation start error:', error);
      addAutomationLog('error', `Başlatma hatası: ${error.message}`);
      setAutomationRunning(false);
    }
  };

  // Otomasyonu iptal et
  const cancelAutomation = async () => {
    if (workflowId) {
      try {
        await automationAPI.cancelWorkflow(workflowId);
        setAutomationRunning(false);
        addAutomationLog('info', 'Otomasyon iptal edildi');
      } catch (error) {
        console.error('Cancel error:', error);
      }
    }
  };

  // Start autonomous test (legacy)
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

  // Senaryo seçimi toggle
  const toggleScenarioSelection = (scenario) => {
    setSelectedScenarios((prev) => {
      const exists = prev.find((s) => s.id === scenario.id);
      if (exists) {
        return prev.filter((s) => s.id !== scenario.id);
      }
      return [...prev, scenario];
    });
  };

  // Tüm senaryoları seç/kaldır
  const toggleAllScenarios = () => {
    if (selectedScenarios.length === scenarios.length) {
      setSelectedScenarios([]);
    } else {
      setSelectedScenarios([...scenarios]);
    }
  };

  // Refresh data
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchStats]);

  // Adım durumunu hesapla
  const getStepStatus = (stepId) => {
    const stepIndex = AUTOMATION_STEPS.findIndex((s) => s.id === stepId);
    const currentIndex = AUTOMATION_STEPS.findIndex((s) => s.id === currentStep);

    if (currentIndex === -1) return 'pending';
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

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
            onClick={() => setShowAutomationPanel(!showAutomationPanel)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl font-medium transition-all border ${
              showAutomationPanel
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
            }`}
          >
            <Zap size={18} />
            <span>Otomasyon Paneli</span>
          </button>

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

      {/* Automation Panel */}
      {showAutomationPanel && (
        <div className="mb-8 bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Zap className="text-amber-500" size={20} />
              Tam Otomasyon İş Akışı
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              Senaryo seçin, element keşfi yapın, script üretin ve testleri çalıştırın
            </p>
          </div>

          <div className="grid grid-cols-12 gap-6 p-6">
            {/* Sol: Proje & Senaryo Seçimi */}
            <div className="col-span-4 space-y-4">
              {/* Proje Seçimi */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  <FolderOpen size={14} className="inline mr-1" />
                  Proje Seçin
                </label>
                <select
                  value={selectedProject?.id || ''}
                  onChange={(e) => {
                    const project = projects.find((p) => p.id === parseInt(e.target.value));
                    setSelectedProject(project);
                    setSelectedScenarios([]);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Proje seçin...</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Senaryo Seçimi */}
              {selectedProject && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-400">
                      <FileText size={14} className="inline mr-1" />
                      Senaryolar ({selectedScenarios.length}/{scenarios.length})
                    </label>
                    <button
                      onClick={toggleAllScenarios}
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      {selectedScenarios.length === scenarios.length ? 'Tümünü Kaldır' : 'Tümünü Seç'}
                    </button>
                  </div>
                  <div className="bg-slate-800 border border-slate-700 rounded-lg max-h-48 overflow-y-auto">
                    {scenarios.length === 0 ? (
                      <p className="p-3 text-sm text-slate-500 text-center">
                        Bu projede senaryo bulunamadı
                      </p>
                    ) : (
                      scenarios.map((scenario) => (
                        <label
                          key={scenario.id}
                          className="flex items-center gap-3 p-3 hover:bg-slate-700/50 cursor-pointer border-b border-slate-700 last:border-0"
                        >
                          <input
                            type="checkbox"
                            checked={selectedScenarios.some((s) => s.id === scenario.id)}
                            onChange={() => toggleScenarioSelection(scenario)}
                            className="rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white truncate">{scenario.title}</p>
                            <p className="text-xs text-slate-500">{scenario.steps?.length || 0} adım</p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Başlat/İptal Butonu */}
              <div className="pt-2">
                {automationRunning ? (
                  <button
                    onClick={cancelAutomation}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-600/20 border border-rose-500 text-rose-400 rounded-xl font-medium hover:bg-rose-600/30 transition-all"
                  >
                    <StopCircle size={18} />
                    Otomasyonu İptal Et
                  </button>
                ) : (
                  <button
                    onClick={startAutomation}
                    disabled={!selectedProject || selectedScenarios.length === 0}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all ${
                      !selectedProject || selectedScenarios.length === 0
                        ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-900/30'
                    }`}
                  >
                    <Zap size={18} />
                    Otomasyonu Başlat
                  </button>
                )}
              </div>
            </div>

            {/* Orta: İlerleme & Loglar */}
            <div className="col-span-4 space-y-4">
              {/* Progress Stepper */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-3">
                  İş Akışı İlerlemesi
                </label>
                <div className="space-y-2">
                  {AUTOMATION_STEPS.map((step) => {
                    const status = getStepStatus(step.id);
                    const Icon = step.icon;
                    return (
                      <div
                        key={step.id}
                        className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                          status === 'active'
                            ? 'bg-indigo-600/20 border border-indigo-500'
                            : status === 'completed'
                            ? 'bg-emerald-600/10'
                            : 'bg-slate-800/50'
                        }`}
                      >
                        <div
                          className={`p-1.5 rounded-lg ${
                            status === 'active'
                              ? 'bg-indigo-500 text-white'
                              : status === 'completed'
                              ? 'bg-emerald-500 text-white'
                              : 'bg-slate-700 text-slate-500'
                          }`}
                        >
                          {status === 'active' ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : status === 'completed' ? (
                            <CheckCircle size={16} />
                          ) : (
                            <Icon size={16} />
                          )}
                        </div>
                        <span
                          className={`text-sm ${
                            status === 'active'
                              ? 'text-indigo-400 font-medium'
                              : status === 'completed'
                              ? 'text-emerald-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {step.label}
                        </span>
                        {status === 'active' && (
                          <span className="ml-auto text-xs text-indigo-400 animate-pulse">
                            İşleniyor...
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Automation Logs */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Otomasyon Logları
                </label>
                <div className="bg-slate-950 border border-slate-800 rounded-lg h-40 overflow-y-auto p-2 font-mono text-xs">
                  {automationLogs.length === 0 ? (
                    <p className="text-slate-600 text-center py-4">Otomasyon başlatıldığında loglar burada görünecek</p>
                  ) : (
                    automationLogs.map((log, i) => (
                      <div key={i} className="flex items-start gap-2 py-1">
                        <span className="text-slate-600">{log.time}</span>
                        <span
                          className={
                            log.type === 'error'
                              ? 'text-rose-400'
                              : log.type === 'success'
                              ? 'text-emerald-400'
                              : 'text-slate-400'
                          }
                        >
                          {log.message}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Sağ: Sonuçlar */}
            <div className="col-span-4 space-y-4">
              {/* Keşfedilen Elementler */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  <Eye size={14} className="inline mr-1" />
                  Keşfedilen Elementler ({discoveredElements.length})
                </label>
                <div className="bg-slate-800 border border-slate-700 rounded-lg h-24 overflow-y-auto">
                  {discoveredElements.length === 0 ? (
                    <p className="text-slate-600 text-xs text-center py-4">Henüz element keşfedilmedi</p>
                  ) : (
                    <div className="p-2 space-y-1">
                      {discoveredElements.slice(0, 10).map((el, i) => (
                        <div key={i} className="text-xs text-slate-400 truncate">
                          <code className="text-emerald-400">{el.selector}</code>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Üretilen Scriptler */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  <Code size={14} className="inline mr-1" />
                  Üretilen Scriptler ({generatedScripts.length})
                </label>
                <div className="bg-slate-800 border border-slate-700 rounded-lg h-24 overflow-y-auto">
                  {generatedScripts.length === 0 ? (
                    <p className="text-slate-600 text-xs text-center py-4">Henüz script üretilmedi</p>
                  ) : (
                    <div className="p-2 space-y-1">
                      {generatedScripts.map((script, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <FileCode size={12} className="text-indigo-400" />
                          <span className="text-slate-400 truncate">{script.scenarioTitle}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Test Sonuçları */}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  <TestTube size={14} className="inline mr-1" />
                  Test Sonuçları ({testResults.filter((t) => t.status === 'passed').length}/
                  {testResults.length})
                </label>
                <div className="bg-slate-800 border border-slate-700 rounded-lg h-24 overflow-y-auto">
                  {testResults.length === 0 ? (
                    <p className="text-slate-600 text-xs text-center py-4">Henüz test koşulmadı</p>
                  ) : (
                    <div className="p-2 space-y-1">
                      {testResults.map((result, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          {result.status === 'passed' ? (
                            <CheckCircle size={12} className="text-emerald-400" />
                          ) : (
                            <XCircle size={12} className="text-rose-400" />
                          )}
                          <span
                            className={
                              result.status === 'passed' ? 'text-emerald-400' : 'text-rose-400'
                            }
                          >
                            {result.scenarioTitle}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
