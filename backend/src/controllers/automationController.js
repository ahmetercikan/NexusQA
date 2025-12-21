/**
 * Automation Controller
 * Otomasyon iş akışı endpoint'leri
 */

import { PrismaClient } from '@prisma/client';
import automationOrchestrator from '../services/automationOrchestrator.js';
import playwrightService from '../services/playwrightService.js';
import elementDiscovery from '../services/elementDiscovery.js';
import scriptGenerator from '../services/scriptGenerator.js';

const prisma = new PrismaClient();

/**
 * Tam otomasyon iş akışını başlat
 * POST /api/automation/start
 */
export const startAutomation = async (req, res) => {
  try {
    const {
      projectId,
      scenarioIds,
      runTests = false,
      skipElementDiscovery = false,
      skipScriptGeneration = false,
      headless = true,
      browser = 'chromium',
      slowMo = 0
    } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId zorunludur' });
    }

    // Proje var mı kontrol et
    const project = await prisma.project.findUnique({
      where: { id: parseInt(projectId) }
    });

    if (!project) {
      return res.status(404).json({ error: 'Proje bulunamadı' });
    }

    // İş akışını başlat ve workflowId'yi al
    const { workflowId } = await automationOrchestrator.startFullWorkflow(parseInt(projectId), {
      scenarioIds: scenarioIds?.map(id => parseInt(id)),
      runTests,
      skipElementDiscovery,
      skipScriptGeneration,
      headless,
      browser,
      slowMo
    });

    // Hemen response dön, arka planda devam etsin
    res.json({
      success: true,
      message: 'Otomasyon iş akışı başlatıldı',
      workflowId: workflowId
    });

  } catch (error) {
    console.error('Start automation error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Tek senaryo için element keşfi
 * POST /api/automation/discover/:scenarioId
 */
export const discoverElements = async (req, res) => {
  try {
    const { scenarioId } = req.params;
    const { headless = true } = req.body;

    // Senaryoyu al
    const scenario = await prisma.scenario.findUnique({
      where: { id: parseInt(scenarioId) },
      include: {
        suite: {
          include: { project: true }
        }
      }
    });

    if (!scenario) {
      return res.status(404).json({ error: 'Senaryo bulunamadı' });
    }

    const project = scenario.suite?.project;
    if (!project) {
      return res.status(400).json({ error: 'Senaryo bir projeye bağlı değil' });
    }

    // Element keşfi yap
    const result = await automationOrchestrator.discoverElementsForScenario(scenario, project, { headless });

    // Sonuçları kaydet
    if (result.mappings?.length > 0) {
      await prisma.scenario.update({
        where: { id: parseInt(scenarioId) },
        data: {
          elementMappings: result.mappings,
          screenshotPath: result.screenshotPath
        }
      });
    }

    res.json({
      success: true,
      scenarioId: parseInt(scenarioId),
      elementsFound: result.mappings?.length || 0,
      unmappedSteps: result.unmappedSteps?.length || 0,
      overallConfidence: result.overallConfidence,
      mappings: result.mappings,
      pageAnalysis: result.pageAnalysis,
      screenshotPath: result.screenshotPath
    });

  } catch (error) {
    console.error('Discover elements error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Tek senaryo için script üret
 * POST /api/automation/generate/:scenarioId
 */
export const generateScript = async (req, res) => {
  try {
    const { scenarioId } = req.params;

    // Senaryoyu al
    const scenario = await prisma.scenario.findUnique({
      where: { id: parseInt(scenarioId) },
      include: {
        suite: {
          include: { project: true }
        }
      }
    });

    if (!scenario) {
      return res.status(404).json({ error: 'Senaryo bulunamadı' });
    }

    const project = scenario.suite?.project;
    if (!project) {
      return res.status(400).json({ error: 'Senaryo bir projeye bağlı değil' });
    }

    // Script üret
    const result = await automationOrchestrator.generateScriptForScenario(
      scenario,
      project,
      scenario.elementMappings || []
    );

    if (result.success) {
      // Veritabanını güncelle
      await prisma.scenario.update({
        where: { id: parseInt(scenarioId) },
        data: {
          scriptContent: result.script,
          scriptPath: result.filePath,
          isAutomated: true,
          automationType: 'PLAYWRIGHT',
          status: 'COMPLETED'
        }
      });
    }

    res.json({
      success: result.success,
      scenarioId: parseInt(scenarioId),
      filename: result.filename,
      filePath: result.filePath,
      script: result.script,
      error: result.error
    });

  } catch (error) {
    console.error('Generate script error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Tek senaryo için test koş
 * POST /api/automation/run/:scenarioId
 */
export const runTest = async (req, res) => {
  try {
    const { scenarioId } = req.params;

    // Senaryoyu al
    const scenario = await prisma.scenario.findUnique({
      where: { id: parseInt(scenarioId) },
      include: {
        suite: {
          include: { project: true }
        }
      }
    });

    if (!scenario) {
      return res.status(404).json({ error: 'Senaryo bulunamadı' });
    }

    if (!scenario.scriptPath) {
      return res.status(400).json({ error: 'Senaryo için henüz script oluşturulmamış' });
    }

    const project = scenario.suite?.project;

    // Testi koş
    const result = await automationOrchestrator.runTestForScenario(scenario, project, scenario.scriptPath);

    // Sonuçları kaydet
    await prisma.scenario.update({
      where: { id: parseInt(scenarioId) },
      data: {
        lastRunStatus: result.success ? 'PASSED' : 'FAILED',
        lastRunAt: new Date(),
        lastRunDuration: result.duration,
        lastRunError: result.error || null
      }
    });

    res.json({
      success: result.success,
      scenarioId: parseInt(scenarioId),
      status: result.success ? 'PASSED' : 'FAILED',
      duration: result.duration,
      error: result.error,
      output: result.output
    });

  } catch (error) {
    console.error('Run test error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * İş akışı durumunu getir
 * GET /api/automation/status/:workflowId
 */
export const getWorkflowStatus = async (req, res) => {
  try {
    const { workflowId } = req.params;
    const workflow = automationOrchestrator.getWorkflow(workflowId);

    if (!workflow) {
      return res.status(404).json({ error: 'İş akışı bulunamadı' });
    }

    // Response'ı frontend'in beklediği format'ta döndür
    res.json({
      success: true,
      data: {
        status: workflow.status,
        currentStep: workflow.currentStep,
        progress: workflow.progress || 0,
        testResults: workflow.steps || [], // steps'i testResults olarak döndür
        logs: workflow.logs || [],
        errors: workflow.errors || [],
        passed: workflow.passed || 0,
        failed: workflow.failed || 0,
      }
    });

  } catch (error) {
    console.error('GetWorkflowStatus error:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * İş akışını iptal et
 * POST /api/automation/cancel/:workflowId
 */
export const cancelWorkflow = async (req, res) => {
  try {
    const { workflowId } = req.params;
    const cancelled = await automationOrchestrator.cancelWorkflow(workflowId);

    if (!cancelled) {
      return res.status(400).json({ error: 'İş akışı iptal edilemedi veya zaten tamamlanmış' });
    }

    res.json({
      success: true,
      message: 'İş akışı iptal edildi'
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Proje bağlantısını test et
 * POST /api/automation/test-connection
 */
export const testConnection = async (req, res) => {
  try {
    const { projectId, baseUrl, loginUrl, loginUsername, loginPassword, loginSelectors } = req.body;

    let project;

    if (projectId) {
      // Mevcut proje
      project = await prisma.project.findUnique({
        where: { id: parseInt(projectId) }
      });

      if (!project) {
        return res.status(404).json({ error: 'Proje bulunamadı' });
      }
    } else if (baseUrl) {
      // Geçici proje objesi
      project = {
        baseUrl,
        loginUrl,
        loginUsername,
        loginPassword,
        loginSelectors
      };
    } else {
      return res.status(400).json({ error: 'projectId veya baseUrl gerekli' });
    }

    const result = await automationOrchestrator.testProjectConnection(project);

    res.json({
      success: result.success,
      baseUrlOk: result.baseUrlOk,
      loginOk: result.loginOk,
      currentUrl: result.currentUrl,
      error: result.error
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Sayfa elementlerini analiz et
 * POST /api/automation/analyze-page
 */
export const analyzePage = async (req, res) => {
  try {
    const { url, projectId } = req.body;

    if (!url && !projectId) {
      return res.status(400).json({ error: 'url veya projectId gerekli' });
    }

    let targetUrl = url;
    let project = null;

    if (projectId) {
      project = await prisma.project.findUnique({
        where: { id: parseInt(projectId) }
      });
      targetUrl = targetUrl || project?.baseUrl;
    }

    if (!targetUrl) {
      return res.status(400).json({ error: 'Analiz için URL gerekli' });
    }

    // Tarayıcı başlat
    await playwrightService.launchBrowser({ headless: true });
    const page = await playwrightService.createPage();

    try {
      // Sayfaya git
      await playwrightService.navigateToUrl(page, targetUrl);

      // Login gerekiyorsa
      if (project?.loginUrl && project?.loginUsername) {
        await playwrightService.login(page, project);
      }

      // Sayfa analizi
      const analysis = await playwrightService.analyzePageStructure(page);

      // Ekran görüntüsü
      const screenshotPath = await playwrightService.takeScreenshot(page, 'page-analysis');

      res.json({
        success: true,
        url: targetUrl,
        title: analysis.title,
        clickableElements: analysis.clickableElements.length,
        formFields: analysis.formFields.length,
        elements: {
          clickables: analysis.clickableElements.slice(0, 20), // İlk 20
          forms: analysis.formFields.slice(0, 20)
        },
        screenshotPath
      });

    } finally {
      await playwrightService.closeBrowser();
    }

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Proje konfigürasyonunu güncelle
 * PUT /api/automation/project-config/:projectId
 */
export const updateProjectConfig = async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      baseUrl,
      loginUrl,
      loginUsername,
      loginPassword,
      loginSelectors,
      viewportWidth,
      viewportHeight,
      customHeaders,
      cookies
    } = req.body;

    const project = await prisma.project.update({
      where: { id: parseInt(projectId) },
      data: {
        ...(baseUrl !== undefined && { baseUrl }),
        ...(loginUrl !== undefined && { loginUrl }),
        ...(loginUsername !== undefined && { loginUsername }),
        ...(loginPassword !== undefined && { loginPassword }),
        ...(loginSelectors !== undefined && { loginSelectors }),
        ...(viewportWidth !== undefined && { viewportWidth }),
        ...(viewportHeight !== undefined && { viewportHeight }),
        ...(customHeaders !== undefined && { customHeaders }),
        ...(cookies !== undefined && { cookies })
      }
    });

    res.json({
      success: true,
      message: 'Proje konfigürasyonu güncellendi',
      project: {
        id: project.id,
        name: project.name,
        baseUrl: project.baseUrl,
        loginUrl: project.loginUrl,
        loginUsername: project.loginUsername,
        hasLoginPassword: !!project.loginPassword,
        viewportWidth: project.viewportWidth,
        viewportHeight: project.viewportHeight
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export default {
  startAutomation,
  discoverElements,
  generateScript,
  runTest,
  getWorkflowStatus,
  cancelWorkflow,
  testConnection,
  analyzePage,
  updateProjectConfig
};
