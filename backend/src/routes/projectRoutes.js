import { Router } from 'express';
import {
  getAllProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getProjectStats
} from '../controllers/projectController.js';

const router = Router();

// GET /api/projects - List all projects
router.get('/', getAllProjects);

// POST /api/projects - Create new project
router.post('/', createProject);

// GET /api/projects/:id - Get single project
router.get('/:id', getProject);

// PUT /api/projects/:id - Update project
router.put('/:id', updateProject);

// DELETE /api/projects/:id - Delete project
router.delete('/:id', deleteProject);

// GET /api/projects/:id/stats - Get project statistics
router.get('/:id/stats', getProjectStats);

export default router;
