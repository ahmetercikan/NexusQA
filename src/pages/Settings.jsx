/**
 * Settings Page
 * Sistem Ayarları
 */

import React, { useState, useEffect } from 'react';
import {
  Settings as SettingsIcon,
  Database,
  Globe,
  Key,
  Bell,
  Shield,
  Palette,
  Save,
  RefreshCw,
  Server,
  Cpu,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Edit,
  Play,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { projectsAPI, automationAPI } from '../services/api';
import { Modal } from '../components';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

export default function Settings() {
  const toast = useToast();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState('general');
  const [projects, setProjects] = useState([]);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState(null);
  const [projectForm, setProjectForm] = useState({
    name: '',
    description: '',
    baseUrl: '',
  });
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    baseUrl: '',
    loginUrl: '',
    loginUsername: '',
    loginPassword: '',
    viewportWidth: 1920,
    viewportHeight: 1080,
  });

  // Settings state
  const [settings, setSettings] = useState({
    apiUrl: 'http://localhost:3001',
    crewAiUrl: 'http://localhost:8000',
    autoRefresh: true,
    refreshInterval: 30,
    theme: 'dark',
    notifications: true,
    debugMode: false,
  });

  // Connection status
  const [connectionStatus, setConnectionStatus] = useState({
    backend: null,
    crewai: null,
    database: null,
  });

  useEffect(() => {
    fetchProjects();
    checkConnections();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data || []);
    } catch (error) {
      console.error('Fetch projects error:', error);
    }
  };

  const checkConnections = async () => {
    // Backend check
    try {
      const response = await fetch('http://localhost:3001/health');
      setConnectionStatus((prev) => ({
        ...prev,
        backend: response.ok,
        database: response.ok, // Backend health = DB health
      }));
    } catch {
      setConnectionStatus((prev) => ({ ...prev, backend: false, database: false }));
    }

    // CrewAI check
    try {
      const response = await fetch('http://localhost:8000/api/health');
      setConnectionStatus((prev) => ({ ...prev, crewai: response.ok }));
    } catch {
      setConnectionStatus((prev) => ({ ...prev, crewai: false }));
    }
  };

  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      await projectsAPI.create(projectForm);
      setIsProjectModalOpen(false);
      setProjectForm({ name: '', description: '', baseUrl: '' });
      fetchProjects();
    } catch (error) {
      console.error('Create project error:', error);
    }
  };

  const handleDeleteProject = async (id) => {
    const confirmed = await confirm({
      title: 'Projeyi Sil',
      message: 'Bu proje silinsin mi? Bu işlem geri alınamaz.',
      type: 'danger',
      confirmText: 'Sil',
      cancelText: 'İptal'
    });
    if (!confirmed) return;
    try {
      await projectsAPI.delete(id);
      fetchProjects();
      toast.success('Proje silindi');
    } catch (error) {
      console.error('Delete project error:', error);
      toast.error('Proje silinirken hata oluştu');
    }
  };

  const handleEditProject = (project) => {
    setSelectedProject(project);
    setEditForm({
      name: project.name || '',
      description: project.description || '',
      baseUrl: project.baseUrl || '',
      loginUrl: project.loginUrl || '',
      loginUsername: project.loginUsername || '',
      loginPassword: '', // Don't show existing password
      viewportWidth: project.viewportWidth || 1920,
      viewportHeight: project.viewportHeight || 1080,
    });
    setConnectionTestResult(null);
    setIsEditModalOpen(true);
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    try {
      // Update basic info
      await projectsAPI.update(selectedProject.id, {
        name: editForm.name,
        description: editForm.description,
        baseUrl: editForm.baseUrl,
      });

      // Update automation config
      const automationData = {
        loginUrl: editForm.loginUrl || null,
        loginUsername: editForm.loginUsername || null,
        viewportWidth: parseInt(editForm.viewportWidth) || 1920,
        viewportHeight: parseInt(editForm.viewportHeight) || 1080,
      };

      // Only include password if it was changed
      if (editForm.loginPassword) {
        automationData.loginPassword = editForm.loginPassword;
      }

      await automationAPI.updateProjectConfig(selectedProject.id, automationData);

      setIsEditModalOpen(false);
      setSelectedProject(null);
      fetchProjects();
    } catch (error) {
      console.error('Update project error:', error);
      toast.error('Proje güncellenirken hata oluştu');
    }
  };

  const handleTestConnection = async () => {
    if (!editForm.baseUrl) {
      toast.warning('Base URL gerekli');
      return;
    }

    setTestingConnection(true);
    setConnectionTestResult(null);

    try {
      const result = await automationAPI.testConnection({
        baseUrl: editForm.baseUrl,
        loginUrl: editForm.loginUrl,
        loginUsername: editForm.loginUsername,
        loginPassword: editForm.loginPassword,
      });

      setConnectionTestResult(result);
    } catch (error) {
      setConnectionTestResult({
        success: false,
        error: error.message || 'Bağlantı testi başarısız',
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveSettings = () => {
    localStorage.setItem('nexus-settings', JSON.stringify(settings));
    toast.success('Ayarlar kaydedildi!');
  };

  const tabs = [
    { id: 'general', label: 'Genel', icon: SettingsIcon },
    { id: 'projects', label: 'Projeler', icon: Database },
    { id: 'connections', label: 'Bağlantılar', icon: Globe },
    { id: 'api', label: 'API Ayarları', icon: Key },
  ];

  const ConnectionStatus = ({ status, label }) => (
    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
      <div className="flex items-center gap-3">
        {status === null ? (
          <div className="w-3 h-3 rounded-full bg-slate-500 animate-pulse" />
        ) : status ? (
          <CheckCircle size={20} className="text-emerald-400" />
        ) : (
          <XCircle size={20} className="text-rose-400" />
        )}
        <span className="text-white">{label}</span>
      </div>
      <span
        className={`text-sm ${
          status === null
            ? 'text-slate-500'
            : status
            ? 'text-emerald-400'
            : 'text-rose-400'
        }`}
      >
        {status === null ? 'Kontrol ediliyor...' : status ? 'Bağlı' : 'Bağlantı yok'}
      </span>
    </div>
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <SettingsIcon className="text-blue-500" />
          Sistem Ayarları
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Uygulama ayarlarını yapılandırın
        </p>
      </div>

      <div className="flex gap-8">
        {/* Sidebar */}
        <div className="w-64 shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                  activeTab === tab.id
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <tab.icon size={20} />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Genel Ayarlar
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Otomatik Yenileme</p>
                      <p className="text-slate-500 text-sm">
                        Dashboard verilerini otomatik yenile
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setSettings({ ...settings, autoRefresh: !settings.autoRefresh })
                      }
                      className={`w-12 h-6 rounded-full transition ${
                        settings.autoRefresh ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full transition transform ${
                          settings.autoRefresh ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Bildirimler</p>
                      <p className="text-slate-500 text-sm">
                        Test sonuçları için bildirim al
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setSettings({ ...settings, notifications: !settings.notifications })
                      }
                      className={`w-12 h-6 rounded-full transition ${
                        settings.notifications ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full transition transform ${
                          settings.notifications ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Debug Modu</p>
                      <p className="text-slate-500 text-sm">
                        Geliştirici loglarını göster
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        setSettings({ ...settings, debugMode: !settings.debugMode })
                      }
                      className={`w-12 h-6 rounded-full transition ${
                        settings.debugMode ? 'bg-blue-600' : 'bg-slate-700'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full transition transform ${
                          settings.debugMode ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveSettings}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition"
              >
                <Save size={18} />
                Kaydet
              </button>
            </div>
          )}

          {/* Projects */}
          {activeTab === 'projects' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Projeler</h3>
                <button
                  onClick={() => setIsProjectModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition"
                >
                  <Plus size={18} />
                  Yeni Proje
                </button>
              </div>

              <div className="space-y-3">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-white font-medium">{project.name}</p>
                        <p className="text-slate-500 text-sm">{project.baseUrl || 'URL yok'}</p>
                        {project.loginUsername && (
                          <p className="text-emerald-400 text-xs mt-1">
                            <Key size={12} className="inline mr-1" />
                            Login yapılandırıldı
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditProject(project)}
                          className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                          title="Düzenle"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteProject(project.id)}
                          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                          title="Sil"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {projects.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <Database size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Henüz proje yok</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Connections */}
          {activeTab === 'connections' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Bağlantı Durumu</h3>
                <button
                  onClick={checkConnections}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl border border-slate-700 transition"
                >
                  <RefreshCw size={18} />
                  Yenile
                </button>
              </div>

              <div className="space-y-3">
                <ConnectionStatus status={connectionStatus.backend} label="Backend API" />
                <ConnectionStatus status={connectionStatus.database} label="PostgreSQL" />
                <ConnectionStatus status={connectionStatus.crewai} label="CrewAI Service" />
              </div>
            </div>
          )}

          {/* API Settings */}
          {activeTab === 'api' && (
            <div className="space-y-6">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">API Ayarları</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">
                      Backend API URL
                    </label>
                    <input
                      type="text"
                      value={settings.apiUrl}
                      onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">
                      CrewAI API URL
                    </label>
                    <input
                      type="text"
                      value={settings.crewAiUrl}
                      onChange={(e) => setSettings({ ...settings, crewAiUrl: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={handleSaveSettings}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition"
              >
                <Save size={18} />
                Kaydet
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Project Modal */}
      <Modal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        title="Yeni Proje"
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Proje Adı</label>
            <input
              type="text"
              value={projectForm.name}
              onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
              placeholder="E-Ticaret Projesi"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Base URL</label>
            <input
              type="url"
              value={projectForm.baseUrl}
              onChange={(e) => setProjectForm({ ...projectForm, baseUrl: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Açıklama</label>
            <textarea
              value={projectForm.description}
              onChange={(e) =>
                setProjectForm({ ...projectForm, description: e.target.value })
              }
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 h-24 resize-none"
              placeholder="Proje açıklaması..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsProjectModalOpen(false)}
              className="px-4 py-2 text-slate-400 hover:text-white transition"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition"
            >
              Oluştur
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Project Modal with Automation Settings */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Proje Ayarları"
        size="lg"
      >
        <form onSubmit={handleUpdateProject} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-300 border-b border-slate-700 pb-2">
              Temel Bilgiler
            </h4>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Proje Adı</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Base URL</label>
              <input
                type="url"
                value={editForm.baseUrl}
                onChange={(e) => setEditForm({ ...editForm, baseUrl: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Açıklama</label>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 h-20 resize-none"
              />
            </div>
          </div>

          {/* Login Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-300 border-b border-slate-700 pb-2">
              Giriş Bilgileri (Otomasyon için)
            </h4>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Login URL</label>
              <input
                type="url"
                value={editForm.loginUrl}
                onChange={(e) => setEditForm({ ...editForm, loginUrl: e.target.value })}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                placeholder="https://example.com/login"
              />
              <p className="text-xs text-slate-500 mt-1">Boş bırakılırsa Base URL kullanılır</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Kullanıcı Adı / Email</label>
                <input
                  type="text"
                  value={editForm.loginUsername}
                  onChange={(e) => setEditForm({ ...editForm, loginUsername: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  placeholder="test@example.com"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Şifre</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={editForm.loginPassword}
                    onChange={(e) => setEditForm({ ...editForm, loginPassword: e.target.value })}
                    className="w-full px-4 py-2 pr-10 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {selectedProject?.loginUsername && (
                  <p className="text-xs text-emerald-400 mt-1">Mevcut şifre korunacak (boş bırakılırsa)</p>
                )}
              </div>
            </div>
          </div>

          {/* Viewport Settings */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-slate-300 border-b border-slate-700 pb-2">
              Tarayıcı Ayarları
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Viewport Genişlik</label>
                <input
                  type="number"
                  value={editForm.viewportWidth}
                  onChange={(e) => setEditForm({ ...editForm, viewportWidth: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  min="320"
                  max="3840"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Viewport Yükseklik</label>
                <input
                  type="number"
                  value={editForm.viewportHeight}
                  onChange={(e) => setEditForm({ ...editForm, viewportHeight: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
                  min="240"
                  max="2160"
                />
              </div>
            </div>
          </div>

          {/* Connection Test */}
          <div className="bg-slate-800/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-300">Bağlantı Testi</span>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConnection || !editForm.baseUrl}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {testingConnection ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Play size={16} />
                )}
                Test Et
              </button>
            </div>
            {connectionTestResult && (
              <div className={`p-3 rounded-lg text-sm ${
                connectionTestResult.success
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              }`}>
                {connectionTestResult.success ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle size={16} />
                    <span>Bağlantı başarılı!</span>
                    {connectionTestResult.loginOk && <span>• Login OK</span>}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <XCircle size={16} />
                    <span>{connectionTestResult.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 text-slate-400 hover:text-white transition"
            >
              İptal
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition"
            >
              <Save size={18} />
              Kaydet
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
