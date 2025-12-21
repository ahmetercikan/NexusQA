import { Router } from 'express';
import {
  getAllAgents,
  getAgent,
  getAgentStatus,
  updateAgentStatus,
  startAgent,
  stopAgent,
  resetAllAgents,
  getAgentLogs,
  queryAgent
} from '../controllers/agentController.js';

const router = Router();

// GET /api/agents - List all agents
router.get('/', getAllAgents);

// POST /api/agents/reset - Reset all agents to idle
router.post('/reset', resetAllAgents);

// GET /api/agents/:id - Get single agent
router.get('/:id', getAgent);

// GET /api/agents/:id/status - Get agent status
router.get('/:id/status', getAgentStatus);

// PUT /api/agents/:id/status - Update agent status
router.put('/:id/status', updateAgentStatus);

// POST /api/agents/:id/start - Start agent
router.post('/:id/start', startAgent);

// POST /api/agents/:id/stop - Stop agent
router.post('/:id/stop', stopAgent);

// GET /api/agents/:id/logs - Get agent logs
router.get('/:id/logs', getAgentLogs);

// POST /api/agents/:agentType/query - Query an agent (by type)
router.post('/:agentType/query', queryAgent);

export default router;
