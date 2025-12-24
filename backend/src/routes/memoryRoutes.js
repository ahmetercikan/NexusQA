/**
 * Memory API Routes
 * RAG-based pattern storage and retrieval
 */

import express from 'express';
import { retrievePattern, storePattern, getTop, getAnalytics, getStats } from '../controllers/memoryController.js';

const router = express.Router();

/**
 * POST /api/memory/retrieve
 * Retrieve similar pattern from memory (RAG)
 */
router.post('/retrieve', retrievePattern);

/**
 * POST /api/memory/store
 * Store successful pattern to memory
 */
router.post('/store', storePattern);

/**
 * GET /api/memory/top/:projectId
 * Get top patterns for analytics
 */
router.get('/top/:projectId', getTop);

/**
 * GET /api/memory/analytics/:projectId
 * Get comprehensive memory analytics dashboard
 */
router.get('/analytics/:projectId', getAnalytics);

/**
 * GET /api/memory/stats/:projectId
 * Get quick memory stats (lightweight)
 */
router.get('/stats/:projectId', getStats);

export default router;
