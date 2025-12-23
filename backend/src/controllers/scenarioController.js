import { PrismaClient } from '@prisma/client';
import { generateScriptFromManualScenario, saveScript } from '../services/scriptGenerator.js';
import { triggerAgent, getTaskStatus } from '../services/crewAIBridge.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
 * Create a new scenario (manual or from document)
 * POST /api/scenarios
 */
export const createScenario = async (req, res) => {
  try {
    const {
      documentId,
      suiteId,
      title,
      description,
      screen,
      category,
      steps,
      expectedResult,
      preconditions,
      testData,
      priority,
    } = req.body;

    // Validate required fields
    if (!suiteId || !title) {
      return res.status(400).json({ error: 'suiteId and title are required' });
    }

    // Verify suite exists
    const suite = await prisma.testSuite.findUnique({
      where: { id: parseInt(suiteId) },
    });

    if (!suite) {
      return res.status(404).json({ error: 'Test suite not found' });
    }

    // If documentId is provided, verify it exists
    if (documentId) {
      const document = await prisma.document.findUnique({
        where: { id: parseInt(documentId) },
      });

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
    }

    // Create scenario
    const data = {
      suite: { connect: { id: parseInt(suiteId) } },
      title,
      description: description || null,
      screen: screen || null,
      category: category || null,
      steps: steps || null,
      expectedResult: expectedResult || null,
      preconditions: preconditions || null,
      testData: testData || null,
      priority: priority || 'MEDIUM',
      isAutomated: false,
      status: 'PENDING',
    };
    if (documentId) {
      data.document = { connect: { id: parseInt(documentId) } };
    }
    const scenario = await prisma.scenario.create({ data });

    res.status(201).json({
      success: true,
      scenario: {
        id: scenario.id,
        title: scenario.title,
        priority: scenario.priority,
        status: scenario.status,
        isAutomated: scenario.isAutomated,
        createdAt: scenario.createdAt,
      },
    });
  } catch (error) {
    console.error('Create scenario error:', error);
    res.status(500).json({ error: 'Failed to create scenario' });
  }
};

/**
 * Get all scenarios with filtering
 * GET /api/scenarios
 */
