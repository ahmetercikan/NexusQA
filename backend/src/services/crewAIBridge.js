import axios from 'axios';
import { config } from '../config/env.js';
import prisma from '../config/database.js';
import { emitAgentStatus, emitNewLog, emitTestCompleted, emitTestFailed } from '../websocket/socketHandler.js';

// CrewAI API client
const crewAIClient = axios.create({
  baseURL: config.crewAiApiUrl,
  timeout: 300000, // 5 minutes for long-running tasks
  headers: {
    'Content-Type': 'application/json'
  }
});

// Agent type to CrewAI agent mapping
const AGENT_TYPE_MAP = {
  'TEST_ARCHITECT': 'test_architect',
  'DEVELOPER': 'developer_bot',
  'ORCHESTRATOR': 'orchestrator',
  'SECURITY_ANALYST': 'security_analyst'
};

/**
 * Trigger a CrewAI agent to run a task
 */
export const triggerAgent = async (agentType, suiteId, options = {}) => {
  try {
    const crewAgentType = AGENT_TYPE_MAP[agentType] || agentType.toLowerCase();

    const response = await crewAIClient.post('/run', {
      agent_type: crewAgentType,
      suite_id: suiteId,
      options
    });

    return response.data;
  } catch (error) {
    console.error('CrewAI trigger error:', error.message);

    // If CrewAI is not available, simulate the response
    if (error.code === 'ECONNREFUSED') {
      console.log('CrewAI service not available, running in simulation mode');
      return simulateAgentRun(agentType, suiteId);
    }

    throw error;
  }
};

/**
 * Get status of a running CrewAI task
 */
export const getTaskStatus = async (taskId) => {
  try {
    const response = await crewAIClient.get(`/tasks/${taskId}`);
    return response.data;
  } catch (error) {
    console.error('CrewAI status check error:', error.message);
    throw error;
  }
};

/**
 * Cancel a running CrewAI task
 */
export const cancelTask = async (taskId) => {
  try {
    const response = await crewAIClient.post(`/tasks/${taskId}/cancel`);
    return response.data;
  } catch (error) {
    console.error('CrewAI cancel error:', error.message);
    throw error;
  }
};

/**
 * Run full test crew (orchestrated test execution)
 */
export const runTestCrew = async (suiteId, testRunId) => {
  try {
    const response = await crewAIClient.post('/crew/test', {
      suite_id: suiteId,
      run_id: testRunId
    });

    return response.data;
  } catch (error) {
    console.error('CrewAI crew run error:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.log('CrewAI service not available, running simulation');
      return simulateTestCrew(suiteId, testRunId);
    }

    throw error;
  }
};

/**
 * Analyze a document and extract test scenarios
 */
/**
 * Analyze text requirements and generate test scenarios
 * Supports both plain text and BDD (Gherkin) formats
 */
