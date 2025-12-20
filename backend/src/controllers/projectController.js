import prisma from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

// Get all projects
export const getAllProjects = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, search, isActive } = req.query;

  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }

  if (isActive !== undefined) {
    where.isActive = isActive === 'true';
  }

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        testSuites: {
          select: { id: true, name: true, type: true }
        },
        _count: {
          select: { testSuites: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: parseInt(limit)
    }),
    prisma.project.count({ where })
  ]);

  res.json({
    success: true,
    data: projects,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// Get single project
export const getProject = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const project = await prisma.project.findUnique({
    where: { id: parseInt(id) },
    include: {
      testSuites: {
        include: {
          _count: { select: { testCases: true, testRuns: true } }
        }
      }
    }
  });

  if (!project) {
    throw new AppError('Project not found', 404);
  }

  res.json({
    success: true,
    data: project
  });
});

// Create project
export const createProject = asyncHandler(async (req, res) => {
  const { name, description, baseUrl } = req.body;

  if (!name) {
    throw new AppError('Project name is required', 400);
  }

  const project = await prisma.project.create({
    data: {
      name,
      description,
      baseUrl,
      isActive: true
    }
  });

  res.status(201).json({
    success: true,
    message: 'Project created successfully',
    data: project
  });
});

// Update project
export const updateProject = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, baseUrl, isActive } = req.body;

  const project = await prisma.project.update({
    where: { id: parseInt(id) },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(baseUrl !== undefined && { baseUrl }),
      ...(isActive !== undefined && { isActive })
    }
  });

  res.json({
    success: true,
    message: 'Project updated successfully',
    data: project
  });
});

// Delete project
export const deleteProject = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await prisma.project.delete({
    where: { id: parseInt(id) }
  });

  res.json({
    success: true,
    message: 'Project deleted successfully'
  });
});

// Get project statistics
export const getProjectStats = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const project = await prisma.project.findUnique({
    where: { id: parseInt(id) },
    include: {
      testSuites: {
        include: {
          testRuns: {
            orderBy: { startedAt: 'desc' },
            take: 10
          },
          _count: { select: { testCases: true } }
        }
      }
    }
  });

  if (!project) {
    throw new AppError('Project not found', 404);
  }

  // Calculate statistics
  const totalSuites = project.testSuites.length;
  const totalTestCases = project.testSuites.reduce((sum, suite) => sum + suite._count.testCases, 0);

  const allRuns = project.testSuites.flatMap(suite => suite.testRuns);
  const passedRuns = allRuns.filter(run => run.status === 'PASSED').length;
  const failedRuns = allRuns.filter(run => run.status === 'FAILED').length;

  res.json({
    success: true,
    data: {
      project: { id: project.id, name: project.name },
      stats: {
        totalSuites,
        totalTestCases,
        totalRuns: allRuns.length,
        passedRuns,
        failedRuns,
        passRate: allRuns.length > 0 ? ((passedRuns / allRuns.length) * 100).toFixed(2) : 0
      }
    }
  });
});

export default {
  getAllProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getProjectStats
};