export const getAllScenarios = async (req, res) => {
  try {
    const { suiteId, documentId, isAutomated, status, projectId } = req.query;

    const where = {};
    if (suiteId) {
      where.suiteId = parseInt(suiteId);
    }
    if (documentId) {
      where.documentId = parseInt(documentId);
    }
    if (isAutomated !== undefined) {
      where.isAutomated = isAutomated === 'true';
    }
    if (status) {
      where.status = status;
    }
    // ProjectId filtresi - suite üzerinden project'e bağlı senaryoları getir
    if (projectId) {
      where.suite = {
        projectId: parseInt(projectId)
      };
    }

    const scenarios = await prisma.scenario.findMany({
      where,
      include: {
        suite: {
          select: {
            name: true,
            type: true,
          },
        },
        document: {
          select: {
            id: true,
            originalName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      count: scenarios.length,
      scenarios: scenarios.map((scenario) => ({
        id: scenario.id,
        title: scenario.title,
        description: scenario.description,
        priority: scenario.priority,
        status: scenario.status,
        isAutomated: scenario.isAutomated,
        automationType: scenario.automationType,
        suiteId: scenario.suiteId,
        suiteName: scenario.suite?.name || null,
        documentId: scenario.documentId,
        documentName: scenario.document?.originalName || null,
        createdAt: scenario.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get scenarios error:', error);
    res.status(500).json({ error: 'Failed to retrieve scenarios' });
  }
};

/**
 * Get a single scenario with full details
 * GET /api/scenarios/:id
 */
export const getScenario = async (req, res) => {
  try {
    const { id } = req.params;

    const scenario = await prisma.scenario.findUnique({
      where: { id: parseInt(id) },
      include: {
        suite: true,
        document: {
          select: {
            id: true,
            originalName: true,
            content: true,
            type: true,
          },
        },
      },
    });

    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    res.json({
      success: true,
      scenario: {
        id: scenario.id,
        title: scenario.title,
        description: scenario.description,
        steps: scenario.steps,
        expectedResult: scenario.expectedResult,
        preconditions: scenario.preconditions,
        testData: scenario.testData,
        priority: scenario.priority,
        status: scenario.status,
        isAutomated: scenario.isAutomated,
        automationType: scenario.automationType,
        scriptContent: scenario.scriptContent,
        suite: scenario.suite
          ? {
              id: scenario.suite.id,
              name: scenario.suite.name,
              type: scenario.suite.type,
            }
          : null,
        document: scenario.document
          ? {
              id: scenario.document.id,
              filename: scenario.document.originalName,
              type: scenario.document.type,
            }
          : null,
        createdAt: scenario.createdAt,
        updatedAt: scenario.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get scenario error:', error);
    res.status(500).json({ error: 'Failed to retrieve scenario' });
  }
};

/**
 * Update a scenario
 * PUT /api/scenarios/:id
 */
export const updateScenario = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      steps,
      expectedResult,
      preconditions,
      testData,
      priority,
    } = req.body;

    // Verify scenario exists
    const scenario = await prisma.scenario.findUnique({
      where: { id: parseInt(id) },
    });

    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    // Update scenario
    const updated = await prisma.scenario.update({
      where: { id: parseInt(id) },
      data: {
        title: title || scenario.title,
        description: description !== undefined ? description : scenario.description,
        steps: steps !== undefined ? steps : scenario.steps,
        expectedResult:
          expectedResult !== undefined ? expectedResult : scenario.expectedResult,
        preconditions:
          preconditions !== undefined ? preconditions : scenario.preconditions,
        testData: testData !== undefined ? testData : scenario.testData,
        priority: priority || scenario.priority,
      },
    });

    res.json({
      success: true,
      scenario: {
        id: updated.id,
        title: updated.title,
        priority: updated.priority,
        status: updated.status,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    console.error('Update scenario error:', error);
    res.status(500).json({ error: 'Failed to update scenario' });
  }
};

/**
 * Trigger automation for a scenario
 * POST /api/scenarios/:id/automate
 */
export const automateScenario = async (req, res) => {
  try {
    const { id } = req.params;
    const { automationType } = req.body; // "PLAYWRIGHT" or "API"

    // Verify scenario exists - Project'i de dahil et (baseUrl için)
    const scenario = await prisma.scenario.findUnique({
      where: { id: parseInt(id) },
      include: {
        suite: {
          include: {
            project: true,
          },
        },
      },
    });

    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    // Validate automation type
    if (!automationType || !['PLAYWRIGHT', 'API'].includes(automationType)) {
      return res
        .status(400)
        .json({ error: 'automationType must be PLAYWRIGHT or API' });
    }

    try {
      // Update status to PROCESSING
      await prisma.scenario.update({
        where: { id: parseInt(id) },
        data: {
          status: 'PROCESSING',
          automationType: automationType,
        },
      });

      let scriptPath = null;
      let scriptContent = null;
      let discoveredElements = [];

      // Generate script based on automation type
      if (automationType === 'PLAYWRIGHT') {
        try {
          // BaseUrl'i project'ten al
          const projectBaseUrl = scenario.suite?.project?.baseUrl || 'http://localhost:3000';

          //  1. ADIM: Sayfayı aç ve elementleri keşfet
          console.log(`[Automate] 1. Element keşfi başlıyor: ${projectBaseUrl}`);
          try {
            const { discoverElementsForScenario } = await import('../services/automationOrchestrator.js');
            const discoveryResult = await discoverElementsForScenario(scenario, scenario.suite.project);
            discoveredElements = discoveryResult.mappings || [];
            console.log(`[Automate] ${discoveredElements.length} element keşfedildi`);
          } catch (discoveryError) {
            console.warn(`[Automate] Element keşfi başarısız, devam ediliyor:`, discoveryError.message);
          }

          //  2. ADIM: TEST ARCHITECT AGENT'ı ÇALIŞTIR
          console.log(`[Automate] 2. Test Architect agent başlatılıyor: ${scenario.title}`);
          console.log(`[Automate] Scenario steps:`, JSON.stringify(scenario.steps));
          console.log(`[Automate] Discovered elements:`, discoveredElements.length);

          const agentResult = await triggerAgent('TEST_ARCHITECT', scenario.suiteId, {
            scenario_id: parseInt(id),
            scenario_title: scenario.title,
            scenario_description: scenario.description,
            steps: scenario.steps,
            expected_result: scenario.expectedResult,
            test_data: scenario.testData,
            priority: scenario.priority,
            base_url: projectBaseUrl,
            discovered_elements: discoveredElements, // Keşfedilen elementleri gönder
          });

          console.log(`[Automate] Agent başlatma result:`, agentResult);

          // Agent task_id döndüyse, tamamlanmasını bekle
          let finalResult = agentResult;
          if (agentResult?.task_id && agentResult?.status === 'pending') {
            console.log(`[Automate] Agent task ${agentResult.task_id} başlatıldı, tamamlanması bekleniyor...`);

            // Max 60 saniye bekle (60 deneme x 1 saniye)
            for (let i = 0; i < 60; i++) {
              await new Promise(resolve => setTimeout(resolve, 1000));

              try {
                const statusResponse = await getTaskStatus(agentResult.task_id);

                if (i % 5 === 0) { // Her 5 saniyede bir log
                  console.log(`[Automate] Task ${agentResult.task_id} durumu: ${statusResponse.status} (${i}s)`);
                }

                if (statusResponse.status === 'completed') {
                  finalResult = statusResponse.result || statusResponse;
                  console.log(`[Automate] Agent task tamamlandı! Script var mı:`, !!finalResult.script);
                  break;
                } else if (statusResponse.status === 'error' || statusResponse.status === 'failed') {
                  console.warn(`[Automate] Agent task başarısız: ${statusResponse.error || 'Bilinmeyen hata'}`);
                  break;
                }
              } catch (statusError) {
                console.warn(`[Automate] Task status kontrolünde hata (${i}s):`, statusError.message);
                // Task status alınamazsa devam et, belki sonraki denemede başarılı olur
              }
            }
          }

          console.log(`[Automate] Final agent result:`, finalResult);

          // Agent'ten script'i al veya fallback olarak manuel oluştur
          if (finalResult?.script) {
            // Text locator clicks'i visibility-aware hale getir
            scriptContent = fixTextLocatorClicks(finalResult.script);
            console.log(`[Automate] Agent tarafından optimize edilmiş script üretildi (${scriptContent.length} karakter, text locators fixed)`);
          } else {
            // Fallback: Manuel script generator'ı kullan
            console.log(`[Automate] Agent script üretemedi, manuel generator kullanılıyor`);
            console.log(`[Automate] generateScriptFromManualScenario çağrılıyor...`);
            scriptContent = generateScriptFromManualScenario(scenario, {
              baseUrl: projectBaseUrl,
              elementMappings: discoveredElements, // Keşfedilen elementleri kullan
            });
            console.log(`[Automate] Script üretildi, uzunluk: ${scriptContent?.length}`);
          }
        } catch (agentError) {
          console.warn(`[Automate] Agent çalıştırılırken hata, fallback yapılıyor: ${agentError.message}`);
          console.error(`[Automate] Agent error stack:`, agentError.stack);
          // Agent fail olsa da, manuel script oluştur - projectBaseUrl burada da tanımlı olmalı
          const fallbackBaseUrl = scenario.suite?.project?.baseUrl || 'http://localhost:3000';
          console.log(`[Automate] Fallback: Manuel generator çağrılıyor... (baseUrl: ${fallbackBaseUrl})`);
          scriptContent = generateScriptFromManualScenario(scenario, {
            baseUrl: fallbackBaseUrl,
            elementMappings: discoveredElements, // Keşfedilen elementleri kullan
          });
          console.log(`[Automate] Fallback script üretildi, uzunluk: ${scriptContent?.length}`);
        }

        console.log(`[Automate] Script content hazırlandı, yazdırılıyor...`);

        // Script'i dosya sistemine kaydet - PROJE KLASÖRÜ BAZINDA
        const projectName = scenario.suite?.project?.name || 'default-project';
        const sanitizedProjectName = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

        // Helper: Türkçe karakterleri ASCII'ye çevir
        const sanitizeFilename = (str) => {
          const charMap = {
            'ç': 'c', 'Ç': 'C',
            'ğ': 'g', 'Ğ': 'G',
            'ı': 'i', 'İ': 'I',
            'ö': 'o', 'Ö': 'O',
            'ş': 's', 'Ş': 'S',
            'ü': 'u', 'Ü': 'U'
          };

          // Türkçe karakterleri değiştir
          let sanitized = str.split('').map(char => charMap[char] || char).join('');

          // Sadece a-z, 0-9, tire ve alt çizgi bırak
          sanitized = sanitized.replace(/[^a-zA-Z0-9_-]/g, '_');

          // Çoklu alt çizgileri tek yap
          sanitized = sanitized.replace(/_+/g, '_');

          // Baştaki/sondaki alt çizgileri kaldır
          sanitized = sanitized.replace(/^_+|_+$/g, '');

          return sanitized;
        };

        // Filename: Eğer screen varsa screen-based, yoksa scenario-based
        let filename;
        if (scenario.screen) {
          // Ekran bazlı dosya adı
          const sanitizedScreen = sanitizeFilename(scenario.screen).toLowerCase();
          filename = `${sanitizedScreen}.spec.js`;
        } else {
          // Senaryo bazlı dosya adı - Türkçe karakterleri temizle
          const sanitizedTitle = sanitizeFilename(scenario.title).substring(0, 30);
          filename = `${scenario.id}_${sanitizedTitle}.spec.js`;
        }

        // Proje klasörü oluştur: tests/generated/{project-name}/
        const projectDir = path.join(__dirname, '../../tests/generated', sanitizedProjectName);
        if (!fs.existsSync(projectDir)) {
          console.log(`[Automate] Proje klasörü oluşturuluyor: ${projectDir}`);
          fs.mkdirSync(projectDir, { recursive: true });
        }

        // Screenshots klasörü de oluştur: tests/generated/{project-name}/screenshots/
        const screenshotsDir = path.join(projectDir, 'screenshots');
        if (!fs.existsSync(screenshotsDir)) {
          fs.mkdirSync(screenshotsDir, { recursive: true });
        }

        scriptPath = path.join(projectDir, filename);
        console.log(`[Automate] Script yazılıyor: ${scriptPath}`);
        fs.writeFileSync(scriptPath, scriptContent, 'utf-8');

        console.log(`[Automate] Playwright script oluşturuldu: ${scriptPath}`);
      } else if (automationType === 'API') {
        // API test script'i üret (gelecek aşama)
        scriptContent = `// API test script for: ${scenario.title}\n// Henüz uygulanmadı`;
        console.log(`[Automate] API test henüz desteklenmiyor`);
      }

      // Update scenario with script path and content
      const updated = await prisma.scenario.update({
        where: { id: parseInt(id) },
        data: {
          isAutomated: true,
          status: 'COMPLETED',
          scriptContent: scriptContent,
          scriptPath: scriptPath,
        },
      });

      res.json({
        success: true,
        message: 'Scenario automation generated successfully',
        scenario: {
          id: updated.id,
          title: updated.title,
          status: updated.status,
          isAutomated: updated.isAutomated,
          automationType: updated.automationType,
          scriptPath: updated.scriptPath,
        },
      });
    } catch (error) {
      console.error('Automation generation error:', error);
      
      // Mark as failed
      await prisma.scenario.update({
        where: { id: parseInt(id) },
        data: {
          status: 'FAILED',
        },
      });

      return res.status(500).json({
        error: 'Failed to generate automation script',
        details: error.message,
      });
    }
  } catch (error) {
    console.error('Automate scenario error:', error);
    res.status(500).json({ error: 'Failed to trigger automation' });
  }
};

/**
 * Delete a scenario
 * DELETE /api/scenarios/:id
 */
export const deleteScenario = async (req, res) => {
  try {
    const { id } = req.params;

    const scenario = await prisma.scenario.findUnique({
      where: { id: parseInt(id) },
    });

    if (!scenario) {
      return res.status(404).json({ error: 'Scenario not found' });
    }

    // Delete scenario (cascading delete)
    await prisma.scenario.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Scenario deleted successfully',
    });
  } catch (error) {
    console.error('Delete scenario error:', error);
    res.status(500).json({ error: 'Failed to delete scenario' });
  }
};
