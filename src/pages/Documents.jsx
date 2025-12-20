import React, { useState, useEffect, useCallback } from 'react';
import { documentsAPI, projectsAPI, testSuitesAPI } from '../services/api';
import Modal from '../components/Modal';
import { useDocumentUpdates } from '../hooks/useWebSocket';
import { useToast } from '../context/ToastContext';
import { useConfirm } from '../context/ConfirmContext';
import { Plus, FileText, Wand2, Loader2 } from 'lucide-react';

/**
 * Documents Page
 * Upload documents (PDF, Word, Excel, txt, Markdown) and manage them
 * OR describe requirements in text to generate test scenarios
 */
export default function Documents() {
  const toast = useToast();
  const confirm = useConfirm();
  const [documents, setDocuments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [suites, setSuites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedSuite, setSelectedSuite] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [processingStatus, setProcessingStatus] = useState({}); // Track real-time status per document
  const [requirementsText, setRequirementsText] = useState(''); // Text-based requirements
  const [activeTab, setActiveTab] = useState('file'); // 'file' or 'requirements'
  const [selectedTemplate, setSelectedTemplate] = useState('text'); // 'text' or 'bdd'

  // Real-time document updates
  const handleDocumentStatus = useCallback((data) => {
    setProcessingStatus(prev => ({
      ...prev,
      [data.id]: { status: data.status, message: data.message }
    }));
  }, []);

  const handleDocumentAnalyzing = useCallback((data) => {
    setProcessingStatus(prev => ({
      ...prev,
      [data.id]: { status: 'ANALYZING', message: data.message }
    }));
  }, []);

  const handleDocumentCompleted = useCallback((data) => {
    setProcessingStatus(prev => ({
      ...prev,
      [data.id]: {
        status: 'COMPLETED',
        message: data.message,
        scenarioCount: data.scenarioCount
      }
    }));
    // Refresh documents list to get updated scenario counts
    loadDocuments();
  }, []);

  const handleScenarioCreated = useCallback((data) => {
    setProcessingStatus(prev => ({
      ...prev,
      [data.documentId]: {
        ...prev[data.documentId],
        status: 'ANALYZING',
        message: `Senaryo ${data.totalCount} oluşturuldu: ${data.scenario.title}`,
        currentScenario: data.scenario.title,
        totalCount: data.totalCount
      }
    }));
  }, []);

  // Subscribe to document updates
  useDocumentUpdates({
    onStatus: handleDocumentStatus,
    onAnalyzing: handleDocumentAnalyzing,
    onCompleted: handleDocumentCompleted,
    onScenarioCreated: handleScenarioCreated,
  });

  // Load documents, projects and suites
  useEffect(() => {
    loadDocuments();
    loadProjects();
    loadSuites();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await documentsAPI.getAll();
      setDocuments(response.documents || []);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await projectsAPI.getAll();
      setProjects(response.data || []);
      if (response.data?.length > 0) {
        setSelectedProject(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  const loadSuites = async () => {
    try {
      const response = await testSuitesAPI.getAll();
      setSuites(response.data || []);
    } catch (error) {
      console.error('Failed to load suites:', error);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      setSelectedFile(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files[0]) {
      setSelectedFile(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedProject) {
      toast.warning('Lütfen dosya ve proje seçiniz');
      return;
    }

    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      toast.error('Dosya boyutu 10MB limiti aştı');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('projectId', selectedProject);
      if (selectedSuite) {
        formData.append('suiteId', selectedSuite);
      }

      const response = await documentsAPI.upload(formData);
      if (response.success) {
        setSelectedFile(null);
        await loadDocuments();
        toast.success('Dosya başarıyla yüklendi. Senaryolar çıkarılıyor...');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Dosya yüklenirken hata oluştu');
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateFromText = async () => {
    if (!requirementsText.trim() || !selectedProject) {
      toast.warning('Lütfen açıklama yazın ve proje seçin');
      return;
    }


    setGenerating(true);
    try {
      const response = await documentsAPI.generateFromText({
        content: requirementsText,
        projectId: selectedProject,
        suiteId: selectedSuite || null,
        template: selectedTemplate,
      });

      if (response.success) {
        setRequirementsText('');
        await loadDocuments();
        toast.success(`${response.scenarioCount || 0} senaryo başarıyla oluşturuldu!`);
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast.error('Senaryo oluşturulurken hata oluştu: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    const confirmed = await confirm({
      title: 'Belgeyi Sil',
      message: 'Bu belgeyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      type: 'danger',
      confirmText: 'Sil',
      cancelText: 'İptal',
    });

    if (!confirmed) return;

    try {
      await documentsAPI.delete(docId);
      setDocuments(documents.filter((d) => d.id !== docId));
      setShowDetailModal(false);
      toast.success('Belge başarıyla silindi');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Belge silinirken hata oluştu');
    }
  };

  const handleViewDocument = async (docId) => {
    try {
      const response = await documentsAPI.getById(docId);
      setSelectedDoc(response.document);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Failed to load document:', error);
      toast.error('Belge detayları yüklenemedi');
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'PROCESSING':
        return 'bg-blue-500/20 text-blue-400';
      case 'FAILED':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  const getTypeIcon = (type) => {
    const icons = {
      PDF: '📄',
      WORD: '📝',
      EXCEL: '📊',
      TXT: '📋',
      MARKDOWN: '📑',
    };
    return icons[type] || '📎';
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Belgeler</h1>
        <p className="mt-2 text-slate-400">
          Belgeler yükleyin ve otomatik olarak senaryolara dönüştürün
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('file')}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'file'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          <FileText className="inline mr-2" size={18} />
          Belge Yükle
        </button>
        <button
          onClick={() => setActiveTab('requirements')}
          className={`px-4 py-3 font-medium border-b-2 transition ${
            activeTab === 'requirements'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          <Wand2 className="inline mr-2" size={18} />
          Açıklama ile Oluştur
        </button>
      </div>

      {/* File Upload Tab */}
      {activeTab === 'file' && (
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white">Belge Yükle</h2>

          {/* File Upload Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
              dragActive
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-600 bg-slate-900/50 hover:border-slate-500'
            }`}
          >
            <input
              type="file"
              id="fileInput"
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md"
            />
            <label
              htmlFor="fileInput"
              className="cursor-pointer block"
            >
              {selectedFile ? (
                <div>
                  <p className="text-lg font-medium text-emerald-400">
                    ✓ {selectedFile.name}
                  </p>
                  <p className="text-sm text-slate-400 mt-1">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium text-slate-200">
                    📁 Dosyayı buraya sürükleyin veya tıklayın
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Desteklenen: PDF, Word, Excel, TXT, Markdown (Max 10MB)
                  </p>
                </div>
              )}
            </label>
          </div>

          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Proje Seçiniz
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Proje seçiniz...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Test Suite Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Test Suite Seçiniz (Opsiyonel)
            </label>
            <select
              value={selectedSuite}
              onChange={(e) => setSelectedSuite(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Suite seçiniz (senaryolar bu suite'e atanır)...</option>
              {suites.map((suite) => (
                <option key={suite.id} value={suite.id}>
                  {suite.name} ({suite.type})
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Seçerseniz, belgeden çıkarılan senaryolar bu test suite'e otomatik atanır
            </p>
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!selectedFile || !selectedProject || uploading}
            className={`w-full py-3 px-4 rounded-lg font-medium transition ${
              uploading || !selectedFile || !selectedProject
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-500'
            }`}
          >
            {uploading ? '⏳ Yükleniyor...' : 'Belgeyi Yükle'}
          </button>
        </div>
      )}

      {/* Requirements Tab */}
      {activeTab === 'requirements' && (
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white">
            <Wand2 className="inline mr-2 text-indigo-400" size={24} />
            Açıklamadan Senaryo Oluştur
          </h2>
          <p className="text-slate-400 text-sm">
            Test etmek istediğiniz özelliği, gereksinimleri veya test senaryolarını detaylı şekilde açıklayın. 
            AI otomatik olarak test senaryolarını oluşturacaktır.
          </p>

          {/* Requirements Text Area */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Proje Gereksinimleri veya Açıklaması
            </label>
            <textarea
              value={requirementsText}
              onChange={(e) => setRequirementsText(e.target.value)}
              placeholder={`Örnek: 
Uygulamada kullanıcı girişi sayfası bulunmaktadır. 
Kullanıcı email ve şifre ile giriş yapabilir.
Yanlış email/şifre girilirse hata mesajı gösterilir.
Test sürüsü başarılı ve başarısız durumları kapsayacak.
Ayrıca SQL injection ve XSS saldırılarına karşı test edilmesi lazım.`}
              className="w-full h-64 px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-y"
            />
            <p className="text-xs text-slate-500 mt-1">
              {requirementsText.length} karakter
            </p>
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Test Senaryosu Formatı
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="text">
                📋 Text Formatı (Standart)
              </option>
              <option value="bdd">
                🎭 BDD Formatı (Gherkin)
              </option>
            </select>
            <p className="text-xs text-slate-500 mt-1">
              {selectedTemplate === 'bdd' 
                ? 'Given/When/Then şeklinde senaryolar oluşturulacak'
                : 'Standart metin formatında senaryolar oluşturulacak'}
            </p>
          </div>

          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Proje Seçiniz
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Proje seçiniz...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {/* Test Suite Selection */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Test Suite Seçiniz (Opsiyonel)
            </label>
            <select
              value={selectedSuite}
              onChange={(e) => setSelectedSuite(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Suite seçiniz...</option>
              {suites.map((suite) => (
                <option key={suite.id} value={suite.id}>
                  {suite.name} ({suite.type})
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Oluşturulan senaryolar bu suite'e atanır
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
            <p className="text-sm text-indigo-300">
              💡 <span className="font-medium">İpucu:</span> Ne kadar detaylı açıklama yaparsanız, 
              AI o kadar güvenilir test senaryoları oluşturur. 
              Boundary cases, edge cases ve security testleri hakkında da bahsedin.
            </p>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerateFromText}
            disabled={!requirementsText.trim() || !selectedProject || generating}
            className={`w-full py-3 px-4 rounded-lg font-bold transition flex items-center justify-center gap-2 ${
              generating || !requirementsText.trim() || !selectedProject
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-900/50'
            }`}
          >
            {generating ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Senaryolar Oluşturuluyor...
              </>
            ) : (
              <>
                <Wand2 size={20} />
                Senaryo Oluştur
              </>
            )}
          </button>
        </div>
      )}

      {/* Documents Grid */}
      <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">
            Yüklü Belgeler ({documents.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
        ) : documents.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            Henüz belge yüklenmemiştir
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {documents.map((doc) => {
              const liveStatus = processingStatus[doc.id];
              const displayStatus = liveStatus?.status || doc.status;
              const isProcessing = displayStatus === 'PROCESSING' || displayStatus === 'ANALYZING';

              return (
              <div
                key={doc.id}
                onClick={() => handleViewDocument(doc.id)}
                className={`border rounded-xl p-4 transition cursor-pointer ${
                  isProcessing
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-600 bg-slate-900/50 hover:border-slate-500 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="text-3xl">{getTypeIcon(doc.type)}</div>
                  <span className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                    displayStatus === 'ANALYZING' ? 'bg-purple-500/20 text-purple-400' : getStatusBadgeColor(displayStatus)
                  }`}>
                    {displayStatus === 'PENDING' && '⏳ Beklemede'}
                    {displayStatus === 'PROCESSING' && '⚙️ İşleniyor'}
                    {displayStatus === 'ANALYZING' && '🤖 AI Analiz Ediyor'}
                    {displayStatus === 'COMPLETED' && '✓ Tamamlandı'}
                    {displayStatus === 'FAILED' && '✗ Başarısız'}
                  </span>
                </div>

                <h3 className="font-semibold text-white truncate">
                  {doc.filename}
                </h3>

                <p className="text-sm text-slate-400 mt-1">
                  {(doc.fileSize / 1024).toFixed(1)} KB
                </p>

                {/* Real-time status message */}
                {liveStatus?.message && isProcessing && (
                  <div className="mt-2 p-2 bg-blue-500/20 rounded-lg text-xs text-blue-300 animate-pulse">
                    {liveStatus.message}
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between">
                  <span className={`text-xs ${
                    liveStatus?.totalCount ? 'text-emerald-400 font-semibold' : 'text-slate-500'
                  }`}>
                    {liveStatus?.totalCount || doc.metadata?.scenarioCount || doc.scenarioCount || 0} senaryo
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(doc.createdAt).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>

      {/* Document Detail Modal */}
      {showDetailModal && selectedDoc && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          title={selectedDoc.filename}
          size="lg"
        >
          <div className="space-y-4">
            {/* Status and Metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-400">Durum</p>
                <p className="font-semibold text-white">
                  {selectedDoc.status === 'COMPLETED' && '✓ Tamamlandı'}
                  {selectedDoc.status === 'PROCESSING' && '⚙️ İşleniyor'}
                  {selectedDoc.status === 'PENDING' && '⏳ Beklemede'}
                  {selectedDoc.status === 'FAILED' && '✗ Başarısız'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Tür</p>
                <p className="font-semibold text-white">{selectedDoc.type}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Boyut</p>
                <p className="font-semibold text-white">
                  {(selectedDoc.fileSize / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Senaryolar</p>
                <p className="font-semibold text-white">{selectedDoc.metadata?.scenarioCount || selectedDoc.scenarioCount || 0}</p>
              </div>
            </div>

            {/* Content Preview */}
            {selectedDoc.content && (
              <div>
                <p className="text-sm font-semibold text-white mb-2">
                  İçerik Önizlemesi
                </p>
                <div className="bg-slate-800 p-4 rounded-lg max-h-80 overflow-y-auto border border-slate-700">
                  <p className="text-sm text-slate-300 whitespace-pre-wrap line-clamp-20">
                    {selectedDoc.content.substring(0, 1000)}
                    {selectedDoc.content.length > 1000 && '...'}
                  </p>
                </div>
              </div>
            )}

            {/* Scenarios List */}
            {selectedDoc.scenarios && selectedDoc.scenarios.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-white mb-2">
                  Çıkarılan Senaryolar
                </p>
                <div className="space-y-2">
                  {selectedDoc.scenarios.map((scenario) => (
                    <div
                      key={scenario.id}
                      className="p-3 bg-slate-800 rounded-lg border border-slate-700"
                    >
                      <p className="font-medium text-white">
                        {scenario.title}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {scenario.isAutomated ? '✓ Otomasyon yapıldı' : 'Otomasyonu bekliyor'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 py-2 px-4 border border-slate-600 rounded-lg text-slate-300 hover:bg-slate-800 font-medium transition"
              >
                Kapat
              </button>
              <button
                onClick={() => handleDeleteDocument(selectedDoc.id)}
                className="flex-1 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-500 font-medium transition"
              >
                Sil
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
