/**
 * Automation Routes
 * Otomasyon iş akışı API endpoint'leri
 */

import express from 'express';
import {
  startAutomation,
  discoverElements,
  generateScript,
  runTest,
  getWorkflowStatus,
  cancelWorkflow,
  testConnection,
  analyzePage,
  updateProjectConfig
} from '../controllers/automationController.js';

const router = express.Router();

/**
 * POST /api/automation/start
 * Tam otomasyon iş akışını başlat
 * Body: { projectId, scenarioIds?, runTests?, headless? }
 */
router.post('/start', startAutomation);

/**
 * POST /api/automation/discover/:scenarioId
 * Tek senaryo için element keşfi yap
 * Body: { headless? }
 */
router.post('/discover/:scenarioId', discoverElements);

/**
 * POST /api/automation/generate/:scenarioId
 * Tek senaryo için Playwright script üret
 */
router.post('/generate/:scenarioId', generateScript);

/**
 * POST /api/automation/run/:scenarioId
 * Tek senaryo için test koş
 */
router.post('/run/:scenarioId', runTest);

/**
 * GET /api/automation/status/:workflowId
 * İş akışı durumunu getir
 */
router.get('/status/:workflowId', getWorkflowStatus);

/**
 * POST /api/automation/cancel/:workflowId
 * İş akışını iptal et
 */
router.post('/cancel/:workflowId', cancelWorkflow);

/**
 * POST /api/automation/test-connection
 * Proje bağlantısını test et
 * Body: { projectId } veya { baseUrl, loginUrl?, loginUsername?, loginPassword? }
 */
router.post('/test-connection', testConnection);

/**
 * POST /api/automation/analyze-page
 * Sayfa elementlerini analiz et
 * Body: { url } veya { projectId }
 */
router.post('/analyze-page', analyzePage);

/**
 * PUT /api/automation/project-config/:projectId
 * Proje otomasyon konfigürasyonunu güncelle
 * Body: { baseUrl?, loginUrl?, loginUsername?, loginPassword?, loginSelectors?, viewportWidth?, viewportHeight? }
 */
router.put('/project-config/:projectId', updateProjectConfig);

export default router;
