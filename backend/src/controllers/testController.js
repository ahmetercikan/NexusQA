import prisma from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { emitTestStarted, emitTestCompleted, emitTestFailed, emitNewLog, emitAgentStatus } from '../websocket/socketHandler.js';

// ==================== TEST SUITES ====================

// Get all test suites
export const getAllTestSuites = asyncHandler(async (req, res) => {
  const { projectId, type, isActive } = req.query;

  const where = {};
  if (projectId) where.projectId = parseInt(projectId);
  if (type) where.type = type.toUpperCase();
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const suites = await prisma.testSuite.findMany({
    where,
    include: {
      project: { select: { id: true, name: true } },
      _count: { select: { testCases: true, testRuns: true } }
    },
    orderBy: { updatedAt: 'desc' }
  });

  res.json({
    success: true,
    data: suites
  });
});

// Get single test suite
export const getTestSuite = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const suite = await prisma.testSuite.findUnique({
    where: { id: parseInt(id) },
    include: {
      project: true,
      testCases: {
        orderBy: { priority: 'desc' }
      },
      testRuns: {
        orderBy: { startedAt: 'desc' },
        take: 10,
        include: {
          agent: { select: { id: true, name: true } }
        }
      }
    }
  });

  if (!suite) {
    throw new AppError('Test suite not found', 404);
  }

  res.json({
    success: true,
    data: suite
  });
});

// Create test suite
export const createTestSuite = asyncHandler(async (req, res) => {
  const { projectId, name, description, type } = req.body;

  if (!projectId || !name || !type) {
    throw new AppError('projectId, name and type are required', 400);
  }

  const suite = await prisma.testSuite.create({
    data: {
      projectId: parseInt(projectId),
      name,
      description,
      type: type.toUpperCase(),
      isActive: true
    },
    include: {
      project: { select: { id: true, name: true } }
    }
  });

  res.status(201).json({
    success: true,
    message: 'Test suite created successfully',
    data: suite
  });
});

// Update test suite
export const updateTestSuite = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, type, isActive } = req.body;

  const suite = await prisma.testSuite.update({
    where: { id: parseInt(id) },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(type && { type: type.toUpperCase() }),
      ...(isActive !== undefined && { isActive })
    }
  });

  res.json({
    success: true,
    message: 'Test suite updated successfully',
    data: suite
  });
});

// Delete test suite
export const deleteTestSuite = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await prisma.testSuite.delete({
    where: { id: parseInt(id) }
  });

  res.json({
    success: true,
    message: 'Test suite deleted successfully'
  });
});

// ==================== TEST CASES ====================

// Get test cases for a suite
export const getTestCases = asyncHandler(async (req, res) => {
  const { suiteId } = req.params;
  const { priority, status } = req.query;

  const where = { suiteId: parseInt(suiteId) };
  if (priority) where.priority = priority.toUpperCase();
  if (status) where.status = status.toUpperCase();

  const testCases = await prisma.testCase.findMany({
    where,
    orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }]
  });

  res.json({
    success: true,
    data: testCases
  });
});

// Create test case
export const createTestCase = asyncHandler(async (req, res) => {
  const { suiteId } = req.params;
  const { name, description, steps, expectedResult, priority } = req.body;

  if (!name) {
    throw new AppError('Test case name is required', 400);
  }

  const testCase = await prisma.testCase.create({
    data: {
      suiteId: parseInt(suiteId),
      name,
      description,
      steps,
      expectedResult,
      priority: priority?.toUpperCase() || 'MEDIUM',
      status: 'ACTIVE'
    }
  });

  res.status(201).json({
    success: true,
    message: 'Test case created successfully',
    data: testCase
  });
});

// Update test case
export const updateTestCase = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, steps, expectedResult, priority, status } = req.body;

  const testCase = await prisma.testCase.update({
    where: { id: parseInt(id) },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(steps && { steps }),
      ...(expectedResult !== undefined && { expectedResult }),
      ...(priority && { priority: priority.toUpperCase() }),
      ...(status && { status: status.toUpperCase() })
    }
  });

  res.json({
    success: true,
    message: 'Test case updated successfully',
    data: testCase
  });
});

// Delete test case
export const deleteTestCase = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await prisma.testCase.delete({
    where: { id: parseInt(id) }
  });

  res.json({
    success: true,
    message: 'Test case deleted successfully'
  });
});

// ==================== TEST RUNS ====================

// Get all test runs
export const getAllTestRuns = asyncHandler(async (req, res) => {
  const { suiteId, status, limit = 20 } = req.query;

  const where = {};
  if (suiteId) where.suiteId = parseInt(suiteId);
  if (status) where.status = status.toUpperCase();

  const runs = await prisma.testRun.findMany({
    where,
    include: {
      suite: { select: { id: true, name: true, type: true } },
      agent: { select: { id: true, name: true, role: true } },
      _count: { select: { testResults: true, logs: true } }
    },
    orderBy: { startedAt: 'desc' },
    take: parseInt(limit)
  });

  res.json({
    success: true,
    data: runs
  });
});

// Get single test run
export const getTestRun = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const run = await prisma.testRun.findUnique({
    where: { id: parseInt(id) },
    include: {
      suite: true,
      agent: true,
      testResults: {
        include: {
          testCase: { select: { id: true, name: true } }
        }
      },
      logs: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!run) {
    throw new AppError('Test run not found', 404);
  }

  res.json({
    success: true,
    data: run
  });
});

