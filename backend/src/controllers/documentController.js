import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import { parseDocument, getDocumentType } from '../services/documentParser.js';
import { analyzeDocument, analyzeTextRequirements } from '../services/crewAIBridge.js';
import { emitDocumentStatus, emitDocumentAnalyzing, emitDocumentCompleted, emitScenarioCreated } from '../websocket/socketHandler.js';

const prisma = new PrismaClient();

/**
 * Upload a new document
 * POST /api/documents/upload
 */
export const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { projectId, suiteId } = req.body;

    if (!projectId) {
      // Clean up uploaded file if project validation fails
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'projectId is required' });
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: parseInt(projectId) },
    });

    if (!project) {
      fs.unlink(req.file.path, () => {});
      return res.status(404).json({ error: 'Project not found' });
    }

    // Verify suite exists if provided
    if (suiteId) {
      const suite = await prisma.testSuite.findUnique({
        where: { id: parseInt(suiteId) },
      });
      if (!suite) {
        fs.unlink(req.file.path, () => {});
        return res.status(404).json({ error: 'Test suite not found' });
      }
    }

    // Determine document type
    const documentType = getDocumentType(req.file.originalname);

    // Create document record in database
    const document = await prisma.document.create({
      data: {
        projectId: parseInt(projectId),
        filename: req.file.filename,
        originalName: req.file.originalname,
        type: documentType,
        fileSize: req.file.size,
        filePath: req.file.path,
        content: '', // Will be filled after parsing
        status: 'PENDING', // Will be updated to PROCESSING, then COMPLETED/FAILED
        metadata: {
          mimeType: req.file.mimetype,
          uploadedAt: new Date().toISOString(),
          suiteId: suiteId ? parseInt(suiteId) : null, // Store suiteId for scenario creation
        },
      },
    });

    // Start parsing in background (async, don't wait)
    parseDocumentContent(document.id).catch((error) => {
      console.error(`Error parsing document ${document.id}:`, error);
    });

    res.status(201).json({
      success: true,
      document: {
        id: document.id,
        filename: document.originalName,
        type: document.type,
        fileSize: document.fileSize,
        status: document.status,
        createdAt: document.createdAt,
      },
    });
  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
};

/**
 * Parse document content and extract text
 * POST /api/documents/:id/parse
 */