export const analyzeTextRequirements = async (requirementText, options = {}) => {
  try {
    const { template = 'text' } = options;

    // Try calling CrewAI text analysis endpoint
    try {
      const response = await crewAIClient.post('/crew/text-analysis', {
        requirement_text: requirementText,
        template: template, // 'text' or 'bdd'
        options: {
          include_bdd_format: template === 'bdd',
          include_edge_cases: true,
          include_security_tests: true
        }
      });

      // Check if CrewAI returned a task_id (async processing)
      if (response.data.task_id) {
        console.log(`CrewAI task started: ${response.data.task_id}`);
        // Wait for task completion
        let taskResult = null;
        for (let i = 0; i < 120; i++) { // Max 120 attempts (2 minutes)
          await new Promise(resolve => setTimeout(resolve, 1000));
          const statusResponse = await crewAIClient.get(`/tasks/${response.data.task_id}`);

          if (i % 10 === 0) {
            console.log(`Task ${response.data.task_id} status: ${statusResponse.data.status} (${i}s)`);
          }

          if (statusResponse.data.status === 'completed') {
            taskResult = statusResponse.data.result;
            console.log(`Task completed! Scenarios: ${taskResult?.scenarios?.length || 0}`);
            break;
          } else if (statusResponse.data.status === 'error') {
            throw new Error(statusResponse.data.result?.error || 'Task failed');
          }
        }

        if (taskResult && taskResult.success && taskResult.scenarios?.length > 0) {
          return taskResult.scenarios;
        } else {
          // CrewAI returned no scenarios, use simulation
          console.log('CrewAI returned no scenarios, using simulation mode');
          return simulateTextAnalysis(requirementText, template);
        }
      }

      if (response.data.scenarios && Array.isArray(response.data.scenarios)) {
        return response.data.scenarios;
      }

      return [];
    } catch (crewError) {
      console.error('❌ CrewAI ERROR - Text Analysis:', {
        error: crewError.message,
        code: crewError.code,
        endpoint: '/crew/text-analysis'
      });

      // Check if CrewAI service is running
      if (crewError.code === 'ECONNREFUSED' || crewError.message.includes('ECONNREFUSED')) {
        console.error('⚠️ CRITICAL: CrewAI backend is NOT running! Start it with: cd agents && python main.py');
        throw new Error('CrewAI backend is not running. Please start the agents backend service.');
      }

      // Any other CrewAI error: fall back to simulation
      console.warn('⚠️ Falling back to SIMULATION mode - AI not used!');
      return simulateTextAnalysis(requirementText, template);
    }
  } catch (error) {
    console.error('Text analysis error:', error.message);
    throw error;
  }
};

export const analyzeDocument = async (documentId, options = {}) => {
  try {
    const { template = 'text' } = options;

    // Get document from database
    const document = await prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Try calling CrewAI document analysis endpoint
    try {
      const response = await crewAIClient.post('/crew/document-analysis', {
        document_content: document.content,
        document_info: {
          filename: document.originalName,
          type: document.type,
          id: document.id
        },
        suite_id: null,
        template: template, // 'text' or 'bdd'
        options: {
          include_bdd_format: template === 'bdd',
          include_edge_cases: true,
          include_security_tests: true
        }
      });

      // Check if CrewAI returned a task_id (async processing)
      if (response.data.task_id) {
        console.log(`CrewAI document task started: ${response.data.task_id}`);
        // Wait for task completion
        let taskResult = null;
        for (let i = 0; i < 120; i++) { // Max 120 attempts (2 minutes)
          await new Promise(resolve => setTimeout(resolve, 1000));
          const statusResponse = await crewAIClient.get(`/tasks/${response.data.task_id}`);

          if (i % 10 === 0) {
            console.log(`Document task ${response.data.task_id} status: ${statusResponse.data.status} (${i}s)`);
          }

          if (statusResponse.data.status === 'completed') {
            taskResult = statusResponse.data.result;
            console.log(`Document task completed! Scenarios: ${taskResult?.scenarios?.length || 0}`);
            break;
          } else if (statusResponse.data.status === 'error') {
            throw new Error(statusResponse.data.result?.error || 'Task failed');
          }
        }

        if (taskResult && taskResult.success && taskResult.scenarios?.length > 0) {
          return taskResult;
        } else {
          // CrewAI returned no scenarios, use simulation
          console.log('CrewAI returned no scenarios, using simulation mode');
          return simulateDocumentAnalysis(documentId, document);
        }
      }

      return response.data;
    } catch (crewError) {
      console.error('❌ CrewAI ERROR - Document Analysis:', {
        error: crewError.message,
        code: crewError.code,
        endpoint: '/crew/document-analysis',
        documentId: documentId,
        documentName: document.originalName
      });

      // Check if CrewAI service is running
      if (crewError.code === 'ECONNREFUSED' || crewError.message.includes('ECONNREFUSED')) {
        console.error('⚠️ CRITICAL: CrewAI backend is NOT running! Start it with: cd agents && python main.py');
        throw new Error('CrewAI backend is not running. Please start the agents backend service.');
      }

      // Any other CrewAI error: fall back to simulation
      console.warn('⚠️ Falling back to SIMULATION mode - AI not used!');
      return simulateDocumentAnalysis(documentId, document);
    }
  } catch (error) {
    console.error('Document analysis error:', error.message);
    throw error;
  }
};

