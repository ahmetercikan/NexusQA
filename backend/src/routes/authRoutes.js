/**
 * Authentication Routes
 * Login, Register, Logout, Me
 */

import { Router } from 'express';
import { login, register, getCurrentUser, logout } from '../controllers/authController.js';
import { authenticate, authorize } from '../middleware/authMiddleware.js';

const router = Router();

// Public routes
router.post('/login', login);

// Protected routes
router.use(authenticate); // Tüm aşağıdaki route'lar için auth gerekli

router.get('/me', getCurrentUser);
router.post('/logout', logout);

// Sadece ADMIN ve SUPER_ADMIN kullanıcı ekleyebilir
router.post('/register', authorize('ADMIN', 'SUPER_ADMIN'), register);

export default router;