export const parseDocumentContent = async (documentId) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: parseInt(documentId) || documentId },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Update status to PROCESSING
    await prisma.document.update({
      where: { id: document.id },
      data: { status: 'PROCESSING' },
    });

    // Emit status update
    emitDocumentStatus({
      id: document.id,
      status: 'PROCESSING',
      message: 'Belge işleniyor...',
    });

    // Parse the document
    const parseResult = await parseDocument(document.filePath, document.type);

    if (parseResult.success) {
      // Update document with parsed content
      await prisma.document.update({
        where: { id: document.id },
        data: {
          content: parseResult.content,
          status: 'COMPLETED',
          metadata: {
            ...document.metadata,
            parseMetadata: parseResult.metadata,
            parsedAt: new Date().toISOString(),
          },
        },
      });

      console.log(`Document ${document.id} parsed successfully`);

      // Emit parsing complete, starting analysis
      emitDocumentAnalyzing({
        id: document.id,
        status: 'ANALYZING',
        message: 'AI ile senaryolar çıkarılıyor...',
      });

      // Automatically trigger CrewAI analysis after successful parsing
      console.log(`Starting automatic analysis for document ${document.id}...`);
      try {
        const analysisResult = await analyzeDocument(document.id);

        if (analysisResult.success && analysisResult.scenarios?.length > 0) {
          // Get suiteId from document metadata (if provided during upload)
          const suiteId = document.metadata?.suiteId || null;

          // Save scenarios to database
          const createdScenarios = [];
          for (const scenario of analysisResult.scenarios) {
            const data = {
              document: { connect: { id: document.id } },
              title: scenario.title,
              description: scenario.description,
              steps: scenario.steps || [],
              expectedResult: scenario.expectedResult,
              preconditions: scenario.preconditions,
              testData: scenario.testData || {},
              automationType: scenario.automationType || 'UI',
              priority: scenario.priority || 'MEDIUM',
              isAutomated: false,
            };
            if (suiteId) {
              data.suite = { connect: { id: suiteId } };
            }
            const created = await prisma.scenario.create({ data });
            createdScenarios.push(created);

            // Emit each scenario created
            emitScenarioCreated({
              documentId: document.id,
              scenario: {
                id: created.id,
                title: created.title,
                priority: created.priority,
              },
              totalCount: createdScenarios.length,
            });
          }

          // Emit document completed with all scenarios
          emitDocumentCompleted({
            id: document.id,
            status: 'COMPLETED',
            message: `${createdScenarios.length} senaryo başarıyla çıkarıldı`,
            scenarioCount: createdScenarios.length,
            scenarios: createdScenarios.map(s => ({
              id: s.id,
              title: s.title,
              priority: s.priority,
            })),
          });

          console.log(`Document ${document.id}: ${analysisResult.scenarios.length} scenarios extracted automatically${suiteId ? ` (assigned to suite ${suiteId})` : ''}`);
        } else {
          // No scenarios extracted
          emitDocumentCompleted({
            id: document.id,
            status: 'COMPLETED',
            message: 'Belge analiz edildi, senaryo bulunamadı',
            scenarioCount: 0,
            scenarios: [],
          });
          console.log(`Document ${document.id}: No scenarios extracted from analysis`);
        }
      } catch (analysisError) {
        console.error(`Auto-analysis error for document ${document.id}:`, analysisError.message);
        // Emit error but don't fail
        emitDocumentStatus({
          id: document.id,
          status: 'COMPLETED',
          message: 'Belge yüklendi, analiz sırasında hata oluştu',
          error: analysisError.message,
        });
      }
    } else {
      // Mark as failed
      await prisma.document.update({
        where: { id: document.id },
        data: {
          status: 'FAILED',
          metadata: {
            ...document.metadata,
            error: parseResult.error,
            failedAt: new Date().toISOString(),
          },
        },
      });

      console.error(`Failed to parse document ${document.id}: ${parseResult.error}`);
    }
  } catch (error) {
    console.error(`Error in parseDocumentContent: ${error.message}`);

    if (documentId) {
      try {
        await prisma.document.update({
          where: { id: parseInt(documentId) || documentId },
          data: {
            status: 'FAILED',
            metadata: {
              error: error.message,
              failedAt: new Date().toISOString(),
            },
          },
        });
      } catch (updateError) {
        console.error('Failed to update document status:', updateError);
      }
    }
  }
};

/**
 * Get all documents for a project
 * GET /api/documents
 */