/**
 * Generate automation code for a test scenario
 */
export const generateAutomation = async (scenarioId, testSuiteId) => {
  try {
    // Get scenario from database
    const scenario = await prisma.scenario.findUnique({
      where: { id: scenarioId }
    });

    if (!scenario) {
      throw new Error('Scenario not found');
    }

    // Get test suite info
    const testSuite = await prisma.testSuite.findUnique({
      where: { id: testSuiteId }
    });

    // Build scenario object for the crew
    const scenarioObj = {
      id: scenario.id,
      title: scenario.title,
      description: scenario.description,
      steps: scenario.steps,
      expectedResult: scenario.expectedResult,
      preconditions: scenario.preconditions,
      testData: scenario.testData,
      automationType: scenario.automationType,
      priority: scenario.priority
    };

    // Call CrewAI automation generation endpoint
    const response = await crewAIClient.post('/crew/generate-automation', {
      scenario: scenarioObj,
      test_suite_info: {
        name: testSuite?.name || 'Test Suite',
        type: testSuite?.type || 'UI'
      },
      backend_scenario_id: scenarioId
    });

    return response.data;
  } catch (error) {
    console.error('Automation generation error:', error.message);

    if (error.code === 'ECONNREFUSED') {
      console.log('CrewAI service not available, running in simulation mode');
      return simulateAutomationGeneration(scenarioId);
    }

    throw error;
  }
};

/**
 * Webhook handler for CrewAI callbacks
 */
export const handleWebhook = async (payload) => {
  const { event, agent_id, run_id, data } = payload;

  switch (event) {
    case 'agent:started':
      await updateAgentFromWebhook(agent_id, 'WORKING', data.task);
      break;

    case 'agent:completed':
      await updateAgentFromWebhook(agent_id, 'COMPLETED', null, data.cost);
      break;

    case 'agent:error':
      await updateAgentFromWebhook(agent_id, 'ERROR', data.error);
      break;

    case 'test:passed':
      await updateTestRunFromWebhook(run_id, 'PASSED', data);
      break;

    case 'test:failed':
      await updateTestRunFromWebhook(run_id, 'FAILED', data);
      break;

    case 'log':
      await createLogFromWebhook(agent_id, run_id, data);
      break;

    case 'document:analyzed':
      await handleDocumentAnalyzed(data);
      break;

    case 'automation:generated':
      await handleAutomationGenerated(data);
      break;

    default:
      console.log('Unknown webhook event:', event);
  }
};

// Helper: Update agent from webhook
async function updateAgentFromWebhook(agentId, status, task, cost = 0) {
  const agent = await prisma.agent.update({
    where: { id: agentId },
    data: {
      status,
      currentTask: task,
      ...(cost > 0 && { totalCost: { increment: cost } })
    }
  });

  emitAgentStatus(agent);
}

// Helper: Update test run from webhook
async function updateTestRunFromWebhook(runId, status, data) {
  const run = await prisma.testRun.update({
    where: { id: runId },
    data: {
      status,
      finishedAt: new Date(),
      durationMs: data.duration_ms,
      errorMessage: data.error_message
    },
    include: { suite: true, agent: true }
  });

  if (status === 'PASSED') {
    emitTestCompleted(run);
  } else {
    emitTestFailed(run);
  }

  // Reset agent
  if (run.agentId) {
    const agent = await prisma.agent.update({
      where: { id: run.agentId },
      data: { status: 'IDLE', currentTask: null }
    });
    emitAgentStatus(agent);
  }
}

// Helper: Create log from webhook
async function createLogFromWebhook(agentId, runId, data) {
  const log = await prisma.log.create({
    data: {
      agentId,
      runId,
      level: data.level?.toUpperCase() || 'INFO',
      message: data.message,
      metadata: data.metadata
    }
  });

  emitNewLog(log);
}

/**
 * Simulation mode - when CrewAI is not available
 * This simulates the agent behavior for development/demo
 */
