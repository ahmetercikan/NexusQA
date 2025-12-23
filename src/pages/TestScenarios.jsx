import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { scenariosAPI, testSuitesAPI, projectsAPI } from '../services/api';
import Modal from '../components/Modal';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { useAutomation } from '../context/AutomationContext';

/**
 * Test Scenarios Page
 * Create and manage test scenarios (manual and from documents)
 */
export default function TestScenarios() {
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const { addScenarioToQueue } = useAutomation();
  const [scenarios, setScenarios] = useState([]);
  const [suites, setSuites] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [automatingIds, setAutomatingIds] = useState(new Set()); // Track automation progress
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filterProjectId, setFilterProjectId] = useState('');
  const [filterSuiteId, setFilterSuiteId] = useState('');
  const [filterAutomated, setFilterAutomated] = useState('all');
  const [automationMessage, setAutomationMessage] = useState(null); // For feedback messages

  // Form state (used for both create and edit)
  const [formData, setFormData] = useState({
    suiteId: '',
    title: '',
    description: '',
    steps: [''],
    expectedResult: '',
    preconditions: '',
    testData: {},
    priority: 'MEDIUM',
  });

  // Load data on mount
  useEffect(() => {
    loadScenarios();
    loadSuites();
    loadProjects();
  }, []);

  // Load suites when project filter changes
  useEffect(() => {
    if (filterProjectId) {
      loadSuites(filterProjectId);
      setFilterSuiteId(''); // Reset suite selection when project changes
    } else {
      loadSuites(); // Load all suites when no project selected
    }
  }, [filterProjectId]);

  // Load scenarios when filter changes
  useEffect(() => {
    loadScenarios();
    setSelectedIds([]); // Clear selection when filters change
  }, [filterSuiteId, filterAutomated, filterProjectId]);

  const loadScenarios = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterSuiteId) params.suiteId = filterSuiteId;
      if (filterAutomated !== 'all') {
        params.isAutomated = filterAutomated === 'true';
      }
      const response = await scenariosAPI.getAll(params);
      setScenarios(response.scenarios || []);
    } catch (error) {
      console.error('Failed to load scenarios:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSuites = async (projectId = null) => {
    try {
      const params = {};
      if (projectId) params.projectId = projectId;
      const response = await testSuitesAPI.getAll(params);
      console.log('Suites loaded:', response, 'for projectId:', projectId);
      setSuites(response.data || response || []);
    } catch (error) {
      console.error('Failed to load suites:', error);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      console.log('Projects loaded:', response);
      setProjects(response.data || response.projects || response || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleStepChange = (index, value) => {
    const newSteps = [...formData.steps];
    newSteps[index] = value;
    setFormData((prev) => ({
      ...prev,
      steps: newSteps,
    }));
  };

  const addStep = () => {
    setFormData((prev) => ({
      ...prev,
      steps: [...prev.steps, ''],
    }));
  };

  const removeStep = (index) => {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }));
  };

  const handleCreateScenario = async () => {
    if (!formData.suiteId || !formData.title) {
      toast.warning('Lütfen test suite ve başlık doldurunuz');
      return;
    }

    try {
      const stepObjects = formData.steps
        .filter((s) => s.trim())
        .map((s, i) => ({
          number: i + 1,
          description: s,
        }));

      const payload = {
        suiteId: parseInt(formData.suiteId),
        title: formData.title,
        description: formData.description || null,
        steps: stepObjects.length > 0 ? stepObjects : null,
        expectedResult: formData.expectedResult || null,
        preconditions: formData.preconditions || null,
        testData: Object.keys(formData.testData).length > 0 ? formData.testData : null,
        priority: formData.priority,
      };

      await scenariosAPI.create(payload);
      setShowCreateModal(false);
      resetForm();
      await loadScenarios();
      toast.success('Senaryo başarıyla oluşturuldu');
    } catch (error) {
      console.error('Create error:', error);
      toast.error('Senaryo oluşturulurken hata oluştu');
    }
  };

  const resetForm = () => {
    setFormData({
      suiteId: '',
      title: '',
      description: '',
      steps: [''],
      expectedResult: '',
      preconditions: '',
      testData: {},
      priority: 'MEDIUM',
    });
  };

  const handleViewScenario = async (scenarioId) => {
    try {
      const response = await scenariosAPI.getById(scenarioId);
      setSelectedScenario(response.scenario);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Failed to load scenario:', error);
      toast.error('Senaryo detayları yüklenemedi');
    }
  };

  const handleDeleteScenario = async (scenarioId) => {
    const confirmed = await confirm({
      title: 'Senaryoyu Sil',
      message: 'Bu senaryoyu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      type: 'danger',
      confirmText: 'Sil',
      cancelText: 'İptal',
    });

    if (!confirmed) return;

    try {
      await scenariosAPI.delete(scenarioId);
      setScenarios(scenarios.filter((s) => s.id !== scenarioId));
      setShowDetailModal(false);
      toast.success('Senaryo başarıyla silindi');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Senaryo silinirken hata oluştu');
    }
  };

  const handleAutomate = async (scenarioId, automationType, addToQueue = false) => {
    // Add to automating set
    setAutomatingIds(prev => new Set([...prev, scenarioId]));
    setAutomationMessage(null);

    try {
      console.log(`[TestScenarios] Otomasyon başlatılıyor: ${scenarioId} (${automationType})`);

      const response = await scenariosAPI.automate(scenarioId, { automationType });

      console.log(`[TestScenarios] Otomasyon tamamlandı:`, response);

      // Refresh scenarios list
      await loadScenarios();

      // Show success message
      setAutomationMessage({
        type: 'success',
        text: `✓ "${response.scenario.title}" senaryosu başarıyla otomatikleştirildi!`,
      });

      // Clear message after 5 seconds
      setTimeout(() => setAutomationMessage(null), 5000);

      // If detail modal is open, refresh the selected scenario too
      if (showDetailModal && selectedScenario && selectedScenario.id === scenarioId) {
        const updated = await scenariosAPI.getById(scenarioId);
        setSelectedScenario(updated.scenario);
      }

      // Senaryoyu otomasyon kuyruğuna ekle ve panele yönlendir
      if (addToQueue && response.scenario) {
        // Senaryonun projesini bul
        const scenario = response.scenario;
        const suite = suites.find(s => s.id === scenario.suiteId);
        const project = projects.find(p => p.id === suite?.projectId);

        if (project) {
          await addScenarioToQueue(scenario, project);
          toast.success('Senaryo otomasyon kuyruğuna eklendi. Otomasyon paneline yönlendiriliyorsunuz...');
          setTimeout(() => navigate('/automation'), 1500);
        }
      }
    } catch (error) {
      console.error('[TestScenarios] Otomasyon hatası:', error);

      setAutomationMessage({
        type: 'error',
        text: `✗ Otomasyon başarısız: ${error.details || error.message || 'Bilinmeyen hata'}`,
      });

      // Clear message after 5 seconds
      setTimeout(() => setAutomationMessage(null), 5000);
    } finally {
      // Remove from automating set
      setAutomatingIds(prev => {
        const updated = new Set(prev);
        updated.delete(scenarioId);
        return updated;
      });
    }
  };

  // Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(scenarios.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      toast.warning('Lütfen silmek istediğiniz senaryoları seçin');
      return;
    }

    const confirmed = await confirm({
      title: 'Toplu Silme',
      message: `${selectedIds.length} senaryoyu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      type: 'danger',
      confirmText: 'Tümünü Sil',
      cancelText: 'İptal',
    });

    if (!confirmed) return;

    try {
      for (const id of selectedIds) {
        await scenariosAPI.delete(id);
      }
      setSelectedIds([]);
      await loadScenarios();
      toast.success(`${selectedIds.length} senaryo başarıyla silindi`);
    } catch (error) {
      console.error('Bulk delete error:', error);
      toast.error('Senaryolar silinirken hata oluştu');
    }
  };

  // Edit scenario
  const handleEditScenario = async (scenario) => {
    // Load full scenario details
    try {
      const response = await scenariosAPI.getById(scenario.id);
      const fullScenario = response.scenario;

      // Convert steps to string array for form
      const stepsArray = fullScenario.steps?.map((step) =>
        typeof step === 'string' ? step : step.description || step.action || step.text || ''
      ) || [''];

      setFormData({
        suiteId: fullScenario.suite?.id?.toString() || '',
        title: fullScenario.title || '',
        description: fullScenario.description || '',
        steps: stepsArray.length > 0 ? stepsArray : [''],
        expectedResult: fullScenario.expectedResult || '',
        preconditions: fullScenario.preconditions || '',
        testData: fullScenario.testData || {},
        priority: fullScenario.priority || 'MEDIUM',
      });
      setSelectedScenario(fullScenario);
      setShowEditModal(true);
    } catch (error) {
      console.error('Failed to load scenario for edit:', error);
      toast.error('Senaryo yüklenemedi');
    }
  };

  const handleUpdateScenario = async () => {
    if (!formData.title) {
      toast.warning('Lütfen başlık doldurunuz');
      return;
    }

    try {
      const stepObjects = formData.steps
        .filter((s) => s.trim())
        .map((s, i) => ({
          number: i + 1,
          description: s,
        }));

      const payload = {
        title: formData.title,
        description: formData.description || null,
        steps: stepObjects.length > 0 ? stepObjects : null,
        expectedResult: formData.expectedResult || null,
        preconditions: formData.preconditions || null,
        testData: Object.keys(formData.testData).length > 0 ? formData.testData : null,
        priority: formData.priority,
      };

      await scenariosAPI.update(selectedScenario.id, payload);
      setShowEditModal(false);
      resetForm();
      await loadScenarios();
      toast.success('Senaryo başarıyla güncellendi');
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Senaryo güncellenirken hata oluştu');
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'CRITICAL':
        return 'text-red-400 bg-red-500/20';
      case 'HIGH':
        return 'text-orange-400 bg-orange-500/20';
      case 'MEDIUM':
        return 'text-yellow-400 bg-yellow-500/20';
      case 'LOW':
        return 'text-green-400 bg-green-500/20';
      default:
        return 'text-slate-400 bg-slate-500/20';
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Test Senaryoları</h1>
          <p className="text-slate-400 text-sm mt-1">
            Yeni senaryolar oluşturun ve otomatik kod üretin
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition"
        >
          <Plus size={20} />
          <span>Yeni Senaryo</span>
        </button>
      </div>

      {/* Automation Message */}
      {automationMessage && (
        <div className={`mb-6 px-4 py-3 rounded-xl border backdrop-blur transition ${
          automationMessage.type === 'success'
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          {automationMessage.text}
        </div>
      )}

      {/* Filters */}
      <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-4">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Proje
            </label>
            <select
              value={filterProjectId}
              onChange={(e) => setFilterProjectId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tüm Projeler</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Test Suite
            </label>
            <select
              value={filterSuiteId}
              onChange={(e) => setFilterSuiteId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tüm Suiteler</option>
              {suites.map((suite) => (
                <option key={suite.id} value={suite.id}>
                  {suite.name} ({suite.type})
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Otomasyon Durumu
            </label>
            <select
              value={filterAutomated}
              onChange={(e) => setFilterAutomated(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tümü</option>
              <option value="true">Otomasyonu Yapılanlar</option>
              <option value="false">Otomasyonu Yapılmayanlar</option>
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700 flex items-center gap-4">
            <span className="text-sm text-slate-300">
              {selectedIds.length} senaryo seçildi
            </span>
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg font-medium transition"
            >
              Seçilenleri Sil
            </button>
          </div>
        )}
      </div>

      {/* Scenarios Table */}
      <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">
            Senaryolar ({scenarios.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
        ) : scenarios.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            Henüz senaryo oluşturulmamıştır
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === scenarios.length && scenarios.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                    Başlık
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                    Test Suite
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                    Öncelik
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                    Otomasyon
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((scenario) => (
                  <tr
                    key={scenario.id}
                    className={`border-b border-slate-700 hover:bg-slate-800/50 cursor-pointer transition ${
                      selectedIds.includes(scenario.id) ? 'bg-blue-900/20' : ''
                    }`}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(scenario.id)}
                        onChange={() => handleSelectOne(scenario.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td
                      className="px-4 py-4"
                      onClick={() => handleViewScenario(scenario.id)}
                    >
                      <p className="font-semibold text-white">
                        {scenario.title}
                      </p>
                      <p className="text-sm text-slate-400">
                        {scenario.description?.substring(0, 50)}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-300">
                      {scenario.suiteName || (
                        <span className="text-blue-400">📄 Belgeden</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(
                          scenario.priority
                        )}`}
                      >
                        {scenario.priority}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {scenario.isAutomated ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
                          ✓ {scenario.automationType}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-slate-600/30 text-slate-400">
                          ⏳ Yapılmamış
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditScenario(scenario);
                          }}
                          className="px-3 py-1 bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 rounded-lg font-medium transition"
                        >
                          Düzenle
                        </button>
                        {!scenario.isAutomated ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAutomate(scenario.id, 'PLAYWRIGHT', true);
                            }}
                            disabled={automatingIds.has(scenario.id)}
                            className={`px-3 py-1 rounded-lg font-medium transition ${
                              automatingIds.has(scenario.id)
                                ? 'bg-blue-600/10 text-blue-300 opacity-50 cursor-not-allowed'
                                : 'bg-blue-600/20 text-blue-400 hover:bg-blue-600/30'
                            }`}
                          >
                            {automatingIds.has(scenario.id) ? '⏳ İşleniyor...' : 'Compile'}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Zaten otomatikleştirilmiş senaryoyu kuyruğa ekle
                              const suite = suites.find(s => s.id === scenario.suiteId);
                              const project = projects.find(p => p.id === suite?.projectId);
                              if (project) {
                                addScenarioToQueue(scenario, project);
                                toast.success('Senaryo otomasyon kuyruğuna eklendi');
                                setTimeout(() => navigate('/automation'), 1000);
                              }
                            }}
                            className="px-3 py-1 rounded-lg font-medium transition bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30"
                          >
                            Otomasyon Paneline Gönder
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteScenario(scenario.id);
                          }}
                          className="px-3 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg font-medium transition"
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Scenario Modal */}
      {showCreateModal && (
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Yeni Senaryo Oluştur"
          size="lg"
        >
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {/* Test Suite */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Test Suite *
              </label>
              <select
                name="suiteId"
                value={formData.suiteId}
                onChange={handleFormChange}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Suite seçiniz...</option>
                {suites.map((suite) => (
                  <option key={suite.id} value={suite.id}>
                    {suite.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Başlık *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleFormChange}
                placeholder="Senaryo başlığı"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Açıklama
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                placeholder="Senaryo açıklaması"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
            </div>

            {/* Steps */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Adımlar
              </label>
              <div className="space-y-2">
                {formData.steps.map((step, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="px-3 py-2 bg-slate-600 rounded-lg text-sm font-medium text-slate-300 min-w-8">
                      {index + 1}.
                    </span>
                    <input
                      type="text"
                      value={step}
                      onChange={(e) => handleStepChange(index, e.target.value)}
                      placeholder="Adım açıklaması"
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {formData.steps.length > 1 && (
                      <button
                        onClick={() => removeStep(index)}
                        className="px-3 py-2 text-red-400 hover:text-red-300 font-medium"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addStep}
                className="mt-2 text-sm text-blue-400 hover:text-blue-300 font-medium"
              >
                + Adım Ekle
              </button>
            </div>

            {/* Expected Result */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Beklenen Sonuç
              </label>
              <textarea
                name="expectedResult"
                value={formData.expectedResult}
                onChange={handleFormChange}
                placeholder="Testin başarılı olması için gereken sonuç"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="2"
              />
            </div>

            {/* Preconditions */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Önkoşullar
              </label>
              <textarea
                name="preconditions"
                value={formData.preconditions}
                onChange={handleFormChange}
                placeholder="Test başlamadan önce sağlanması gereken koşullar"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="2"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Öncelik
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleFormChange}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="LOW">Düşük</option>
                <option value="MEDIUM">Orta</option>
                <option value="HIGH">Yüksek</option>
                <option value="CRITICAL">Kritik</option>
              </select>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setShowCreateModal(false)}
              className="flex-1 py-2 px-4 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 font-medium transition"
            >
              İptal
            </button>
            <button
              onClick={handleCreateScenario}
              className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-500 font-medium transition"
            >
              Oluştur
            </button>
          </div>
        </Modal>
      )}

      {/* Scenario Detail Modal */}
      {showDetailModal && selectedScenario && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={selectedScenario.title}
          size="lg"
        >
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-400">Test Suite</p>
                <p className="font-semibold text-white">
                  {selectedScenario.suite?.name || (
                    <span className="text-blue-400">📄 Belgeden Çıkarıldı</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Öncelik</p>
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getPriorityColor(
                    selectedScenario.priority
                  )}`}
                >
                  {selectedScenario.priority}
                </span>
              </div>
              {selectedScenario.document && (
                <div className="col-span-2">
                  <p className="text-sm text-slate-400">Kaynak Belge</p>
                  <p className="font-semibold text-blue-400">
                    📄 {selectedScenario.document.filename}
                  </p>
                </div>
              )}
            </div>

            {selectedScenario.description && (
              <div>
                <p className="text-sm font-semibold text-slate-300">Açıklama</p>
                <p className="text-slate-400">{selectedScenario.description}</p>
              </div>
            )}

            {selectedScenario.preconditions && (
              <div>
                <p className="text-sm font-semibold text-slate-300">Önkoşullar</p>
                <p className="text-slate-400">{selectedScenario.preconditions}</p>
              </div>
            )}

            {selectedScenario.steps && selectedScenario.steps.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-slate-300">Adımlar</p>
                <ol className="list-decimal list-inside space-y-2">
                  {selectedScenario.steps.map((step, i) => (
                    <li key={i} className="text-slate-400">
                      {typeof step === 'string'
                        ? step
                        : step.action || step.description || step.text || JSON.stringify(step)}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {selectedScenario.expectedResult && (
              <div>
                <p className="text-sm font-semibold text-slate-300">
                  Beklenen Sonuç
                </p>
                <p className="text-slate-400">{selectedScenario.expectedResult}</p>
              </div>
            )}

            {selectedScenario.scriptContent && (
              <div>
                <p className="text-sm font-semibold text-slate-300">
                  Oluşturulan Kod
                </p>
                <pre className="bg-slate-900 text-green-400 p-3 rounded-lg text-xs overflow-x-auto border border-slate-700">
                  {selectedScenario.scriptContent}
                </pre>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setShowDetailModal(false)}
              className="flex-1 py-2 px-4 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 font-medium transition"
            >
              Kapat
            </button>
            <button
              onClick={() => {
                setShowDetailModal(false);
                handleEditScenario(selectedScenario);
              }}
              className="flex-1 py-2 px-4 bg-amber-600 text-white rounded-lg hover:bg-amber-500 font-medium transition"
            >
              Düzenle
            </button>
            {!selectedScenario.isAutomated ? (
              <button
                onClick={() => {
                  handleAutomate(selectedScenario.id, 'PLAYWRIGHT', true);
                }}
                disabled={automatingIds.has(selectedScenario.id)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                  automatingIds.has(selectedScenario.id)
                    ? 'bg-green-600/10 text-green-300 opacity-50 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-500'
                }`}
              >
                {automatingIds.has(selectedScenario.id) ? '⏳ Otomatikleştiriliyor...' : 'Otomatikleştir'}
              </button>
            ) : (
              <button
                onClick={() => {
                  const suite = suites.find(s => s.id === selectedScenario.suiteId);
                  const project = projects.find(p => p.id === suite?.projectId);
                  if (project) {
                    addScenarioToQueue(selectedScenario, project);
                    setShowDetailModal(false);
                    toast.success('Senaryo otomasyon kuyruğuna eklendi');
                    setTimeout(() => navigate('/automation'), 1000);
                  }
                }}
                className="flex-1 py-2 px-4 rounded-lg font-medium transition bg-emerald-600 text-white hover:bg-emerald-500"
              >
                Otomasyon Paneline Gönder
              </button>
            )}
            <button
              onClick={() => {
                handleDeleteScenario(selectedScenario.id);
              }}
              className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-500 font-medium transition"
            >
              Sil
            </button>
          </div>
        </Modal>
      )}

      {/* Edit Scenario Modal */}
      {showEditModal && selectedScenario && (
        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            resetForm();
          }}
          title="Senaryo Düzenle"
          size="lg"
        >
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {/* Test Suite (readonly info) */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Test Suite
              </label>
              <div className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-400">
                {selectedScenario.suite?.name || '📄 Belgeden Çıkarıldı'}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Başlık *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleFormChange}
                placeholder="Senaryo başlığı"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Açıklama
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                placeholder="Senaryo açıklaması"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
            </div>

            {/* Steps */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Adımlar
              </label>
              <div className="space-y-2">
                {formData.steps.map((step, index) => (
                  <div key={index} className="flex gap-2">
                    <span className="px-3 py-2 bg-slate-600 rounded-lg text-sm font-medium text-slate-300 min-w-8">
                      {index + 1}.
                    </span>
                    <input
                      type="text"
                      value={step}
                      onChange={(e) => handleStepChange(index, e.target.value)}
                      placeholder="Adım açıklaması"
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {formData.steps.length > 1 && (
                      <button
                        onClick={() => removeStep(index)}
                        className="px-3 py-2 text-red-400 hover:text-red-300 font-medium"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addStep}
                className="mt-2 text-sm text-blue-400 hover:text-blue-300 font-medium"
              >
                + Adım Ekle
              </button>
            </div>

            {/* Expected Result */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Beklenen Sonuç
              </label>
              <textarea
                name="expectedResult"
                value={formData.expectedResult}
                onChange={handleFormChange}
                placeholder="Testin başarılı olması için gereken sonuç"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="2"
              />
            </div>

            {/* Preconditions */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Önkoşullar
              </label>
              <textarea
                name="preconditions"
                value={formData.preconditions}
                onChange={handleFormChange}
                placeholder="Test başlamadan önce sağlanması gereken koşullar"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="2"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Öncelik
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleFormChange}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="LOW">Düşük</option>
                <option value="MEDIUM">Orta</option>
                <option value="HIGH">Yüksek</option>
                <option value="CRITICAL">Kritik</option>
              </select>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => {
                setShowEditModal(false);
                resetForm();
              }}
              className="flex-1 py-2 px-4 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-700 font-medium transition"
            >
              İptal
            </button>
            <button
              onClick={handleUpdateScenario}
              className="flex-1 py-2 px-4 bg-amber-600 text-white rounded-lg hover:bg-amber-500 font-medium transition"
            >
              Güncelle
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
