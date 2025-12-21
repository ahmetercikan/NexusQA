import prisma from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { emitAgentStatus, emitNewLog } from '../websocket/socketHandler.js';
import crewAIBridge from '../services/crewAIBridge.js';

// Get all agents
export const getAllAgents = asyncHandler(async (req, res) => {
  const agents = await prisma.agent.findMany({
    orderBy: { id: 'asc' },
    include: {
      _count: {
        select: { testRuns: true, logs: true }
      }
    }
  });

  res.json({
    success: true,
    data: agents
  });
});

// Get single agent
export const getAgent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const agent = await prisma.agent.findUnique({
    where: { id: parseInt(id) },
    include: {
      testRuns: {
        orderBy: { startedAt: 'desc' },
        take: 10
      },
      logs: {
        orderBy: { createdAt: 'desc' },
        take: 20
      }
    }
  });

  if (!agent) {
    throw new AppError('Agent not found', 404);
  }

  res.json({
    success: true,
    data: agent
  });
});

// Get agent status
export const getAgentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const agent = await prisma.agent.findUnique({
    where: { id: parseInt(id) },
    select: {
      id: true,
      name: true,
      status: true,
      currentTask: true,
      efficiency: true,
      totalCost: true
    }
  });

  if (!agent) {
    throw new AppError('Agent not found', 404);
  }

  res.json({
    success: true,
    data: agent
  });
});

// Update agent status
export const updateAgentStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, currentTask, efficiency, cost } = req.body;

  const updateData = {};
  if (status) updateData.status = status;
  if (currentTask !== undefined) updateData.currentTask = currentTask;
  if (efficiency !== undefined) updateData.efficiency = efficiency;
  if (cost !== undefined) {
    updateData.totalCost = { increment: parseFloat(cost) };
  }

  const agent = await prisma.agent.update({
    where: { id: parseInt(id) },
    data: updateData
  });

  // Emit status change via WebSocket
  emitAgentStatus(agent);

  res.json({
    success: true,
    message: 'Agent status updated',
    data: agent
  });
});

// Start agent
export const startAgent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { task, suiteId } = req.body;

  const agent = await prisma.agent.findUnique({
    where: { id: parseInt(id) }
  });

  if (!agent) {
    throw new AppError('Agent not found', 404);
  }

  if (agent.status === 'WORKING') {
    throw new AppError('Agent is already working', 400);
  }

  // Update agent status
  const updatedAgent = await prisma.agent.update({
    where: { id: parseInt(id) },
    data: {
      status: 'WORKING',
      currentTask: task || 'Starting task...'
    }
  });

  // Create log entry
  const log = await prisma.log.create({
    data: {
      agentId: parseInt(id),
      level: 'INFO',
      message: `Agent ${agent.name} started: ${task || 'No task specified'}`,
      metadata: { suiteId }
    }
  });

  // Emit events
  emitAgentStatus(updatedAgent);
  emitNewLog(log);

  // Trigger CrewAI (async, don't wait)
  if (suiteId) {
    crewAIBridge.triggerAgent(agent.type, suiteId).catch(err => {
      console.error('CrewAI trigger error:', err);
    });
  }

  res.json({
    success: true,
    message: `Agent ${agent.name} started`,
    data: updatedAgent
  });
});

// Stop agent
export const stopAgent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const agent = await prisma.agent.findUnique({
    where: { id: parseInt(id) }
  });

  if (!agent) {
    throw new AppError('Agent not found', 404);
  }

  const updatedAgent = await prisma.agent.update({
    where: { id: parseInt(id) },
    data: {
      status: 'IDLE',
      currentTask: null
    }
  });

  // Create log entry
  const log = await prisma.log.create({
    data: {
      agentId: parseInt(id),
      level: 'INFO',
      message: `Agent ${agent.name} stopped`
    }
  });

  emitAgentStatus(updatedAgent);
  emitNewLog(log);

  res.json({
    success: true,
    message: `Agent ${agent.name} stopped`,
    data: updatedAgent
  });
});

// Reset all agents to idle
export const resetAllAgents = asyncHandler(async (req, res) => {
  await prisma.agent.updateMany({
    data: {
      status: 'IDLE',
      currentTask: null
    }
  });

  const agents = await prisma.agent.findMany();

  // Emit status for each agent
  agents.forEach(agent => emitAgentStatus(agent));

  res.json({
    success: true,
    message: 'All agents reset to idle',
    data: agents
  });
});