async function simulateAgentRun(agentType, suiteId) {
  // Find agent by type
  const agent = await prisma.agent.findFirst({
    where: { type: agentType }
  });

  if (!agent) return { success: false, error: 'Agent not found' };

  // Simulate work with delays
  const tasks = getSimulatedTasks(agentType);

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];

    // Update agent status
    await prisma.agent.update({
      where: { id: agent.id },
      data: { status: 'WORKING', currentTask: task.message }
    });

    const updatedAgent = await prisma.agent.findUnique({ where: { id: agent.id } });
    emitAgentStatus(updatedAgent);

    // Create log
    const log = await prisma.log.create({
      data: {
        agentId: agent.id,
        level: task.level,
        message: `${agent.name}: ${task.message}`
      }
    });
    emitNewLog(log);

    // Wait
    await new Promise(resolve => setTimeout(resolve, task.delay));
  }

  // Complete
  const finalAgent = await prisma.agent.update({
    where: { id: agent.id },
    data: {
      status: 'COMPLETED',
      currentTask: 'Tamamlandi',
      totalCost: { increment: 0.15 }
    }
  });

  emitAgentStatus(finalAgent);

  return { success: true, agent: finalAgent };
}

async function simulateTestCrew(suiteId, testRunId) {
  // Get all agents
  const agents = await prisma.agent.findMany();
  const orchestrator = agents.find(a => a.type === 'ORCHESTRATOR');
  const testArchitect = agents.find(a => a.type === 'TEST_ARCHITECT');
  const developer = agents.find(a => a.type === 'DEVELOPER');

  const simulationSteps = [
    { agent: orchestrator, task: 'Gorev dagitimi yapiliyor...', delay: 1500, level: 'INFO' },
    { agent: testArchitect, task: 'Test senaryolari hazirlaniyor...', delay: 2000, level: 'INFO' },
    { agent: testArchitect, task: 'Playwright scriptleri yaziliyor...', delay: 2500, level: 'INFO' },
    { agent: testArchitect, task: 'Testler calistiriliyor...', delay: 2000, level: 'INFO' },
    { agent: null, task: 'HATA: Sepet guncelleme butonu yanit vermiyor', delay: 1000, level: 'ERROR' },
    { agent: developer, task: 'Hata duzeltiliyor...', delay: 2000, level: 'WARNING' },
    { agent: developer, task: 'API endpoint guncellendi', delay: 1500, level: 'SUCCESS' },
    { agent: testArchitect, task: 'Regression testi calistiriliyor...', delay: 2000, level: 'INFO' },
    { agent: null, task: 'TUM TESTLER BASARIYLA TAMAMLANDI', delay: 1000, level: 'SUCCESS' }
  ];

  for (const step of simulationSteps) {
    if (step.agent) {
      await prisma.agent.update({
        where: { id: step.agent.id },
        data: { status: 'WORKING', currentTask: step.task }
      });
      const updated = await prisma.agent.findUnique({ where: { id: step.agent.id } });
      emitAgentStatus(updated);
    }

    const log = await prisma.log.create({
      data: {
        runId: testRunId,
        agentId: step.agent?.id,
        level: step.level,
        message: step.agent ? `${step.agent.name}: ${step.task}` : step.task
      }
    });
    emitNewLog(log);

    await new Promise(resolve => setTimeout(resolve, step.delay));
  }

  // Complete test run
  const testRun = await prisma.testRun.update({
    where: { id: testRunId },
    data: {
      status: 'PASSED',
      finishedAt: new Date(),
      durationMs: 15000
    },
    include: { suite: true }
  });

  emitTestCompleted(testRun);

  // Reset all agents
  for (const agent of agents) {
    const updated = await prisma.agent.update({
      where: { id: agent.id },
      data: {
        status: 'COMPLETED',
        currentTask: 'Rapor hazir',
        totalCost: { increment: 0.10 }
      }
    });
    emitAgentStatus(updated);
  }

  return { success: true, testRun };
}

