/**
 * Automation Orchestrator
 * Belge analizi, element keşfi, script üretimi ve test koşumu iş akışını koordine eder
 */

import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Backend kök dizinini hesapla (bu dosya backend/src/services/ altında)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.resolve(__dirname, '..', '..');

import playwrightService from './playwrightService.js';
import elementDiscovery from './elementDiscovery.js';
import sequentialDiscovery from './sequentialDiscovery.js';
import scriptGenerator from './scriptGenerator.js';
import crewAIBridge from './crewAIBridge.js';
import axios from 'axios';
import { triggerAgent } from './crewAIBridge.js';
import { emitAgentStatus, emitNewLog, emitAutomationStep, emitAutomationCompleted, emitScriptGenerated, emitAutomationTestPass, emitAutomationTestFail } from '../websocket/socketHandler.js';
import programmaticTestRunner from './programmaticTestRunner.js';

// CrewAI API URL
const CREWAI_API_URL = process.env.CREWAI_API_URL || 'http://localhost:8000';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

// Workflow durumları
const WORKFLOW_STATUS = {
  PENDING: 'PENDING',
  ANALYZING: 'ANALYZING',
  DISCOVERING: 'DISCOVERING',
  GENERATING: 'GENERATING',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};

// Aktif iş akışları
const activeWorkflows = new Map();

/**
 * CrewAI'ın ürettiği script'teki text locator click'lerini visibility-aware hale getir
 */
