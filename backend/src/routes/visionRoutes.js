/**
 * Vision API Routes
 * Screenshot-based element detection
 */

import express from 'express';
import { analyzeScreenshot } from '../controllers/visionController.js';

const router = express.Router();

/**
 * POST /api/vision/analyze
 * Analyze screenshot and find element coordinates
 */
router.post('/analyze', analyzeScreenshot);

export default router;