// Run test suite (start test execution)
export const runTestSuite = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { agentId } = req.body;

  // Verify suite exists
  const suite = await prisma.testSuite.findUnique({
    where: { id: parseInt(id) },
    include: { testCases: true }
  });

  if (!suite) {
    throw new AppError('Test suite not found', 404);
  }

  if (suite.testCases.length === 0) {
    throw new AppError('Test suite has no test cases', 400);
  }

  // Find available agent or use specified one
  let agent = null;
  if (agentId) {
    agent = await prisma.agent.findUnique({ where: { id: parseInt(agentId) } });
  } else {
    // Find first idle TEST_ARCHITECT agent
    agent = await prisma.agent.findFirst({
      where: { type: 'TEST_ARCHITECT', status: 'IDLE' }
    });
  }

  // Create test run
  const testRun = await prisma.testRun.create({
    data: {
      suiteId: parseInt(id),
      agentId: agent?.id,
      status: 'RUNNING',
      startedAt: new Date()
    },
    include: {
      suite: true,
      agent: true
    }
  });

  // Update agent status if assigned
  if (agent) {
    const updatedAgent = await prisma.agent.update({
      where: { id: agent.id },
      data: {
        status: 'WORKING',
        currentTask: `Running: ${suite.name}`
      }
    });
    emitAgentStatus(updatedAgent);
  }

  // Create log
  const log = await prisma.log.create({
    data: {
      runId: testRun.id,
      agentId: agent?.id,
      level: 'INFO',
      message: `Test run started for suite: ${suite.name}`
    }
  });

  emitTestStarted(testRun);
  emitNewLog(log);

  res.status(201).json({
    success: true,
    message: 'Test run started',
    data: testRun
  });
});

// Get test run logs
export const getTestRunLogs = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const logs = await prisma.log.findMany({
    where: { runId: parseInt(id) },
    orderBy: { createdAt: 'asc' }
  });

  res.json({
    success: true,
    data: logs
  });
});

// Cancel test run
export const cancelTestRun = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const run = await prisma.testRun.findUnique({
    where: { id: parseInt(id) },
    include: { agent: true }
  });

  if (!run) {
    throw new AppError('Test run not found', 404);
  }

  if (run.status !== 'RUNNING' && run.status !== 'PENDING') {
    throw new AppError('Test run is not running', 400);
  }

  const updatedRun = await prisma.testRun.update({
    where: { id: parseInt(id) },
    data: {
      status: 'CANCELLED',
      finishedAt: new Date()
    }
  });

  // Reset agent if assigned
  if (run.agentId) {
    const updatedAgent = await prisma.agent.update({
      where: { id: run.agentId },
      data: { status: 'IDLE', currentTask: null }
    });
    emitAgentStatus(updatedAgent);
  }

  res.json({
    success: true,
    message: 'Test run cancelled',
    data: updatedRun
  });
});

// ==================== LOGS ====================

// Get all logs
export const getAllLogs = asyncHandler(async (req, res) => {
  const { level, limit = 100 } = req.query;

  const where = {};
  if (level) where.level = level.toUpperCase();

  const logs = await prisma.log.findMany({
    where,
    include: {
      agent: { select: { id: true, name: true } },
      run: { select: { id: true, status: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: parseInt(limit)
  });

  res.json({
    success: true,
    data: logs
  });
});

// Create log (internal use / webhook)
export const createLog = asyncHandler(async (req, res) => {
  const { runId, agentId, level, message, metadata } = req.body;

  const log = await prisma.log.create({
    data: {
      runId: runId ? parseInt(runId) : null,
      agentId: agentId ? parseInt(agentId) : null,
      level: level?.toUpperCase() || 'INFO',
      message,
      metadata
    }
  });

  emitNewLog(log);

  res.status(201).json({
    success: true,
    data: log
  });
});

// ==================== DASHBOARD STATS ====================

export const getDashboardStats = asyncHandler(async (req, res) => {
  const [
    totalProjects,
    totalSuites,
    totalTestCases,
    recentRuns,
    agents
  ] = await Promise.all([
    prisma.project.count({ where: { isActive: true } }),
    prisma.testSuite.count({ where: { isActive: true } }),
    prisma.testCase.count({ where: { status: 'ACTIVE' } }),
    prisma.testRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 100
    }),
    prisma.agent.findMany()
  ]);

  const passedRuns = recentRuns.filter(r => r.status === 'PASSED').length;
  const failedRuns = recentRuns.filter(r => r.status === 'FAILED').length;
  const runningRuns = recentRuns.filter(r => r.status === 'RUNNING').length;

  const totalCost = agents.reduce((sum, a) => sum + parseFloat(a.totalCost || 0), 0);

  res.json({
    success: true,
    data: {
      projects: totalProjects,
      testSuites: totalSuites,
      testCases: totalTestCases,
      runs: {
        total: recentRuns.length,
        passed: passedRuns,
        failed: failedRuns,
        running: runningRuns,
        passRate: recentRuns.length > 0 ? ((passedRuns / recentRuns.length) * 100).toFixed(2) : 0
      },
      agents: {
        total: agents.length,
        working: agents.filter(a => a.status === 'WORKING').length,
        idle: agents.filter(a => a.status === 'IDLE').length
      },
      totalCost: totalCost.toFixed(2)
    }
  });
});

export default {
  // Test Suites
  getAllTestSuites,
  getTestSuite,
  createTestSuite,
  updateTestSuite,
  deleteTestSuite,
  // Test Cases
  getTestCases,
  createTestCase,
  updateTestCase,
  deleteTestCase,
  // Test Runs
  getAllTestRuns,
  getTestRun,
  runTestSuite,
  getTestRunLogs,
  cancelTestRun,
  // Logs
  getAllLogs,
  createLog,
  // Dashboard
  getDashboardStats
};