// Get agent logs
export const getAgentLogs = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { limit = 50, level } = req.query;

  const where = { agentId: parseInt(id) };
  if (level) {
    where.level = level.toUpperCase();
  }

  const logs = await prisma.log.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit)
  });

  res.json({
    success: true,
    data: logs
  });
});

/**
 * Query an agent with a question
 * POST /api/agents/:agentType/query
 */
export const queryAgent = asyncHandler(async (req, res) => {
  const { agentType } = req.params;
  const { question, context } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }

  // Find agent by type
  const agent = await prisma.agent.findFirst({
    where: { type: agentType }
  });

  if (!agent) {
    return res.status(404).json({ error: `Agent with type ${agentType} not found` });
  }

  // Update agent status
  await prisma.agent.update({
    where: { id: agent.id },
    data: {
      status: 'WORKING',
      currentTask: question.substring(0, 100)
    }
  });

  try {
    // For now, return a mock response
    // TODO: Integrate with CrewAI when ready
    const response = generateMockAgentResponse(agentType, question, context);

    // Log the interaction
    await prisma.log.create({
      data: {
        agentId: agent.id,
        level: 'INFO',
        message: `Query: ${question}`,
        metadata: { question, context, response }
      }
    });

    // Update agent back to IDLE
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        status: 'IDLE',
        currentTask: null
      }
    });

    res.json({
      success: true,
      response,
      agent: {
        id: agent.id,
        name: agent.name,
        role: agent.role
      }
    });
  } catch (error) {
    // Update agent back to IDLE on error
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        status: 'IDLE',
        currentTask: null
      }
    });
    throw error;
  }
});

// Mock response generator (temporary until CrewAI integration)
function generateMockAgentResponse(agentType, question, context) {
  if (agentType === 'REPORT_ANALYST') {
    const { totalRuns, passedTests, failedTests, averageDuration } = context || {};

    if (question.toLowerCase().includes('analiz')) {
      return `Rapor analizi:\n\n` +
        `📊 Toplam ${totalRuns || 0} test koşumu gerçekleştirilmiş.\n` +
        `✅ Başarılı: ${passedTests || 0} test\n` +
        `❌ Başarısız: ${failedTests || 0} test\n` +
        `⏱️ Ortalama süre: ${averageDuration || 0}ms\n\n` +
        `${failedTests > 0
          ? `⚠️ Başarısız testler üzerinde çalışmanız gerekiyor. Element selector'larını ve test adımlarını gözden geçirin.`
          : `🎉 Tüm testler başarılı! Harika bir test coverage'ınız var.`}`;
    }

    if (question.toLowerCase().includes('sorun') || question.toLowerCase().includes('hata')) {
      return `Ortak sorunlar analizi:\n\n` +
        `1. Element selector hatalar (%${failedTests ? Math.floor((failedTests / totalRuns) * 100) : 0})\n` +
        `2. Timeout sorunları\n` +
        `3. Dinamik içerik yükleme problemleri\n\n` +
        `💡 Öneri: Daha güvenilir selector'lar kullanın ve wait stratejilerinizi iyileştirin.`;
    }

    if (question.toLowerCase().includes('iyileştir') || question.toLowerCase().includes('performans')) {
      return `Test performansı iyileştirme önerileri:\n\n` +
        `1. ⚡ Paralel test koşumu kullanın\n` +
        `2. 🎯 Headless mode'da çalıştırın\n` +
        `3. 📦 Test verilerini önceden hazırlayın\n` +
        `4. 🔍 Gereksiz wait'leri kaldırın\n\n` +
        `Ortalama test süresi ${averageDuration}ms. Hedef <5000ms olmalı.`;
    }
  }

  return `Merhaba! Ben ${agentType} agent'ıyım. Sorunuza özel bir yanıt hazırlamak için CrewAI entegrasyonu tamamlanmalı.`;
}

export default {
  getAllAgents,
  getAgent,
  getAgentStatus,
  updateAgentStatus,
  startAgent,
  stopAgent,
  resetAllAgents,
  getAgentLogs,
  queryAgent
};
