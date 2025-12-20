import { Router } from 'express';
import projectRoutes from './projectRoutes.js';
import agentRoutes from './agentRoutes.js';
import testRoutes from './testRoutes.js';
import documentRoutes from './documentRoutes.js';
import scenarioRoutes from './scenarioRoutes.js';
import automationRoutes from './automationRoutes.js';

const router = Router();

// API Info
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Nexus QA API',
    version: '1.0.0',
    endpoints: {
      projects: '/api/projects',
      agents: '/api/agents',
      tests: '/api/tests',
      documents: '/api/documents',
      scenarios: '/api/scenarios',
      automation: '/api/automation',
      dashboard: '/api/tests/dashboard',
      health: '/health'
    }
  });
});

// Mount routes
router.use('/projects', projectRoutes);
router.use('/agents', agentRoutes);
router.use('/tests', testRoutes);
router.use('/documents', documentRoutes);
router.use('/scenarios', scenarioRoutes);
router.use('/automation', automationRoutes);

export default router;