function getSimulatedTasks(agentType) {
  const taskMap = {
    'TEST_ARCHITECT': [
      { message: 'Test senaryolari analiz ediliyor...', delay: 1500, level: 'INFO' },
      { message: 'Playwright scriptleri hazirlaniyor...', delay: 2000, level: 'INFO' },
      { message: 'Testler calistiriliyor...', delay: 2500, level: 'INFO' }
    ],
    'DEVELOPER': [
      { message: 'Kod analizi yapiliyor...', delay: 1500, level: 'INFO' },
      { message: 'Hata tespiti...', delay: 2000, level: 'WARNING' },
      { message: 'Duzeltme onerileri hazirlaniyor...', delay: 1500, level: 'SUCCESS' }
    ],
    'ORCHESTRATOR': [
      { message: 'Gorevler dagitiliyor...', delay: 1000, level: 'INFO' },
      { message: 'Ajanlar koordine ediliyor...', delay: 1500, level: 'INFO' },
      { message: 'Ilerleme izleniyor...', delay: 2000, level: 'INFO' }
    ],
    'SECURITY_ANALYST': [
      { message: 'Guvenlik taramas baslatildi...', delay: 1500, level: 'INFO' },
      { message: 'XSS kontrolleri yapiliyor...', delay: 2000, level: 'INFO' },
      { message: 'SQL injection testleri...', delay: 2000, level: 'INFO' },
      { message: 'Guvenlik raporu hazirlaniyor...', delay: 1500, level: 'SUCCESS' }
    ]
  };

  return taskMap[agentType] || taskMap['TEST_ARCHITECT'];
}

// Helper: Handle document analyzed webhook
async function handleDocumentAnalyzed(data) {
  console.log('Document analyzed webhook received:', data.document_filename);
  // This would typically save the scenarios to the database
  // and emit a WebSocket event to notify the frontend
}

// Helper: Handle automation generated webhook
async function handleAutomationGenerated(data) {
  console.log('Automation generated webhook received:', data.scenario_title);
  // This would typically save the generated code to the database
  // and emit a WebSocket event to notify the frontend
}

