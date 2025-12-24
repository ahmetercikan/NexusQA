/**
 * Vision Controller
 * Screenshot-based element detection using AI Vision
 */

import { generateSelectorWithVision } from '../services/aiSelectorService.js';

/**
 * Analyze screenshot and find element
 * POST /api/vision/analyze
 */
export const analyzeScreenshot = async (req, res) => {
  try {
    const { image, prompt } = req.body;

    if (!image || !prompt) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: image (base64) and prompt'
      });
    }

    console.log('[Vision] Analyzing screenshot for:', prompt);

    // Convert base64 to buffer
    const imageBuffer = Buffer.from(image, 'base64');

    // Call Vision API
    const result = await generateSelectorWithVision(imageBuffer, prompt);

    console.log('[Vision] Result:', result);

    return res.json({
      success: true,
      analysis: result
    });

  } catch (error) {
    console.error('[Vision] Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Vision analysis failed',
      error: error.message
    });
  }
};
