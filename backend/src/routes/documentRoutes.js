import express from 'express';
import { upload } from '../config/upload.js';
import {
  uploadDocument,
  getAllDocuments,
  getDocument,
  deleteDocument,
  parseDocumentContent,
  analyzeDocumentContent,
  generateScenariosFromText,
} from '../controllers/documentController.js';

const router = express.Router();

/**
 * POST /api/documents/generate-from-text
 * Generate test scenarios from text requirements
 * Body: { content, projectId, suiteId }
 */
router.post('/generate-from-text', generateScenariosFromText);

/**
 * POST /api/documents/upload
 * Upload a new document
 * Body: multipart/form-data with file and projectId
 */
router.post('/upload', upload.single('file'), uploadDocument);

/**
 * POST /api/documents/:id/parse
 * Manually trigger parsing of a document
 */
router.post('/:id/parse', async (req, res) => {
  try {
    const { id } = req.params;
    await parseDocumentContent(parseInt(id));
    res.json({ success: true, message: 'Document parsing started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/documents/:id/analyze
 * Analyze a document and extract test scenarios using CrewAI
 */
router.post('/:id/analyze', analyzeDocumentContent);

/**
 * GET /api/documents
 * Get all documents (with optional filtering)
 * Query params: projectId, status
 */
router.get('/', getAllDocuments);

/**
 * GET /api/documents/:id
 * Get a single document with details and scenarios
 */
router.get('/:id', getDocument);

/**
 * DELETE /api/documents/:id
 * Delete a document
 */
router.delete('/:id', deleteDocument);

export default router;
