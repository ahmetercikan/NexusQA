/**
 * Automation Context
 * Otomasyon paneli durumunu global olarak yönetir
 * Sayfa değişikliklerinde state korunur
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { projectsAPI, scenariosAPI, automationAPI } from '../services/api';
import { useWebSocket } from './WebSocketContext';

const AutomationContext = createContext(null);

export function AutomationProvider({ children }) {
  // Temel state
  const [projects, setProjects] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedScenarios, setSelectedScenarios] = useState([]);
  const [automationLogs, setAutomationLogs] = useState([]);

  // Otomasyon durumu
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);
  const [workflowId, setWorkflowId] = useState(null);
  const [testResults, setTestResults] = useState([]);

  // Browser preview
  const [liveScreenshot, setLiveScreenshot] = useState(null);

  // Script popup
  const [showCodePopup, setShowCodePopup] = useState(false);
  const [selectedScript, setSelectedScript] = useState(null);

  // İlk yükleme yapıldı mı?
  const [initialized, setInitialized] = useState(false);

  const pollingRef = useRef(null);
  const { socket } = useWebSocket();

  // Log ekleme fonksiyonu
  const addLog = useCallback((type, message) => {
    setAutomationLogs((prev) => [
      { type, message, time: new Date().toLocaleTimeString() },
      ...prev.slice(0, 99),
    ]);
  }, []);

  // İlk yüklemede projeleri getir (sadece bir kez)
  useEffect(() => {
    if (initialized) return;

    const loadProjects = async () => {
      try {
        const data = await projectsAPI.getAll();
        const projectsList = Array.isArray(data) ? data : data.projects || data.data || [];
        setProjects(projectsList);

        // Sadece ilk yüklemede log bas
        if (automationLogs.length === 0) {
          addLog('info', 'Otomasyon paneli hazır');
          addLog('success', `${projectsList.length} proje yüklendi`);
        }

        setInitialized(true);
      } catch (error) {
        console.error('Projects load error:', error);
        addLog('error', 'Projeler yüklenemedi');
      }
    };

    loadProjects();
  }, [initialized, automationLogs.length, addLog]);

  // Proje değiştiğinde senaryoları yükle
  useEffect(() => {
    if (!selectedProject) {
      setScenarios([]);
      return;
    }

    const loadScenarios = async () => {
      try {
        // Sadece otomatikleştirilmiş senaryoları getir
        const data = await scenariosAPI.getAll({ projectId: selectedProject.id, isAutomated: true });
        const allScenarios = Array.isArray(data) ? data : data.scenarios || data.data || [];
        // Frontend tarafında da filtrele (API filtrelemezse diye)
        const automatedScenarios = allScenarios.filter(s => s.isAutomated === true);
        setScenarios(automatedScenarios);
        addLog('success', `${automatedScenarios.length} otomatik senaryo yüklendi`);
      } catch (error) {
        console.error('Scenarios load error:', error);
        addLog('error', 'Senaryolar yüklenemedi');
      }
    };

    loadScenarios();
  }, [selectedProject?.id, addLog]);

  // Workflow durumunu polling ile kontrol et
  const pollWorkflowStatus = useCallback(async (wfId) => {
    try {
      const response = await automationAPI.getWorkflowStatus(wfId);
      const status = response.data || response;

      if (!status) {
        throw new Error('Invalid response format');
      }

      if (status.currentStep) {
        setCurrentStep(status.currentStep);
      }

      // Test results WebSocket event'lerinden geliyor, override etme!
      // Backend status'undaki testResults eski olabilir
      // if (status.testResults && status.testResults.length > 0) {
      //   setTestResults(status.testResults);
      // }

      // Durum kontrolü
      if (status.status === 'COMPLETED' || status.status === 'completed') {
        setCurrentStep('complete');
        setIsRunning(false);
        const skippedMsg = status.skippedCount > 0 ? `, Atlanan: ${status.skippedCount}` : '';
        addLog('success', `Otomasyon tamamlandı! Başarılı: ${status.successCount || status.passed || 0}, Başarısız: ${status.failCount || status.failed || 0}${skippedMsg}`);
      } else if (status.status === 'FAILED' || status.status === 'failed' || status.status === 'ERROR') {
        setIsRunning(false);
        addLog('error', `Hata: ${status.error || 'Bilinmeyen hata'}`);
      } else if (status.status === 'RUNNING' || status.status === 'running' || status.status === 'PENDING') {
        pollingRef.current = setTimeout(() => pollWorkflowStatus(wfId), 2000);
      }
    } catch (error) {
      console.error('Status check error:', error);
      addLog('warning', `Durum kontrolü başarısız, tekrar deneniyor...`);
      if (isRunning) {
        pollingRef.current = setTimeout(() => pollWorkflowStatus(wfId), 3000);
      }
    }
  }, [isRunning, addLog]);

  // WebSocket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.emit('subscribe:automation');

    const handleScriptGenerated = (data) => {
      addLog('info', `Script hazır: ${data.scenarioTitle} ${data.generatedByAI ? '(AI)' : '(Template)'}`);
    };

    const handleTestResult = (data) => {
      const resultType = data.success ? 'success' : 'error';
      addLog(resultType, `Test ${data.success ? 'PASSED' : 'FAILED'}: ${data.scenarioTitle}`);

      setTestResults((prev) => [...prev, {
        scenarioId: data.scenarioId,
        scenarioTitle: data.scenarioTitle,
        status: data.success ? 'passed' : 'failed',
        duration: data.duration,
        error: data.error
      }]);
    };

    const handleAutomationStep = (data) => {
      if (data.step) setCurrentStep(data.step);
      if (data.message) addLog('info', data.message);
    };

    const handleNewLog = (log) => {
      if (log.message) {
        const logType = log.level === 'ERROR' ? 'error' :
                       log.level === 'SUCCESS' ? 'success' :
                       log.level === 'WARNING' ? 'warning' : 'info';
        addLog(logType, log.message);
      }
    };

    const handleBrowserScreenshot = (data) => {
      if (data.screenshot) {
        setLiveScreenshot(data.screenshot);
      }
    };

    const handleTestPass = (data) => {
      // Senaryo listesini güncelle - test başarılı
      if (data.scenario) {
        setScenarios(prev => prev.map(s =>
          s.id === data.scenarioId ? { ...s, ...data.scenario } : s
        ));
        // Test sonuçlarını da güncelle
        setTestResults(prev => {
          const existing = prev.find(t => t.scenarioId === data.scenarioId);
          if (existing) {
            return prev.map(t =>
              t.scenarioId === data.scenarioId
                ? { ...t, status: 'passed', duration: data.duration }
                : t
            );
          }
          return [...prev, {
            scenarioId: data.scenarioId,
            title: data.scenarioTitle,
            status: 'passed',
            duration: data.duration
          }];
        });
        addLog('success', `✓ ${data.scenarioTitle} - PASSED (${data.duration}ms)`);
      }
    };

    const handleTestFail = (data) => {
      // Senaryo listesini güncelle - test başarısız
      if (data.scenario) {
        setScenarios(prev => prev.map(s =>
          s.id === data.scenarioId ? { ...s, ...data.scenario } : s
        ));
        // Test sonuçlarını da güncelle
        setTestResults(prev => {
          const existing = prev.find(t => t.scenarioId === data.scenarioId);
          if (existing) {
            return prev.map(t =>
              t.scenarioId === data.scenarioId
                ? { ...t, status: 'failed', duration: data.duration, error: data.error }
                : t
            );
          }
          return [...prev, {
            scenarioId: data.scenarioId,
            title: data.scenarioTitle,
            status: 'failed',
            duration: data.duration,
            error: data.error
          }];
        });
        addLog('error', `✗ ${data.scenarioTitle} - FAILED (${data.duration}ms)`);
      }
    };

    socket.on('script:generated', handleScriptGenerated);
    socket.on('test:run:result', handleTestResult);
    socket.on('automation:step', handleAutomationStep);
    socket.on('log:new', handleNewLog);
    socket.on('browser:screenshot', handleBrowserScreenshot);
    socket.on('automation:test:pass', handleTestPass);
    socket.on('automation:test:fail', handleTestFail);

    return () => {
      socket.off('script:generated', handleScriptGenerated);
      socket.off('test:run:result', handleTestResult);
      socket.off('automation:step', handleAutomationStep);
      socket.off('log:new', handleNewLog);
      socket.off('browser:screenshot', handleBrowserScreenshot);
      socket.off('automation:test:pass', handleTestPass);
      socket.off('automation:test:fail', handleTestFail);
    };
  }, [socket, addLog]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }
    };
  }, []);

  // Senaryo seçimi toggle
  const toggleScenarioSelection = useCallback((scenario) => {
    setSelectedScenarios((prev) => {
      const exists = prev.find((s) => s.id === scenario.id);
      if (exists) {
        return prev.filter((s) => s.id !== scenario.id);
      }
      return [...prev, scenario];
    });
  }, []);

  // Tüm senaryoları seç/kaldır
  const toggleAllScenarios = useCallback(() => {
    if (selectedScenarios.length === scenarios.length) {
      setSelectedScenarios([]);
    } else {
      setSelectedScenarios([...scenarios]);
    }
  }, [selectedScenarios.length, scenarios]);

  // Proje seç
  const selectProject = useCallback((project) => {
    setSelectedProject(project);
    setSelectedScenarios([]);
  }, []);

  // Otomasyon başlat
  const startAutomation = useCallback(async () => {
    if (!selectedProject) {
      addLog('error', 'Lütfen bir proje seçin');
      return;
    }

    if (selectedScenarios.length === 0) {
      addLog('error', 'Lütfen en az bir senaryo seçin');
      return;
    }

    setIsRunning(true);
    setCurrentStep('init');
    setTestResults([]);
    setLiveScreenshot(null);

    addLog('info', 'Otomasyon başlatılıyor...');
    addLog('info', `Proje: ${selectedProject.name}`);
    addLog('info', `${selectedScenarios.length} senaryo seçildi`);

    try {
      const response = await automationAPI.start({
        projectId: selectedProject.id,
        scenarioIds: selectedScenarios.map(s => s.id),
        runTests: true,
        skipElementDiscovery: false,
        skipScriptGeneration: false,
        headless: false,
      });

      const data = response.data || response;
      setWorkflowId(data.workflowId);
      addLog('success', `Workflow başlatıldı: ${data.workflowId}`);

      pollingRef.current = setTimeout(() => pollWorkflowStatus(data.workflowId), 1500);
    } catch (error) {
      console.error('Automation start error:', error);
      addLog('error', `Başlatma hatası: ${error.response?.data?.error || error.message}`);
      setIsRunning(false);
    }
  }, [selectedProject, selectedScenarios, addLog, pollWorkflowStatus]);

  // Otomasyonu iptal et
  const cancelAutomation = useCallback(async () => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
    }

    if (workflowId) {
      try {
        await automationAPI.cancelWorkflow(workflowId);
        addLog('info', 'Otomasyon iptal edildi');
      } catch (error) {
        console.error('Cancel error:', error);
      }
    }

    setIsRunning(false);
    setCurrentStep(null);
    setLiveScreenshot(null);
  }, [workflowId, addLog]);

  // Projeleri yenile (manual refresh için)
  const refreshProjects = useCallback(async () => {
    try {
      const data = await projectsAPI.getAll();
      const projectsList = Array.isArray(data) ? data : data.projects || data.data || [];
      setProjects(projectsList);
      addLog('success', `${projectsList.length} proje yüklendi`);
    } catch (error) {
      addLog('error', 'Projeler yüklenemedi');
    }
  }, [addLog]);

  // Senaryoyu otomasyon kuyruğuna ekle (dışarıdan çağrılabilir)
  const addScenarioToQueue = useCallback(async (scenario, project) => {
    // Sadece otomatikleştirilmiş senaryolar eklenebilir
    if (!scenario.isAutomated) {
      addLog('warning', `"${scenario.title}" henüz otomatikleştirilmemiş`);
      return;
    }

    // Proje seçili değilse veya farklıysa, projeyi seç
    if (!selectedProject || selectedProject.id !== project.id) {
      setSelectedProject(project);

      // Projenin otomatikleştirilmiş senaryolarını yükle
      try {
        const data = await scenariosAPI.getAll({ projectId: project.id, isAutomated: true });
        const allScenarios = Array.isArray(data) ? data : data.scenarios || data.data || [];
        const automatedScenarios = allScenarios.filter(s => s.isAutomated === true);
        setScenarios(automatedScenarios);
      } catch (error) {
        console.error('Scenarios load error:', error);
      }
    }

    // Senaryoyu seçili listeye ekle (zaten yoksa)
    setSelectedScenarios(prev => {
      const exists = prev.find(s => s.id === scenario.id);
      if (exists) return prev;
      return [...prev, scenario];
    });

    addLog('info', `"${scenario.title}" otomasyon kuyruğuna eklendi`);
  }, [selectedProject, addLog]);

  const value = {
    // State
    projects,
    scenarios,
    selectedProject,
    selectedScenarios,
    automationLogs,
    isRunning,
    currentStep,
    workflowId,
    testResults,
    liveScreenshot,
    showCodePopup,
    selectedScript,
    initialized,

    // Actions
    selectProject,
    toggleScenarioSelection,
    toggleAllScenarios,
    startAutomation,
    cancelAutomation,
    addLog,
    refreshProjects,
    addScenarioToQueue,
    setShowCodePopup,
    setSelectedScript,
    setLiveScreenshot,
  };

  return (
    <AutomationContext.Provider value={value}>
      {children}
    </AutomationContext.Provider>
  );
}

export function useAutomation() {
  const context = useContext(AutomationContext);
  if (!context) {
    throw new Error('useAutomation must be used within an AutomationProvider');
  }
  return context;
}