export const getAllDocuments = async (req, res) => {
  try {
    const { projectId, status } = req.query;

    const where = {};
    if (projectId) {
      where.projectId = parseInt(projectId);
    }
    if (status) {
      where.status = status;
    }

    const documents = await prisma.document.findMany({
      where,
      include: {
        scenarios: {
          select: {
            id: true,
            title: true,
            isAutomated: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      count: documents.length,
      documents: documents.map((doc) => ({
        id: doc.id,
        filename: doc.originalName,
        type: doc.type,
        fileSize: doc.fileSize,
        status: doc.status,
        scenarioCount: doc.scenarios.length,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to retrieve documents' });
  }
};

/**
 * Get a single document with details
 * GET /api/documents/:id
 */
export const getDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id: parseInt(id) },
      include: {
        scenarios: {
          select: {
            id: true,
            title: true,
            description: true,
            priority: true,
            isAutomated: true,
            automationType: true,
            createdAt: true,
          },
        },
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      success: true,
      document: {
        id: document.id,
        filename: document.originalName,
        type: document.type,
        fileSize: document.fileSize,
        status: document.status,
        content: document.content,
        metadata: document.metadata,
        scenarioCount: document.scenarios.length,
        scenarios: document.scenarios,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: 'Failed to retrieve document' });
  }
};

/**
 * Analyze a document and extract test scenarios using CrewAI
 * POST /api/documents/:id/analyze
 */
export const analyzeDocumentContent = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id: parseInt(id) },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (!document.content) {
      return res.status(400).json({ error: 'Document has no parsed content yet. Please wait for parsing to complete.' });
    }

    if (document.status !== 'COMPLETED') {
      return res.status(400).json({ error: `Document parsing not complete. Current status: ${document.status}` });
    }

    // Call CrewAI to analyze the document
    // Default to 'text' template for Turkish scenario support
    const analysisResult = await analyzeDocument(document.id, { template: 'text' });

    if (analysisResult.success) {
      // Save scenarios to database
      const scenarios = analysisResult.scenarios || [];
      const createdScenarios = [];

      for (const scenario of scenarios) {
        const created = await prisma.scenario.create({
          data: {
            document: { connect: { id: document.id } },
            title: scenario.title,
            description: scenario.description,
            steps: scenario.steps || [],
            expectedResult: scenario.expectedResult,
            preconditions: scenario.preconditions,
            testData: scenario.testData || {},
            automationType: scenario.automationType || 'UI',
            priority: scenario.priority || 'MEDIUM',
            isAutomated: false,
          },
        });
        createdScenarios.push(created);
      }

      // Otomatik belge silme - Senaryolar oluşturulduktan sonra belgeyi sil
      console.log(`[Document] ${createdScenarios.length} senaryo oluşturuldu, belge siliniyor: ${document.id}`);
      try {
        // Delete file from disk
        if (fs.existsSync(document.filePath)) {
          fs.unlinkSync(document.filePath);
        }

        // Delete document from database (scenarios remain with documentId = null)
        await prisma.document.delete({
          where: { id: parseInt(id) },
        });

        console.log(`[Document] Belge başarıyla silindi: ${document.originalName}`);
      } catch (deleteError) {
        console.error('[Document] Belge silinirken hata:', deleteError);
        // Continue even if deletion fails - scenarios are already created
      }

      res.json({
        success: true,
        message: `${createdScenarios.length} senaryo başarıyla oluşturuldu. Belge otomatik olarak temizlendi.`,
        scenarioCount: createdScenarios.length,
        scenarios: createdScenarios.map(s => ({
          id: s.id,
          title: s.title,
          priority: s.priority,
          automationType: s.automationType,
        })),
      });
    } else {
      res.status(500).json({
        success: false,
        error: analysisResult.error || 'Document analysis failed',
      });
    }
  } catch (error) {
    console.error('Analyze document error:', error);
    res.status(500).json({ error: 'Failed to analyze document' });
  }
};

/**
 * Delete a document
 * DELETE /api/documents/:id
 */
export const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id: parseInt(id) },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete file from disk
    if (fs.existsSync(document.filePath)) {
      fs.unlinkSync(document.filePath);
    }

    // Delete document from database (scenarios remain with documentId = null)
    await prisma.document.delete({
      where: { id: parseInt(id) },
    });

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
};

/**
 * Generate test scenarios from text requirements
 * POST /api/documents/generate-from-text
 * Body: { content, projectId, suiteId, template }
 */