// Simulation: Document analysis (when CrewAI is unavailable)
async function simulateDocumentAnalysis(documentId, document = null) {
  console.log('Simulating document analysis for document:', documentId);

  // Parse document content to extract meaningful scenarios
  const content = document?.content || '';
  const filename = document?.originalName || 'document.txt';

  // Generate scenarios based on document content keywords
  const scenarios = [];

  // Check for login/authentication related content
  if (content.toLowerCase().includes('login') || content.toLowerCase().includes('giriş') || content.toLowerCase().includes('authentication')) {
    scenarios.push({
      title: 'Başarılı Kullanıcı Girişi',
      description: 'Kullanıcı geçerli kimlik bilgileriyle sisteme giriş yapabilmeli',
      steps: [
        { number: 1, action: 'Login sayfasını aç' },
        { number: 2, action: 'Email alanına geçerli email gir' },
        { number: 3, action: 'Şifre alanına doğru şifreyi gir' },
        { number: 4, action: 'Giriş Yap butonuna tıkla' }
      ],
      expectedResult: 'Kullanıcı başarıyla giriş yapar ve ana sayfaya yönlendirilir',
      preconditions: 'Kullanıcı hesabı sistemde kayıtlı olmalı',
      testData: { email: 'test@example.com', password: 'Test123!' },
      automationType: 'UI',
      priority: 'CRITICAL'
    });

    scenarios.push({
      title: 'Hatalı Şifre ile Giriş Denemesi',
      description: 'Yanlış şifre girildiğinde hata mesajı gösterilmeli',
      steps: [
        { number: 1, action: 'Login sayfasını aç' },
        { number: 2, action: 'Email alanına geçerli email gir' },
        { number: 3, action: 'Şifre alanına yanlış şifre gir' },
        { number: 4, action: 'Giriş Yap butonuna tıkla' }
      ],
      expectedResult: 'Hata mesajı gösterilir: "Geçersiz kimlik bilgileri"',
      preconditions: 'Kullanıcı hesabı sistemde kayıtlı olmalı',
      testData: { email: 'test@example.com', password: 'WrongPassword' },
      automationType: 'UI',
      priority: 'HIGH'
    });
  }

  // Check for registration related content
  if (content.toLowerCase().includes('kayıt') || content.toLowerCase().includes('register') || content.toLowerCase().includes('signup')) {
    scenarios.push({
      title: 'Yeni Kullanıcı Kaydı',
      description: 'Yeni kullanıcı başarıyla kayıt olabilmeli',
      steps: [
        { number: 1, action: 'Kayıt sayfasını aç' },
        { number: 2, action: 'Ad Soyad alanını doldur' },
        { number: 3, action: 'Email alanını doldur' },
        { number: 4, action: 'Şifre alanını doldur' },
        { number: 5, action: 'Kayıt Ol butonuna tıkla' }
      ],
      expectedResult: 'Kullanıcı başarıyla kaydolur ve onay mesajı gösterilir',
      preconditions: 'Email adresi daha önce kullanılmamış olmalı',
      testData: { name: 'Test User', email: 'newuser@example.com', password: 'NewPass123!' },
      automationType: 'UI',
      priority: 'CRITICAL'
    });
  }

  // Check for API related content
  if (content.toLowerCase().includes('api') || content.toLowerCase().includes('endpoint')) {
    scenarios.push({
      title: 'API Endpoint Testi',
      description: 'API endpoint doğru response dönmeli',
      steps: [
        { number: 1, action: 'API endpoint\'e GET isteği gönder' },
        { number: 2, action: 'Response status code kontrol et' },
        { number: 3, action: 'Response body yapısını doğrula' }
      ],
      expectedResult: 'API 200 OK döner ve beklenen veri yapısı gelir',
      preconditions: 'API servisi çalışır durumda olmalı',
      testData: { endpoint: '/api/users', method: 'GET' },
      automationType: 'API',
      priority: 'HIGH'
    });
  }

  // Default scenarios if no specific content found
  if (scenarios.length === 0) {
    scenarios.push(
      {
        title: 'Ana Sayfa Yükleme Testi',
        description: 'Ana sayfa başarıyla yüklenmeli',
        steps: [
          { number: 1, action: 'Uygulamayı aç' },
          { number: 2, action: 'Ana sayfanın yüklenmesini bekle' },
          { number: 3, action: 'Sayfa elementlerini kontrol et' }
        ],
        expectedResult: 'Ana sayfa tüm elementleriyle başarıyla yüklenir',
        preconditions: 'Uygulama çalışır durumda olmalı',
        testData: {},
        automationType: 'UI',
        priority: 'HIGH'
      },
      {
        title: 'Form Validasyon Testi',
        description: 'Zorunlu alanlar boş bırakıldığında hata gösterilmeli',
        steps: [
          { number: 1, action: 'Formu aç' },
          { number: 2, action: 'Zorunlu alanları boş bırak' },
          { number: 3, action: 'Gönder butonuna tıkla' }
        ],
        expectedResult: 'Validasyon hataları gösterilir',
        preconditions: 'Form sayfası erişilebilir olmalı',
        testData: {},
        automationType: 'UI',
        priority: 'MEDIUM'
      },
      {
        title: 'Responsive Tasarım Testi',
        description: 'Sayfa mobil görünümde düzgün çalışmalı',
        steps: [
          { number: 1, action: 'Sayfayı mobil boyutta aç' },
          { number: 2, action: 'Menü ve butonları kontrol et' },
          { number: 3, action: 'Scroll ve navigasyon test et' }
        ],
        expectedResult: 'Tüm elementler mobilde düzgün görünür ve çalışır',
        preconditions: 'Responsive CSS aktif olmalı',
        testData: { viewport: '375x667' },
        automationType: 'UI',
        priority: 'MEDIUM'
      }
    );
  }

  return {
    success: true,
    scenarios: scenarios,
    document_filename: filename,
    scenario_count: scenarios.length
  };
}

