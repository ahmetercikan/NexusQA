import { Router } from 'express';
import {
  // Test Suites
  getAllTestSuites,
  getTestSuite,
  createTestSuite,
  updateTestSuite,
  deleteTestSuite,
  // Test Cases
  getTestCases,
  createTestCase,
  updateTestCase,
  deleteTestCase,
  // Test Runs
  getAllTestRuns,
  getTestRun,
  runTestSuite,
  getTestRunLogs,
  cancelTestRun,
  // Logs
  getAllLogs,
  createLog,
  // Dashboard
  getDashboardStats
} from '../controllers/testController.js';

const router = Router();

// ==================== DASHBOARD ====================
// GET /api/tests/dashboard - Get dashboard statistics
router.get('/dashboard', getDashboardStats);

// ==================== LOGS ====================
// GET /api/tests/logs - Get all logs
router.get('/logs', getAllLogs);

// POST /api/tests/logs - Create log (webhook)
router.post('/logs', createLog);

// ==================== TEST RUNS ====================
// GET /api/tests/runs - Get all test runs
router.get('/runs', getAllTestRuns);

// GET /api/tests/runs/:id - Get single test run
router.get('/runs/:id', getTestRun);

// GET /api/tests/runs/:id/logs - Get test run logs
router.get('/runs/:id/logs', getTestRunLogs);

// POST /api/tests/runs/:id/cancel - Cancel test run
router.post('/runs/:id/cancel', cancelTestRun);

// ==================== TEST SUITES ====================
// GET /api/tests/suites - Get all test suites
router.get('/suites', getAllTestSuites);

// POST /api/tests/suites - Create test suite
router.post('/suites', createTestSuite);

// GET /api/tests/suites/:id - Get single test suite
router.get('/suites/:id', getTestSuite);

// PUT /api/tests/suites/:id - Update test suite
router.put('/suites/:id', updateTestSuite);

// DELETE /api/tests/suites/:id - Delete test suite
router.delete('/suites/:id', deleteTestSuite);

// POST /api/tests/suites/:id/run - Run test suite
router.post('/suites/:id/run', runTestSuite);

// ==================== TEST CASES ====================
// GET /api/tests/suites/:suiteId/cases - Get test cases for suite
router.get('/suites/:suiteId/cases', getTestCases);

// POST /api/tests/suites/:suiteId/cases - Create test case
router.post('/suites/:suiteId/cases', createTestCase);

// PUT /api/tests/cases/:id - Update test case
router.put('/cases/:id', updateTestCase);

// DELETE /api/tests/cases/:id - Delete test case
router.delete('/cases/:id', deleteTestCase);

export default router;
