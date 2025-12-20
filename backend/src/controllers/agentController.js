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

export default {
  getAllAgents,
  getAgent,
  getAgentStatus,
  updateAgentStatus,
  startAgent,
  stopAgent,
  resetAllAgents,
  getAgentLogs
};