export const generateScenariosFromText = async (req, res) => {
  try {
    const { content, projectId, suiteId, template = 'text' } = req.body;

    if (!content || !projectId) {
      return res.status(400).json({
        error: 'content and projectId are required',
      });
    }

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: parseInt(projectId) },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Create a virtual document record for tracking
    const document = await prisma.document.create({
      data: {
        projectId: parseInt(projectId),
        filename: `Generated_${new Date().getTime()}.txt`,
        originalName: `Generated Scenarios - ${new Date().toLocaleDateString('tr-TR')}`,
        type: 'TXT',
        fileSize: content.length,
        filePath: 'virtual', // Generated from text, not from a file
        content: content,
        status: 'PROCESSING',
        metadata: {
          source: 'text-requirement',
          template: template,
          uploadedAt: new Date().toISOString(),
          suiteId: suiteId ? parseInt(suiteId) : null,
        },
      },
    });

    // Wait for analysis to complete and return result
    try {
      const scenarioCount = await generateScenariosFromTextAsync(document.id, content, parseInt(projectId), suiteId ? parseInt(suiteId) : null, template);

      res.status(201).json({
        success: true,
        message: `${scenarioCount} senaryo başarıyla oluşturuldu`,
        scenarioCount: scenarioCount,
        document: {
          id: document.id,
          filename: document.originalName,
          status: 'COMPLETED',
        },
      });
    } catch (analysisError) {
      console.error(`Error generating scenarios for document ${document.id}:`, analysisError);
      await prisma.document.update({
        where: { id: document.id },
        data: { status: 'FAILED' },
      }).catch(() => {});

      res.status(500).json({
        success: false,
        error: 'Senaryo oluşturulurken hata oluştu: ' + analysisError.message
      });
    }
  } catch (error) {
    console.error('Generate from text error:', error);
    res.status(500).json({ error: 'Failed to generate scenarios' });
  }
};

/**
 * Async function to generate scenarios from text
 */
async function generateScenariosFromTextAsync(documentId, content, projectId, suiteId, template = 'text') {
  try {
    console.log(`[Document ${documentId}] Starting scenario generation with template: ${template}`);
    
    // Call AI service to generate scenarios with template option
    const scenarios = await analyzeTextRequirements(content, { template });
    
    console.log(`[Document ${documentId}] Received ${scenarios?.length || 0} scenarios from analysis`);

    let createdCount = 0;

    // Create scenarios in database
    if (!scenarios || scenarios.length === 0) {
      console.warn(`[Document ${documentId}] No scenarios returned, creating default scenario`);
      // Create at least one default scenario
      scenarios.push({
        title: 'Varsayılan Test Senaryosu',
        description: content.substring(0, 200),
        steps: [
          { number: 1, action: 'Testi başlat' }
        ],
        expectedResult: 'Test başarıyla çalışır',
        priority: 'MEDIUM',
        automationType: 'UI',
        testData: {},
      });
    }

    for (const scenarioData of scenarios) {
      try {
        console.log(`[Document ${documentId}] Creating scenario: ${scenarioData.title}`);
        
        const data = {
          document: { connect: { id: documentId } },
          title: scenarioData.title || 'Generated Scenario',
          description: scenarioData.description || '',
          priority: scenarioData.priority || 'MEDIUM',
          steps: scenarioData.steps || [],
          expectedResult: scenarioData.expectedResult || '',
          testData: scenarioData.testData || {},
          automationType: scenarioData.automationType || 'UI',
          status: 'PENDING',
          isAutomated: false,
        };
        if (suiteId) {
          data.suite = { connect: { id: suiteId } };
        }
        const scenario = await prisma.scenario.create({ data });

        createdCount++;
        console.log(`[Document ${documentId}] Scenario created: ${scenario.id}`);

        // Emit real-time event
        emitScenarioCreated({
          documentId: documentId,
          scenario: scenario,
          totalCount: createdCount,
        });
      } catch (err) {
        console.error(`[Document ${documentId}] Error creating scenario:`, err.message);
      }
    }

    // Update document status to completed
    console.log(`[Document ${documentId}] Updating document with ${createdCount} scenarios`);
    await prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'COMPLETED',
        metadata: {
          source: 'text-requirement',
          template: template,
          uploadedAt: new Date().toISOString(),
          suiteId: suiteId ? parseInt(suiteId) : null,
          scenarioCount: createdCount,
        },
      },
    });

    // Emit completion event
    emitDocumentCompleted({
      id: documentId,
      message: `${createdCount} senaryo başarıyla oluşturuldu`,
      scenarioCount: createdCount,
    });

    console.log(`[Document ${documentId}] Completed successfully with ${createdCount} scenarios`);

    // Otomatik belge silme - Senaryolar oluşturulduktan sonra belgeyi sil
    try {
      const document = await prisma.document.findUnique({
        where: { id: documentId },
      });

      if (document && document.filePath && document.filePath !== 'virtual') {
        // Delete file from disk if it's not a virtual document
        if (fs.existsSync(document.filePath)) {
          fs.unlinkSync(document.filePath);
        }
      }

      // Delete document from database (scenarios remain with documentId = null)
      await prisma.document.delete({
        where: { id: documentId },
      });

      console.log(`[Document ${documentId}] Belge otomatik olarak temizlendi`);
    } catch (deleteError) {
      console.error(`[Document ${documentId}] Belge silinirken hata:`, deleteError);
      // Continue even if deletion fails - scenarios are already created
    }

    return createdCount;
  } catch (error) {
    console.error(`[Document ${documentId}] Error in generateScenariosFromTextAsync:`, error);
    await prisma.document.update({
      where: { id: documentId },
      data: { status: 'FAILED' },
    }).catch(() => {});

    throw error; // Re-throw so caller can handle it
  }
}