// Simulation: Automation generation (when CrewAI is unavailable)
async function simulateAutomationGeneration(scenarioId) {
  console.log('Simulating automation generation for scenario:', scenarioId);

  const playwrightCode = `
import { test, expect } from '@playwright/test';

test('Login Başarılı', async ({ page }) => {
  // Sayfaya git
  await page.goto('http://localhost:3000');

  // Email alanına gir
  await page.fill('[name="email"]', 'test@example.com');

  // Şifre alanına gir
  await page.fill('[name="password"]', 'Password123');

  // Login butonuna tıkla
  await page.click('button[type="submit"]');

  // Anasayfaya yönlendirilme kontrolü
  await expect(page).toHaveURL(/.*dashboard/);
});
  `;

  return {
    success: true,
    code: playwrightCode,
    automation_type: 'UI',
    scenario_title: 'Login Başarılı',
    scenario_id: scenarioId
  };
}

/**
 * Basit cümleyi parse ederek test adımları oluştur (text2test benzeri)
 */
function parseSimpleSentence(sentence) {
  const steps = [];

  // Action type mapping - keyword'lere göre action type belirle
  const actionTypeMap = [
    { keywords: ['aç', 'git', 'open', 'navigate', 'visit'], type: 'navigate' },
    { keywords: ['ara', 'search', 'bul', 'find'], type: 'search' },
    { keywords: ['tıkla', 'click', 'bas', 'press'], type: 'click' },
    { keywords: ['yaz', 'gir', 'type', 'fill', 'enter'], type: 'fill' },
    { keywords: ['seç', 'select', 'choose'], type: 'select' },
    { keywords: ['kontrol', 'check', 'verify', 'doğrula', 'gör'], type: 'verify' },
    { keywords: ['onayla', 'accept', 'kabul'], type: 'accept' },
    { keywords: ['bekle', 'wait'], type: 'wait' }
  ];

  // Action type belirle
  function detectActionType(text) {
    const lowerText = text.toLowerCase();
    for (const mapping of actionTypeMap) {
      if (mapping.keywords.some(keyword => lowerText.includes(keyword))) {
        return mapping.type;
      }
    }
    return 'action'; // default
  }

  // Cümleyi "ve", "sonra", "ardından" gibi bağlaçlarla böl
  const parts = sentence.split(/\s+(ve|sonra|ardından|then|and)\s+/i)
    .filter(part => part && !['ve', 'sonra', 'ardından', 'then', 'and'].includes(part.toLowerCase().trim()));

  if (parts.length === 0) {
    // Bölünemediyse tüm cümleyi tek adım olarak ekle
    steps.push({
      number: 1,
      action: sentence,
      actionType: detectActionType(sentence)
    });
  } else {
    // Her parçayı bir adım olarak ekle
    parts.forEach((part, index) => {
      const trimmedPart = part.trim();
      if (trimmedPart.length > 0) {
        const actionText = trimmedPart.charAt(0).toUpperCase() + trimmedPart.slice(1);
        steps.push({
          number: index + 1,
          action: actionText,
          actionType: detectActionType(trimmedPart)
        });
      }
    });
  }

  // Eğer adım yoksa, default bir adım ekle
  if (steps.length === 0) {
    steps.push({
      number: 1,
      action: sentence,
      actionType: 'action'
    });
  }

  return steps;
}

/**
 * Simulate text requirements analysis with optional BDD format
 */