function fixTextLocatorClicks(script) {
  if (!script) return script;

  // Pattern: await page.click('text=Something')
  // Replace with visibility-aware code
  const textClickPattern = /await\s+page\.click\s*\(\s*['"`]text=([^'"`]+)['"`]\s*\)/g;

  const fixedScript = script.replace(textClickPattern, (_match, textValue) => {
    // Generate visibility-aware click code
    return `// Click visible text element
  {
    const allMatches = await page.getByText('${textValue}', { exact: false }).all();
    let visibleElement = null;
    for (const element of allMatches) {
      if (await element.isVisible()) {
        visibleElement = element;
        break;
      }
    }
    if (!visibleElement) {
      throw new Error('Text "${textValue}" found but all elements are hidden');
    }
    await visibleElement.click();
  }`;
  });

  return fixedScript;
}

/**
 * Tam otomasyon iş akışını başlat
 */
export async function startFullWorkflow(projectId, options = {}) {
  const {
    scenarioIds,
    skipLogin = false,
    skipElementDiscovery = false,
    skipScriptGeneration = false,
    headless = true,
    browser = 'chromium',
    slowMo = 0,
    maxConcurrent = 1
  } = options;

  const workflowId = `workflow-${Date.now()}`;
  const workflow = {
    id: workflowId,
    projectId,
    status: WORKFLOW_STATUS.PENDING,
    currentStep: 'init',
    progress: 0,
    passed: 0,
    failed: 0,
    startedAt: new Date(),
    steps: [],
    logs: [],
    errors: []
  };

  activeWorkflows.set(workflowId, workflow);

  // Başlangıç step'ini bildir
  emitAutomationStep({
    workflowId,
    step: 'init',
    message: 'Otomasyon başlatılıyor...'
  });

  // İş akışını background'da çalıştır (await etme!)
  executeWorkflow(workflowId, projectId, scenarioIds, {
    skipLogin,
    skipElementDiscovery,
    skipScriptGeneration,
    headless,
    browser,
    slowMo,
    maxConcurrent
  }).catch(error => {
    console.error(`[Orchestrator] Workflow ${workflowId} hatası:`, error);
  });

  // Hemen workflowId döndür
  return { workflowId, workflow };
}

/**
 * İş akışını execute et (background'da çalışıyor)
 */
async function executeWorkflow(workflowId, projectId, scenarioIds, options = {}) {
  const {
    skipLogin = false,
    skipElementDiscovery = false,
    skipScriptGeneration = false,
    headless = true,
    browser = 'chromium',
    slowMo = 0,
    maxConcurrent = 1
  } = options;

  const workflow = activeWorkflows.get(workflowId);
  if (!workflow) throw new Error(`Workflow bulunamadı: ${workflowId}`);

  try {
    // 1. Proje bilgilerini al
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { testSuites: true }
    });

    if (!project) {
      throw new Error('Proje bulunamadı');
    }

    // 2. Senaryoları al
    let scenarios;
    if (scenarioIds && scenarioIds.length > 0) {
      scenarios = await prisma.scenario.findMany({
        where: { id: { in: scenarioIds } }
      });
    } else {
      scenarios = await prisma.scenario.findMany({
        where: {
          suite: { projectId }
        }
      });
    }

    if (scenarios.length === 0) {
      throw new Error('İşlenecek senaryo bulunamadı');
    }

    workflow.totalScenarios = scenarios.length;

    // Debug: Senaryoları logla
    console.log(`[Orchestrator] ${scenarios.length} senaryo bulundu:`);
    scenarios.forEach(s => {
      console.log(`  - ID: ${s.id}, Başlık: ${s.title}, ScriptPath: ${s.scriptPath || 'YOK'}`);
    });

    // Agent'ları hazırla
    await prepareAgents();

    // Test koşumu adımına geç
    workflow.currentStep = 'test';
    emitAutomationStep({
      workflowId,
      step: 'test',
      message: `${scenarios.length} test senaryosu koşuluyor...`
    });

    // 3. Her senaryo için iş akışı - Paralel çalıştırma
    console.log(`[Orchestrator] ${scenarios.length} senaryo ${maxConcurrent} eş zamanlı browser ile çalıştırılacak`);
    await createLog('ORCHESTRATOR', 'INFO', `${scenarios.length} senaryo ${maxConcurrent} eş zamanlı browser ile çalıştırılacak`);

    // Paralel çalıştırma için senaryo işleme fonksiyonu
    const processScenario = async (scenario, index) => {
      console.log(`[Orchestrator] Senaryo işleniyor [${index+1}/${scenarios.length}]: ${scenario.title}`);

      emitAutomationStep({
        workflowId,
        step: 'processing_scenario',
        scenarioId: scenario.id,
        scenarioTitle: scenario.title,
        progress: Math.round(((index + 1) / scenarios.length) * 100),
        message: `Senaryo işleniyor: ${scenario.title}`
      });

      try {
        let currentScenario = scenario;

        // 1. Element Discovery (eğer skip edilmemişse VE mappings yoksa)
        const hasElementMappings = currentScenario.elementMappings &&
                                    Array.isArray(currentScenario.elementMappings) &&
                                    currentScenario.elementMappings.length > 0;

        if (!skipElementDiscovery && !hasElementMappings) {
          console.log(`[Orchestrator] Element keşfi başlatılıyor: ${scenario.title}`);
          await createLog('ORCHESTRATOR', 'INFO', `Element keşfi başlatılıyor: ${scenario.title}`);

          try {
            // Element discovery her zaman headless modda çalışsın
            // Test execution browser'ı kullanıcı görecek
            await discoverElementsForScenario(currentScenario, project, { headless: true, browser, slowMo });
            // Senaryo verisini yenile
            currentScenario = await prisma.scenario.findUnique({ where: { id: scenario.id } });
            console.log(`[Orchestrator] Element keşfi tamamlandı: ${scenario.title}`);
          } catch (discoveryError) {
            console.warn(`[Orchestrator] Element keşfi başarısız: ${discoveryError.message}`);
            await createLog('ORCHESTRATOR', 'WARNING', `Element keşfi başarısız: ${discoveryError.message}`);
          }
        } else if (hasElementMappings) {
          console.log(`[Orchestrator] Element mappings zaten mevcut (${currentScenario.elementMappings.length} mapping), discovery atlanıyor`);
          await createLog('ORCHESTRATOR', 'INFO', `Element mappings mevcut (${currentScenario.elementMappings.length} adet), discovery atlanıyor`);
        }

        // 2. Script Generation (eğer skip edilmemişse ve script yoksa)
        if (!skipScriptGeneration && !currentScenario.scriptPath) {
          console.log(`[Orchestrator] Script oluşturuluyor: ${scenario.title}`);
          await createLog('ORCHESTRATOR', 'INFO', `Script oluşturuluyor: ${scenario.title}`);

          try {
            // Element mappingleri al
            const elementMappings = currentScenario.elementMappings || [];
            console.log(`[Orchestrator] Script generation için ${elementMappings.length} element mapping kullanılacak`);

            await generateScriptForScenario(currentScenario, project, elementMappings);
            // Senaryo verisini yenile
            currentScenario = await prisma.scenario.findUnique({ where: { id: scenario.id } });
            console.log(`[Orchestrator] Script oluşturuldu: ${currentScenario.scriptPath}`);
          } catch (scriptError) {
            console.warn(`[Orchestrator] Script oluşturma başarısız: ${scriptError.message}`);
            await createLog('ORCHESTRATOR', 'WARNING', `Script oluşturma başarısız: ${scriptError.message}`);
          }
        }

        // 3. Script kontrolü
        if (!currentScenario.scriptPath) {
          console.log(`[Orchestrator] SKIPPED - Script path yok: ${scenario.title}`);
          await createLog('ORCHESTRATOR', 'WARNING', `⚠️ Senaryo için script bulunamadı: ${scenario.title}`);
          workflow.steps.push({
            scenarioId: scenario.id,
            scenarioTitle: scenario.title,
            status: 'SKIPPED',
            reason: 'Script not found'
          });
          workflow.failed++;
          return; // continue yerine return (fonksiyon içinde)
        }

        console.log(`[Orchestrator] Script path mevcut: ${currentScenario.scriptPath}`);

        // 4. Test koş
        workflow.status = WORKFLOW_STATUS.RUNNING;
        await createLog('ORCHESTRATOR', 'INFO', `Test koşuluyor: ${scenario.title}`);

        // Orchestrator agent'ını bul
        const orchestratorAgent = await prisma.agent.findFirst({
          where: { type: 'ORCHESTRATOR' }
        });

        // Test Run kaydı oluştur
        const testRun = await prisma.testRun.create({
          data: {
            suiteId: currentScenario.suiteId,
            agentId: orchestratorAgent?.id,
            status: 'RUNNING',
            startedAt: new Date(),
            metadata: {
              scenarioId: currentScenario.id,
              scenarioTitle: currentScenario.title,
              browser: browser,
              headless: headless,
              slowMo: slowMo
            }
          }
        });

        const testResult = await runTestForScenario(currentScenario, project, currentScenario.scriptPath, {
          headless,
          browser,
          slowMo,
          workflowId  // CDP screencast için
        });

        // Test Run kaydını güncelle (screenshot path dahil)
        await prisma.testRun.update({
          where: { id: testRun.id },
          data: {
            status: testResult.success ? 'PASSED' : 'FAILED',
            finishedAt: new Date(),
            durationMs: testResult.duration,
            errorMessage: testResult.error || null,
            screenshotPath: testResult.screenshotPath || null
          }
        });

        const updatedScenario = await prisma.scenario.update({
          where: { id: scenario.id },
          data: {
            lastRunStatus: testResult.success ? 'PASSED' : 'FAILED',
            lastRunAt: new Date(),
            lastRunDuration: testResult.duration,
            lastRunError: testResult.error || null
          }
        });

        workflow.steps.push({
          scenarioId: scenario.id,
          scenarioTitle: scenario.title,
          status: testResult.success ? 'SUCCESS' : 'FAILED',
          duration: testResult.duration
        });

        if (testResult.success) {
          workflow.passed++;
          // WebSocket ile frontend'e başarı bildirimi gönder
          emitAutomationTestPass({
            scenarioId: scenario.id,
            scenarioTitle: scenario.title,
            duration: testResult.duration,
            scenario: updatedScenario
          });
        } else {
          workflow.failed++;
          // WebSocket ile frontend'e hata bildirimi gönder
          emitAutomationTestFail({
            scenarioId: scenario.id,
            scenarioTitle: scenario.title,
            duration: testResult.duration,
            error: testResult.error,
            scenario: updatedScenario
          });
        }

      } catch (scenarioError) {
        console.log(`[Orchestrator] Senaryo hatası: ${scenarioError.message}`);
        workflow.steps.push({
          scenarioId: scenario.id,
          scenarioTitle: scenario.title,
          status: 'FAILED',
          error: scenarioError.message
        });
        workflow.errors.push({
          scenarioId: scenario.id,
          error: scenarioError.message
        });
        workflow.failed++;
      }
    };

    // Paralel çalıştırma - maxConcurrent kadar eş zamanlı
    const runInParallel = async (items, limit, processor) => {
      const results = [];
      for (let i = 0; i < items.length; i += limit) {
        const batch = items.slice(i, i + limit);
        const batchPromises = batch.map((item, batchIndex) =>
          processor(item, i + batchIndex)
        );
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }
      return results;
    };

    // Senaryoları paralel çalıştır
    await runInParallel(scenarios, maxConcurrent, processScenario);

    // 4. Tamamlandı
    workflow.status = WORKFLOW_STATUS.COMPLETED;
    workflow.currentStep = 'complete';
    workflow.finishedAt = new Date();

    // Agent'ları idle'a al
    await resetAgents();

    const successCount = workflow.steps.filter(s => s.status === 'SUCCESS').length;
    const failCount = workflow.steps.filter(s => s.status === 'FAILED').length;
    const skippedCount = workflow.steps.filter(s => s.status === 'SKIPPED').length;

    console.log(`[Orchestrator] Workflow tamamlandı - Başarılı: ${successCount}, Başarısız: ${failCount}, Atlanan: ${skippedCount}`);

    // Tamamlanma step'ini bildir
    emitAutomationStep({
      workflowId,
      step: 'complete',
      message: `Tüm testler tamamlandı! Başarılı: ${successCount}, Başarısız: ${failCount}`
    });

    emitAutomationCompleted({
      workflowId,
      status: 'COMPLETED',
      totalScenarios: scenarios.length,
      successCount,
      failCount,
      skippedCount,
      duration: workflow.finishedAt - workflow.startedAt
    });

    console.log(`[Orchestrator] Workflow ${workflowId} tamamlandı`);

  } catch (error) {
    workflow.status = WORKFLOW_STATUS.FAILED;
    workflow.error = error.message;
    workflow.finishedAt = new Date();

    await resetAgents();

    emitAutomationCompleted({
      workflowId,
      status: 'FAILED',
      error: error.message
    });

    console.error(`[Orchestrator] Workflow ${workflowId} başarısız:`, error.message);
  }
}

/**
 * Tek senaryo için element keşfi
 */
export async function discoverElementsForScenario(scenario, project, options = {}) {
  const { headless = true, browser = 'chromium', slowMo = 0, sequential = true } = options;

  // Analist Agent'ı aktifleştir
  await updateAgentStatus('ANALYST', 'WORKING', 'Element keşfi yapılıyor...');
  await createLog('ANALYST', 'INFO', `Element keşfi başladı: ${scenario.title}`);

  let page = null;

  try {
    // Tarayıcı başlat
    await playwrightService.launchBrowser({ headless, browser, slowMo });
    page = await playwrightService.createPage();

    // Sayfaya git
    const targetUrl = scenario.targetUrl || project.baseUrl;
    if (targetUrl) {
      await playwrightService.navigateToUrl(page, targetUrl);
    }

    // Login gerekiyorsa yap
    if (project.loginUrl && project.loginUsername) {
      await createLog('ANALYST', 'INFO', 'Giriş yapılıyor...');
      const loginResult = await playwrightService.login(page, project);

      if (!loginResult.success) {
        throw new Error(`Login başarısız: ${loginResult.error}`);
      }
    }

    // Sayfanın tam yüklenmesini bekle
    console.log('[Orchestrator] Sayfa yüklenmesi bekleniyor...');
    await createLog('ANALYST', 'INFO', 'Sayfa yüklenmesi bekleniyor...');
    await page.waitForLoadState('load');
    await page.waitForTimeout(2000); // Ek bekleme süresi - dinamik içerik için

    // Sayfa URL ve başlığını logla
    const currentUrl = page.url();
    const currentTitle = await page.title();
    console.log(`[Orchestrator] Sayfa yüklendi: ${currentTitle} (${currentUrl})`);
    await createLog('ANALYST', 'INFO', `Sayfa yüklendi: ${currentTitle}`);

    // Sayfa analizini yap
    await createLog('ANALYST', 'INFO', 'Sayfa elementleri analiz ediliyor...');
    console.log('[Orchestrator] Element discovery başlıyor...');
    const pageAnalysis = await playwrightService.analyzePageStructure(page);
    console.log(`[Orchestrator] Sayfa analizi tamamlandı: ${pageAnalysis.totalElements} element bulundu`);

    // Senaryo adımları için element keşfi
    let discoveryResult;

    if (sequential) {
      // SEQUENTIAL DISCOVERY - Her adımı çalıştırarak keşfet (Text2Test tarzı)
      await createLog('ANALYST', 'INFO', 'Sequential element keşfi başlıyor (Text2Test mode)...');
      console.log('[Orchestrator] Sequential discovery mode - Her adım sırayla çalıştırılacak');
      discoveryResult = await sequentialDiscovery.discoverElementsSequentially(page, scenario, project);
    } else {
      // SNAPSHOT DISCOVERY - Tek seferde tüm elementleri keşfet (eski yöntem)
      await createLog('ANALYST', 'INFO', 'Snapshot element keşfi başlıyor...');
      console.log('[Orchestrator] Snapshot discovery mode - Tek snapshot');
      discoveryResult = await elementDiscovery.discoverElementsForScenario(page, scenario, project);
    }

    console.log(`[Element Discovery] ${discoveryResult.mappings?.length || 0} element bulundu`, discoveryResult.mappings);

    // Element mappingleri veritabanına kaydet
    if (discoveryResult.mappings && discoveryResult.mappings.length > 0) {
      try {
        await prisma.scenario.update({
          where: { id: scenario.id },
          data: {
            elementMappings: discoveryResult.mappings,
            discoveryMetadata: {
              totalElements: pageAnalysis.totalElements,
              overallConfidence: discoveryResult.overallConfidence,
              discoveredAt: new Date().toISOString()
            }
          }
        });
        await createLog('ANALYST', 'SUCCESS', `${discoveryResult.mappings.length} element veritabanına kaydedildi`);
        console.log(`[Orchestrator] Element mappings veritabanına kaydedildi`);
      } catch (dbError) {
        console.error(`[Orchestrator] Element mappings kaydetme hatası:`, dbError.message);
        await createLog('ANALYST', 'WARNING', `Element mappings kaydedilemedi: ${dbError.message}`);
        // Hata olsa bile devam et - mappings hala döndürülecek
      }
    }

    // Ekran görüntüsü al
    const screenshotPath = await playwrightService.takeScreenshot(page, `scenario-${scenario.id}`);

    await updateAgentStatus('ANALYST', 'COMPLETED', 'Element keşfi tamamlandı');
    await createLog('ANALYST', 'SUCCESS', `${discoveryResult.mappings?.length || 0} element eşleştirildi`);

    return {
      ...discoveryResult,
      pageAnalysis,
      screenshotPath
    };

  } catch (error) {
    await updateAgentStatus('ANALYST', 'ERROR', error.message);
    await createLog('ANALYST', 'ERROR', `Element keşfi hatası: ${error.message}`);
    throw error;

  } finally {
    await playwrightService.closeBrowser();
  }
}

/**
 * Tek senaryo için script üret - CrewAI kullanarak
 */
export async function generateScriptForScenario(scenario, project, elementMappings = []) {
  // Test Mimarı Agent'ı aktifleştir
  await updateAgentStatus('TEST_ARCHITECT', 'WORKING', 'AI ile test scripti üretiliyor...');
  await createLog('TEST_ARCHITECT', 'INFO', `CrewAI ile script üretimi başladı: ${scenario.title}`);

  try {
    let script = '';
    let generatedByAI = false;

    // Önce CrewAI'dan kod üretmeyi dene
    try {
      await createLog('TEST_ARCHITECT', 'INFO', 'CrewAI agent çağrılıyor...');

      console.log(`[Script Generation] CrewAI'a ${elementMappings.length} element mapping gönderiliyor`);

      const crewAIResponse = await axios.post(`${CREWAI_API_URL}/api/crew/generate-automation`, {
        scenario: {
          id: scenario.id,
          title: scenario.title,
          description: scenario.description,
          steps: scenario.steps,
          expectedResult: scenario.expectedResult,
          preconditions: scenario.preconditions,
          testData: scenario.testData,
          automationType: scenario.automationType || 'UI',
          priority: scenario.priority,
          targetUrl: scenario.targetUrl || project.baseUrl,
          elementMappings: elementMappings // Element mappingleri ekle
        },
        test_suite_info: {
          name: project.name,
          type: 'UI',
          baseUrl: project.baseUrl
        },
        element_mappings: elementMappings, // Eski format için de ekle
        backend_scenario_id: scenario.id
      }, { timeout: 180000 }); // 3 dakika timeout

      // Task ID aldıysak, tamamlanmasını bekle
      if (crewAIResponse.data.task_id) {
        await createLog('TEST_ARCHITECT', 'INFO', `Task başlatıldı: ${crewAIResponse.data.task_id}`);

        // Task tamamlanana kadar bekle
        let taskResult = null;
        for (let i = 0; i < 120; i++) { // Max 120 saniye bekle (2 dakika)
          await new Promise(resolve => setTimeout(resolve, 1000));

          try {
            const statusResponse = await axios.get(`${CREWAI_API_URL}/api/tasks/${crewAIResponse.data.task_id}`);

            if (statusResponse.data.status === 'completed') {
              taskResult = statusResponse.data.result;
              await createLog('TEST_ARCHITECT', 'INFO', `Task tamamlandı (${i}s)`);
              break;
            } else if (statusResponse.data.status === 'error') {
              throw new Error(statusResponse.data.result?.error || 'CrewAI task failed');
            }

            // Her 10 saniyede log at
            if (i % 10 === 0 && i > 0) {
              await createLog('TEST_ARCHITECT', 'INFO', `AI kod üretiyor... (${i}s)`);
            }
          } catch (pollError) {
            // Polling hatası - devam et
            console.error('Polling error:', pollError.message);
          }
        }

        if (taskResult && taskResult.success && taskResult.code) {
          script = fixTextLocatorClicks(taskResult.code);
          generatedByAI = true;
          await createLog('TEST_ARCHITECT', 'SUCCESS', 'CrewAI script üretimi tamamlandı (text locators fixed)!');
        } else if (taskResult && taskResult.code) {
          // success flag olmasa bile code varsa kullan
          script = fixTextLocatorClicks(taskResult.code);
          generatedByAI = true;
          await createLog('TEST_ARCHITECT', 'SUCCESS', 'AI script üretimi tamamlandı (text locators fixed)');
        }
      } else if (crewAIResponse.data.code) {
        script = fixTextLocatorClicks(crewAIResponse.data.code);
        generatedByAI = true;
      }
    } catch (crewError) {
      console.error('CrewAI error:', crewError.message);
      await createLog('TEST_ARCHITECT', 'WARNING', `CrewAI kullanılamıyor: ${crewError.message}. Template mod kullanılacak.`);
    }

    // CrewAI başarısızsa template-based fallback
    if (!script) {
      await createLog('TEST_ARCHITECT', 'INFO', 'Template tabanlı script üretimi yapılıyor...');
      script = scriptGenerator.generatePlaywrightScript(scenario, project, elementMappings);
    }

    // Dosya adı oluştur
    const safeTitle = scenario.title.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const filename = `test-${scenario.id}-${safeTitle}.spec.js`;

    // Dosyaya kaydet
    const filePath = await scriptGenerator.saveScript(script, filename);

    await updateAgentStatus('TEST_ARCHITECT', 'COMPLETED', 'Script oluşturuldu');
    await createLog('TEST_ARCHITECT', 'SUCCESS', `Script kaydedildi: ${filename} (AI: ${generatedByAI})`);

    // WebSocket ile frontend'e scripti gönder
    emitScriptGenerated({
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      script,
      filename,
      filePath,
      generatedByAI
    });

    return {
      success: true,
      script,
      filename,
      filePath,
      generatedByAI
    };

  } catch (error) {
    await updateAgentStatus('TEST_ARCHITECT', 'ERROR', error.message);
    await createLog('TEST_ARCHITECT', 'ERROR', `Script üretim hatası: ${error.message}`);

    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Tek senaryo için test koş
 */
export async function runTestForScenario(scenario, project, scriptPath, options = {}) {
  const { headless = false, browser = 'chromium', workflowId = null } = options;

  // Orkestra Şefi Agent'ı aktifleştir
  await updateAgentStatus('ORCHESTRATOR', 'WORKING', 'Test koşuluyor...');
  await createLog('ORCHESTRATOR', 'INFO', `Test başladı: ${scenario.title}`);

  const startTime = Date.now();

  try {
    // Script path'ini doğrula
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Script dosyası bulunamadı: ${scriptPath}`);
    }

    // TEST ARCHITECT Agent'ı çağır - test'i analiz et ve optimize et
    await updateAgentStatus('TEST_ARCHITECT', 'WORKING', 'Test analiz ediliyor ve optimize ediliyor...');
    await createLog('TEST_ARCHITECT', 'INFO', `Test analiz başladı: ${scenario.title}`);
    
    try {
      const testAnalysis = await triggerAgent('TEST_ARCHITECT', scenario.id, {
        title: scenario.title,
        steps: scenario.steps,
        scriptPath: scriptPath,
        projectName: project?.name
      });
      
      if (testAnalysis && testAnalysis.optimizedScript) {
        // Agent tarafından optimize edilmiş script'i kullan
        fs.writeFileSync(scriptPath, testAnalysis.optimizedScript);
        await createLog('TEST_ARCHITECT', 'SUCCESS', `Test optimize edildi`);
      }
    } catch (agentError) {
      // Agent başarısız olsa da devam et - orijinal script'i kullan
      await createLog('TEST_ARCHITECT', 'WARNING', `Agent hatası, orijinal script kullanılıyor: ${agentError.message}`);
    }

    // HEADED MODE: Programatik runner + CDP screencast kullan
    // HEADLESS MODE: CLI runner kullan (daha hızlı)
    if (!headless && workflowId) {
      console.log('[Orchestrator] 🎬 CDP Screencast aktif - Programatik runner kullanılıyor');
      await createLog('ORCHESTRATOR', 'INFO', `Canlı browser görüntüsü başlatılıyor (CDP Screencast)`);

      const result = await programmaticTestRunner.runTestWithScreencast(
        scriptPath,
        workflowId,
        { headless, browser, slowMo: options.slowMo || 0 }
      );

      const duration = Date.now() - startTime;

      await updateAgentStatus('ORCHESTRATOR', 'COMPLETED', 'Test tamamlandı');

      return {
        success: result.success,
        duration,
        passed: result.passed,
        failed: result.failed,
        error: result.error,
        screenshotPath: null
      };
    }

    // HEADLESS MODE veya workflowId yoksa: CLI runner (eski yöntem)
    console.log('[Orchestrator] CLI runner kullanılıyor (headless veya workflowId yok)');

    // Playwright'ı başlat - headless veya headed modda
    // Backend root'tan relative path bul (config dosyası backend/'da)
    const relativeTestPath = path.relative(BACKEND_ROOT, scriptPath).replace(/\\/g, '/');
    const headedFlag = headless ? '' : '--headed';
    const projectFlag = `--project=${browser}`;
    const testCommand = `npx playwright test "${relativeTestPath}" --reporter=json ${headedFlag} ${projectFlag} --workers=1`.trim();

    await createLog('ORCHESTRATOR', 'INFO', `Test başlıyor: ${scriptPath}`);
    await createLog('ORCHESTRATOR', 'INFO', `Komut: ${testCommand}`);

    // CWD'yi backend root yap ki playwright.config.js bulunabilsin
    const { stdout, stderr } = await execAsync(testCommand, {
      cwd: BACKEND_ROOT, // backend dizini (config dosyası burada)
      timeout: 120000,
      shell: process.platform === 'win32' ? true : '/bin/bash'
    });

    const duration = Date.now() - startTime;

    await updateAgentStatus('ORCHESTRATOR', 'COMPLETED', 'Test tamamlandı');

    // Sonuç analiz et
    let passed = 1, failed = 0;
    let screenshotPath = null;
    try {
      const report = JSON.parse(stdout);
      if (report.stats) {
        passed = report.stats.expected || 0;
        failed = report.stats.unexpected || 0;
      }

      // Screenshot path'ini bul (test fail olduğunda veya on-failure mode'da)
      if (report.suites && report.suites.length > 0) {
        for (const suite of report.suites) {
          if (suite.specs && suite.specs.length > 0) {
            for (const spec of suite.specs) {
              if (spec.tests && spec.tests.length > 0) {
                for (const test of spec.tests) {
                  if (test.results && test.results.length > 0) {
                    for (const result of test.results) {
                      if (result.attachments && result.attachments.length > 0) {
                        const screenshot = result.attachments.find(a => a.name === 'screenshot' || a.contentType?.includes('image'));
                        if (screenshot && screenshot.path) {
                          screenshotPath = screenshot.path;
                          break;
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    } catch (e) {
      // JSON parse başarısız, varsayılan değerleri kullan
    }

    // Test geçti mi kontrol et
    const testPassed = failed === 0 && passed > 0;

    await createLog('ORCHESTRATOR', testPassed ? 'SUCCESS' : 'ERROR',
      testPassed ? `Test PASSED (${duration}ms)` : `Test FAILED (${duration}ms)`);

    return {
      success: testPassed,
      duration,
      passed,
      failed,
      output: stdout,
      screenshotPath
    };

  } catch (error) {
    const duration = Date.now() - startTime;

    // Detaylı hata logla
    console.error(`[Orchestrator] Test execution error:`, error.message);
    if (error.stdout) {
      console.log(`[Orchestrator] STDOUT:`, error.stdout);
    }
    if (error.stderr) {
      console.error(`[Orchestrator] STDERR:`, error.stderr);
    }

    await updateAgentStatus('ORCHESTRATOR', 'ERROR', 'Test başarısız');
    await createLog('ORCHESTRATOR', 'ERROR', `Test FAILED: ${error.message}`);

    // stderr varsa onu da logla
    if (error.stderr) {
      await createLog('ORCHESTRATOR', 'ERROR', `Hata detayı: ${error.stderr.substring(0, 500)}`);
    }

    return {
      success: false,
      duration,
      error: error.message,
      stderr: error.stderr || '',
      output: error.stdout || ''
    };
  }
}

/**
 * Agent durumunu güncelle
 */
async function updateAgentStatus(agentType, status, task) {
  try {
    const agent = await prisma.agent.findFirst({
      where: { type: agentType }
    });

    if (agent) {
      const updated = await prisma.agent.update({
        where: { id: agent.id },
        data: {
          status,
          currentTask: task
        }
      });

      emitAgentStatus(updated);
    }
  } catch (error) {
    console.error('Agent status update error:', error);
  }
}

/**
 * Log oluştur
 */
async function createLog(agentType, level, message) {
  try {
    const agent = await prisma.agent.findFirst({
      where: { type: agentType }
    });

    const log = await prisma.log.create({
      data: {
        agentId: agent?.id,
        level,
        message: agent ? `${agent.name}: ${message}` : message
      }
    });

    emitNewLog(log);
  } catch (error) {
    console.error('Log creation error:', error);
  }
}

/**
 * Agent'ları hazırla
 */
async function prepareAgents() {
  const agents = await prisma.agent.findMany();

  for (const agent of agents) {
    await prisma.agent.update({
      where: { id: agent.id },
      data: { status: 'IDLE', currentTask: null }
    });
    emitAgentStatus({ ...agent, status: 'IDLE', currentTask: null });
  }
}

/**
 * Agent'ları sıfırla
 */
async function resetAgents() {
  const agents = await prisma.agent.findMany();

  for (const agent of agents) {
    const updated = await prisma.agent.update({
      where: { id: agent.id },
      data: { status: 'IDLE', currentTask: null }
    });
    emitAgentStatus(updated);
  }
}

/**
 * Aktif iş akışını getir
 */
export function getWorkflow(workflowId) {
  return activeWorkflows.get(workflowId);
}

/**
 * Tüm aktif iş akışlarını getir
 */
export function getAllWorkflows() {
  return Array.from(activeWorkflows.values());
}

/**
 * İş akışını iptal et
 */
export async function cancelWorkflow(workflowId) {
  const workflow = activeWorkflows.get(workflowId);

  if (workflow && workflow.status !== WORKFLOW_STATUS.COMPLETED && workflow.status !== WORKFLOW_STATUS.FAILED) {
    workflow.status = WORKFLOW_STATUS.FAILED;
    workflow.error = 'İş akışı kullanıcı tarafından iptal edildi';
    workflow.finishedAt = new Date();

    await playwrightService.closeBrowser();
    await resetAgents();

    return true;
  }

  return false;
}

/**
 * Proje bağlantısını test et
 */
export async function testProjectConnection(project) {
  let page = null;

  try {
    await playwrightService.launchBrowser({ headless: true });
    page = await playwrightService.createPage();

    // Base URL'e git
    if (!project.baseUrl) {
      throw new Error('Base URL tanımlı değil');
    }

    const navResult = await playwrightService.navigateToUrl(page, project.baseUrl);
    if (!navResult.success) {
      throw new Error(`Sayfaya erişilemedi: ${navResult.error}`);
    }

    // Login test et
    if (project.loginUrl && project.loginUsername) {
      const loginResult = await playwrightService.login(page, project);
      if (!loginResult.success) {
        return {
          success: false,
          baseUrlOk: true,
          loginOk: false,
          error: loginResult.error
        };
      }

      return {
        success: true,
        baseUrlOk: true,
        loginOk: true,
        currentUrl: page.url()
      };
    }

    return {
      success: true,
      baseUrlOk: true,
      loginOk: null, // Login yapılandırılmamış
      currentUrl: page.url()
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };

  } finally {
    await playwrightService.closeBrowser();
  }
}

export default {
  startFullWorkflow,
  discoverElementsForScenario,
  generateScriptForScenario,
  runTestForScenario,
  getWorkflow,
  getAllWorkflows,
  cancelWorkflow,
  testProjectConnection,
  WORKFLOW_STATUS
};
