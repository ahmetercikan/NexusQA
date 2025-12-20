import express from 'express';
import {
  createScenario,
  getAllScenarios,
  getScenario,
  updateScenario,
  automateScenario,
  deleteScenario,
} from '../controllers/scenarioController.js';

const router = express.Router();

/**
 * GET /api/scenarios
 * Get all scenarios with optional filtering
 * Query params: suiteId, documentId, isAutomated, status
 */
router.get('/', getAllScenarios);

/**
 * POST /api/scenarios
 * Create a new scenario (manual or from document)
 */
router.post('/', createScenario);

/**
 * GET /api/scenarios/:id
 * Get a single scenario with full details
 */
router.get('/:id', getScenario);

/**
 * PUT /api/scenarios/:id
 * Update a scenario
 */
router.put('/:id', updateScenario);

/**
 * POST /api/scenarios/:id/automate
 * Trigger automation (code generation) for a scenario
 */
router.post('/:id/automate', automateScenario);

/**
 * DELETE /api/scenarios/:id
 * Delete a scenario
 */
router.delete('/:id', deleteScenario);

export default router;
