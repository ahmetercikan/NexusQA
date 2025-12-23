/**
 * Test Suites Page
 * Test senaryoları yönetimi
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Play,
  Edit2,
  Trash2,
  Search,
  Filter,
  ChevronRight,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { testSuitesAPI, projectsAPI } from '../services/api';
import { Modal } from '../components';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';

export default function TestSuites() {
  const toast = useToast();
  const confirm = useConfirm();
  const [suites, setSuites] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedSuite, setSelectedSuite] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    projectId: '',
    name: '',
    description: '',
    type: 'UI',
  });

  // Fetch data
  useEffect(() => {
    fetchSuites();
    fetchProjects();
  }, []);

  const fetchSuites = async () => {
    try {
      setLoading(true);
      const response = await testSuitesAPI.getAll();
      setSuites(response.data || []);
    } catch (error) {
      console.error('Fetch suites error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data || []);
    } catch (error) {
      console.error('Fetch projects error:', error);
    }
  };

  // Create suite
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await testSuitesAPI.create(formData);
      setIsCreateModalOpen(false);
      setFormData({ projectId: '', name: '', description: '', type: 'UI' });
      fetchSuites();
    } catch (error) {
      console.error('Create error:', error);
    }
  };

  // Delete suite
  const handleDelete = async (id) => {
    const confirmed = await confirm({
      title: 'Test Suite Sil',
      message: 'Bu test suite silinsin mi? Bu işlem geri alınamaz.',
      type: 'danger',
      confirmText: 'Sil',
      cancelText: 'İptal'
    });
    if (!confirmed) return;
    try {
      await testSuitesAPI.delete(id);
      fetchSuites();
      toast.success('Test suite silindi');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Test suite silinirken hata oluştu');
    }
  };

  // Run suite
  const handleRun = async (id) => {
    try {
      await testSuitesAPI.run(id, {});
      fetchSuites();
    } catch (error) {
      console.error('Run error:', error);
    }
  };

  // Filter suites
  const filteredSuites = suites.filter((suite) => {
    const matchSearch =
      suite.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      suite.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = !filterType || suite.type === filterType;
    return matchSearch && matchType;
  });

  const getTypeColor = (type) => {
    switch (type) {
      case 'UI':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'API':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'SECURITY':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'E2E':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Test Run & Suit</h1>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition"
        >
          <Plus size={20} />
          <span>Yeni Suite</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Suite ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-500" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Tüm Tipler</option>
            <option value="UI">UI</option>
            <option value="API">API</option>
            <option value="SECURITY">Security</option>
            <option value="E2E">E2E</option>
          </select>
        </div>
      </div>

      {/* Suites Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredSuites.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
          <FileText size={48} className="mb-4" />
          <p>Henüz test suite yok</p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="mt-4 text-blue-400 hover:underline"
          >
            İlk suite'i oluştur
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuites.map((suite) => (
            <div
              key={suite.id}
              className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-5 hover:border-slate-600 transition-all group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full border ${getTypeColor(
                        suite.type
                      )}`}
                    >
                      {suite.type}
                    </span>
                  </div>
                  <h3 className="text-white font-semibold">{suite.name}</h3>
                  <p className="text-slate-500 text-sm mt-1 line-clamp-2">
                    {suite.description || 'Açıklama yok'}
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 mb-4 text-sm">
                <div className="flex items-center gap-1 text-slate-400">
                  <FileText size={14} />
                  <span>{suite._count?.testCases || 0} test</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <Clock size={14} />
                  <span>{suite._count?.testRuns || 0} koşum</span>
                </div>
              </div>

              {/* Project */}
              {suite.project && (
                <div className="text-xs text-slate-500 mb-4">
                  Proje: {suite.project.name}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-slate-700/50">
                <button
                  onClick={() => handleRun(suite.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition"
                >
                  <Play size={16} />
                  <span>Çalıştır</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedSuite(suite);
                    setIsModalOpen(true);
                  }}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  onClick={() => handleDelete(suite.id)}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Yeni Test Suite"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Proje</label>
            <select
              value={formData.projectId}
              onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
              required
            >
              <option value="">Proje seçin</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Suite Adı</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
              placeholder="Login Testleri"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Tip</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
            >
              <option value="UI">UI Test</option>
              <option value="API">API Test</option>
              <option value="SECURITY">Security Test</option>
              <option value="E2E">E2E Test</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-1">Açıklama</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-blue-500 h-24 resize-none"
              placeholder="Suite açıklaması..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
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

      {/* Detail Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedSuite?.name}
        size="lg"
      >
        {selectedSuite && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 p-4 rounded-xl">
                <p className="text-slate-500 text-sm mb-1">Tip</p>
                <p className="text-white font-medium">{selectedSuite.type}</p>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-xl">
                <p className="text-slate-500 text-sm mb-1">Test Sayısı</p>
                <p className="text-white font-medium">
                  {selectedSuite._count?.testCases || 0}
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-slate-400 text-sm mb-2">Açıklama</h4>
              <p className="text-white">{selectedSuite.description || 'Açıklama yok'}</p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => handleRun(selectedSuite.id)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition"
              >
                <Play size={18} />
                Çalıştır
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