/**
 * POST /documents/autonomous-crawl
 * Start autonomous URL crawling to discover test scenarios
 */
export const startAutonomousCrawl = async (req, res) => {
  try {
    const { url, projectId, suiteId, depth = 3, maxPages = 50, strategy = 'BFS', options = {} } = req.body;

    if (!url || !projectId) {
      return res.status(400).json({
        success: false,
        error: 'URL and projectId are required'
      });
    }

    console.log(`[AutonomousCrawl] Starting crawl for ${url}`);
    console.log(`[AutonomousCrawl] Strategy: ${strategy}, Depth: ${depth}, Max Pages: ${maxPages}`);
    console.log(`[AutonomousCrawl] Options:`, options);

    // Import crawler dynamically to avoid loading Playwright on startup
    const { crawlWebsite, convertPathsToScenarios } = await import('../services/autonomousCrawler.js');

    // Start crawling
    const crawlResult = await crawlWebsite({
      url,
      depth,
      maxPages,
      strategy,
      options: {
        ignoreLogout: options.ignoreLogout !== false, // Default true
        ignoreDelete: options.ignoreDelete !== false, // Default true
        autoFillForms: options.autoFillForms !== false, // Default true
      }
    });

    if (!crawlResult.success) {
      throw new Error('Crawl failed');
    }

    console.log(`[AutonomousCrawl] Crawl stats:`, crawlResult.stats);

    // Convert discovered paths to test scenarios
    const scenarios = convertPathsToScenarios(crawlResult.graph, projectId, suiteId);

    console.log(`[AutonomousCrawl] Generated ${scenarios.length} scenarios from ${crawlResult.graph.length} paths`);

    // Save scenarios to database
    let createdCount = 0;

    for (const scenarioData of scenarios) {
      try {
        await prisma.scenario.create({
          data: scenarioData
        });
        createdCount++;
      } catch (createError) {
        console.error(`[AutonomousCrawl] Failed to save scenario "${scenarioData.title}":`, createError.message);
      }
    }

    console.log(`[AutonomousCrawl] ✅ Successfully saved ${createdCount}/${scenarios.length} scenarios`);

    res.json({
      success: true,
      message: `Otonom keşif tamamlandı: ${createdCount} senaryo oluşturuldu`,
      url,
      projectId,
      suiteId,
      stats: crawlResult.stats,
      scenarioCount: createdCount,
    });
  } catch (error) {
    console.error('[AutonomousCrawl] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Autonomous crawl failed'
    });
  }
};