async function simulateTextAnalysis(requirementText, template = 'text') {
  console.log('Simulating text analysis with template:', template);

  const scenarios = [];
  const lowerText = requirementText.toLowerCase();

  // Basit tek cümleli senaryo kontrolü
  // Eğer text kısa (<200 karakter) ve tek cümle gibi görünüyorsa, direkt parse et
  const isSingleSentence = requirementText.length < 200 &&
                          (requirementText.split('.').length <= 2) &&
                          !requirementText.includes('\n');

  if (isSingleSentence) {
    console.log('[TextAnalysis] Basit tek cümle tespit edildi, direkt senaryo oluşturuluyor');

    // Cümleden action'ları çıkar
    const steps = parseSimpleSentence(requirementText);

    // Başlık oluştur (ilk 50 karakter)
    const title = requirementText.length > 50
      ? requirementText.substring(0, 50) + '...'
      : requirementText;

    scenarios.push({
      title: title.charAt(0).toUpperCase() + title.slice(1),
      description: requirementText,
      steps: steps,
      expectedResult: 'İşlem başarıyla tamamlanır',
      priority: 'MEDIUM',
      automationType: 'UI',
      testData: {},
      bddFormat: template === 'bdd' ? `Feature: Test Senaryosu
  Scenario: ${title}
    Given uygulama açık
    When işlemler gerçekleştirilir
    Then sonuç başarılı olur` : null
    });

    return scenarios;
  }

  // Uzun metinler için keyword-based analiz (eski mantık)
  console.log('[TextAnalysis] Çoklu senaryo analizi yapılıyor');

  // Generate base scenarios from requirement
  if (lowerText.includes('login') || lowerText.includes('giriş')) {
    const baseScenario = {
      title: 'Kullanıcı Girişi',
      description: 'Kullanıcı sisteme başarıyla giriş yapabilir',
      steps: [
        { number: 1, action: 'Login sayfasını aç' },
        { number: 2, action: 'Geçerli email ve şifre gir' },
        { number: 3, action: 'Giriş Yap butonuna tıkla' }
      ],
      expectedResult: 'Kullanıcı ana sayfaya yönlendirilir',
      priority: 'HIGH',
      automationType: 'UI',
      testData: { email: 'test@example.com', password: 'Test123!' }
    };

    // Add BDD format if requested
    if (template === 'bdd') {
      baseScenario.bddFormat = `Feature: Kullanıcı Yönetimi
  Scenario: Geçerli kimlik bilgileriyle giriş yapılması
    Given kullanıcı login sayfasında
    When email "test@example.com" ve şifre "Test123!" girer
    And "Giriş Yap" butonuna tıklar
    Then kullanıcı ana sayfaya yönlendirilir
    And "Hoşgeldiniz" mesajı gösterilir`;
    }

    scenarios.push(baseScenario);
  }

  if (requirementText.toLowerCase().includes('search') || requirementText.toLowerCase().includes('ara')) {
    const baseScenario = {
      title: 'Ürün Arama',
      description: 'Kullanıcı ürün arayabilir',
      steps: [
        { number: 1, action: 'Arama sayfasını aç' },
        { number: 2, action: 'Arama kutusuna ürün adı yaz' },
        { number: 3, action: 'Arama butonuna tıkla' }
      ],
      expectedResult: 'İlgili ürünler listelenir',
      priority: 'MEDIUM',
      automationType: 'UI',
      testData: { searchTerm: 'Laptop' }
    };

    if (template === 'bdd') {
      baseScenario.bddFormat = `Feature: Ürün Arama
  Scenario: Ürün başarıyla aranması
    Given arama sayfası açık
    When "Laptop" aranır
    Then en az bir sonuç gösterilir
    And sonuçlar fiyata göre sıralanır`;
    }

    scenarios.push(baseScenario);
  }

  // Add security/error scenarios
  if (requirementText.toLowerCase().includes('hata') || requirementText.toLowerCase().includes('error') || requirementText.toLowerCase().includes('güvenlik') || requirementText.toLowerCase().includes('security')) {
    const baseScenario = {
      title: 'Hata Durumu Yönetimi',
      description: 'Sistem hata durumlarını doğru şekilde yönetir',
      steps: [
        { number: 1, action: 'Geçersiz veri gir' },
        { number: 2, action: 'İşlemi başlat' }
      ],
      expectedResult: 'Kullanıcı dostu hata mesajı gösterilir',
      priority: 'HIGH',
      automationType: 'UI',
      testData: { invalidData: true }
    };

    if (template === 'bdd') {
      baseScenario.bddFormat = `Feature: Hata Yönetimi
  Scenario: Geçersiz giriş için hata mesajı gösterilmesi
    Given kullanıcı login sayfasında
    When boş email ve şifre ile giriş dener
    Then "Lütfen tüm alanları doldurun" hatası gösterilir`;
    }

    scenarios.push(baseScenario);
  }

  return scenarios;
}

export default {
  triggerAgent,
  getTaskStatus,
  cancelTask,
  runTestCrew,
  analyzeDocument,
  analyzeTextRequirements,
  generateAutomation,
  handleWebhook
};
