/**
 * Memory Controller - RAG API Endpoints
 * Handles memory storage and retrieval for smart actions
 */

import { storeSuccessfulPattern, retrieveSimilarPattern, getTopPatterns } from '../services/memoryService.js';

/**
 * Retrieve similar pattern from memory (RAG)
 * POST /api/memory/retrieve
 */
export const retrievePattern = async (req, res) => {
  try {
    const { projectId, actionText, urlPattern, isInModal } = req.body;

    if (!projectId || !actionText) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: projectId, actionText'
      });
    }

    console.log('[Memory API] Retrieving pattern:', { projectId, actionText, urlPattern });

    const pattern = await retrieveSimilarPattern({
      projectId: parseInt(projectId),
      actionText,
      urlPattern: urlPattern || 'unknown',
      isInModal: isInModal || false
    });

    if (pattern) {
      console.log('[Memory API] ✓ Pattern found:', pattern.selector);
      return res.json({
        success: true,
        pattern: {
          selector: pattern.selector,
          locatorType: pattern.locatorType,
          confidence: pattern.confidence,
          successCount: pattern.successCount,
          actionText: pattern.actionText
        }
      });
    }

    console.log('[Memory API] ℹ No pattern found');
    return res.json({
      success: true,
      pattern: null
    });

  } catch (error) {
    console.error('[Memory API] Retrieve error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Pattern retrieval failed',
      error: error.message
    });
  }
};

/**
 * Store successful pattern to memory
 * POST /api/memory/store
 */
export const storePattern = async (req, res) => {
  try {
    const {
      projectId,
      actionText,
      actionType,
      element,
      selector,
      locatorType,
      urlPattern,
      confidence,
      isInModal,
      containerRole,
      metadata
    } = req.body;

    if (!projectId || !actionText || !selector) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: projectId, actionText, selector'
      });
    }

    console.log('[Memory API] Storing pattern:', { projectId, actionText, selector });

    const stored = await storeSuccessfulPattern({
      projectId: parseInt(projectId),
      actionText,
      actionType: actionType || 'click',
      element: element || {},
      selector,
      locatorType: locatorType || 'vision',
      urlPattern: urlPattern || 'unknown',
      confidence: confidence || 85,
      isInModal: isInModal || false,
      containerRole: containerRole || null,
      metadata: metadata || {}
    });

    if (stored) {
      console.log('[Memory API] ✓ Pattern stored, success count:', stored.successCount);
      return res.json({
        success: true,
        pattern: {
          id: stored.id,
          successCount: stored.successCount,
          confidence: stored.confidence
        }
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to store pattern'
    });

  } catch (error) {
    console.error('[Memory API] Store error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Pattern storage failed',
      error: error.message
    });
  }
};

/**
 * Get top patterns for analytics
 * GET /api/memory/top/:projectId
 */
export const getTop = async (req, res) => {
  try {
    const { projectId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const patterns = await getTopPatterns(parseInt(projectId), limit);

    return res.json({
      success: true,
      patterns
    });

  } catch (error) {
    console.error('[Memory API] Get top patterns error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to get top patterns',
      error: error.message
    });
  }
};

/**
 * Get memory analytics dashboard
 * GET /api/memory/analytics/:projectId
 */
export const getAnalytics = async (req, res) => {
  try {
    const { projectId } = req.params;
    const pid = parseInt(projectId);

    // Import prisma
    const { default: prisma } = await import('../config/database.js');

    // Get all patterns for this project
    const allPatterns = await prisma.elementMemory.findMany({
      where: { projectId: pid },
      orderBy: { lastUsedAt: 'desc' }
    });

    // Calculate statistics
    const totalPatterns = allPatterns.length;
    const totalSuccesses = allPatterns.reduce((sum, p) => sum + p.successCount, 0);
    const avgConfidence = totalPatterns > 0
      ? allPatterns.reduce((sum, p) => sum + p.confidence, 0) / totalPatterns
      : 0;

    // Group by locator type
    const byLocatorType = allPatterns.reduce((acc, p) => {
      acc[p.locatorType] = (acc[p.locatorType] || 0) + 1;
      return acc;
    }, {});

    // Group by action type
    const byActionType = allPatterns.reduce((acc, p) => {
      acc[p.actionType] = (acc[p.actionType] || 0) + 1;
      return acc;
    }, {});

    // Top 10 most used patterns
    const topPatterns = [...allPatterns]
      .sort((a, b) => b.successCount - a.successCount)
      .slice(0, 10)
      .map(p => ({
        actionText: p.actionText,
        selector: p.selector,
        successCount: p.successCount,
        confidence: p.confidence,
        locatorType: p.locatorType,
        lastUsed: p.lastUsedAt
      }));

    // Recently learned (last 10)
    const recentlyLearned = [...allPatterns]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map(p => ({
        actionText: p.actionText,
        selector: p.selector,
        successCount: p.successCount,
        confidence: p.confidence,
        locatorType: p.locatorType,
        learnedAt: p.createdAt
      }));

    // Pattern efficiency (patterns with high success count)
    const efficientPatterns = allPatterns.filter(p => p.successCount >= 5).length;
    const efficiencyRate = totalPatterns > 0
      ? (efficientPatterns / totalPatterns) * 100
      : 0;

    return res.json({
      success: true,
      analytics: {
        overview: {
          totalPatterns,
          totalSuccesses,
          avgConfidence: Math.round(avgConfidence * 100) / 100,
          efficiencyRate: Math.round(efficiencyRate * 100) / 100,
          efficientPatterns
        },
        distribution: {
          byLocatorType,
          byActionType
        },
        topPatterns,
        recentlyLearned
      }
    });

  } catch (error) {
    console.error('[Memory API] Analytics error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to get analytics',
      error: error.message
    });
  }
};

/**
 * Get memory stats (lightweight version for dashboard)
 * GET /api/memory/stats/:projectId
 */
export const getStats = async (req, res) => {
  try {
    const { projectId } = req.params;
    const pid = parseInt(projectId);

    const { default: prisma } = await import('../config/database.js');

    // Quick stats
    const totalPatterns = await prisma.elementMemory.count({
      where: { projectId: pid }
    });

    const totalSuccesses = await prisma.elementMemory.aggregate({
      where: { projectId: pid },
      _sum: { successCount: true }
    });

    const avgConfidence = await prisma.elementMemory.aggregate({
      where: { projectId: pid },
      _avg: { confidence: true }
    });

    // Patterns learned today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const learnedToday = await prisma.elementMemory.count({
      where: {
        projectId: pid,
        createdAt: { gte: today }
      }
    });

    // Most active pattern today
    const usedToday = await prisma.elementMemory.count({
      where: {
        projectId: pid,
        lastUsedAt: { gte: today }
      }
    });

    return res.json({
      success: true,
      stats: {
        totalPatterns,
        totalSuccesses: totalSuccesses._sum.successCount || 0,
        avgConfidence: Math.round((avgConfidence._avg.confidence || 0) * 100) / 100,
        learnedToday,
        usedToday
      }
    });

  } catch (error) {
    console.error('[Memory API] Stats error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to get stats',
      error: error.message
    });
  }
};
