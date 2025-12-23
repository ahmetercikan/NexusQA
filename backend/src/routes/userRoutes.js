/**
 * User Management Routes
 * Kullanıcı yönetimi (Sadece ADMIN ve SUPER_ADMIN)
 */

import { Router } from 'express';
import { authenticate, canManageUsers } from '../middleware/authMiddleware.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import prisma from '../config/database.js';
import bcrypt from 'bcryptjs';

const router = Router();

// Tüm route'lar için auth ve yetki kontrolü
router.use(authenticate);
router.use(canManageUsers);

/**
 * Kullanıcı listesi
 * GET /api/users
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { role } = req.user;

    // SUPER_ADMIN tüm kullanıcıları görebilir
    // ADMIN sadece kendi organizasyonundaki kullanıcıları görebilir
    const where = role === 'SUPER_ADMIN' ? {} : { organizationId: req.user.organizationId };

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        organization: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: users
    });
  })
);

/**
 * Kullanıcı detayı
 * GET /api/users/:id
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role, organizationId } = req.user;

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            licenseKey: true,
            maxUsers: true,
            licenseExpiry: true
          }
        }
      }
    });

    if (!user) {
      throw new AppError('Kullanıcı bulunamadı', 404);
    }

    // ADMIN sadece kendi organizasyonundaki kullanıcıları görebilir
    if (role === 'ADMIN' && user.organizationId !== organizationId) {
      throw new AppError('Bu kullanıcıyı görüntüleme yetkiniz yok', 403);
    }

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: userWithoutPassword
    });
  })
);

/**
 * Kullanıcı güncelle
 * PUT /api/users/:id
 */
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, email, role, isActive, password } = req.body;
    const { role: userRole, organizationId } = req.user;

    // Kullanıcıyı bul
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingUser) {
      throw new AppError('Kullanıcı bulunamadı', 404);
    }

    // ADMIN sadece kendi organizasyonundaki kullanıcıları güncelleyebilir
    if (userRole === 'ADMIN' && existingUser.organizationId !== organizationId) {
      throw new AppError('Bu kullanıcıyı güncelleme yetkiniz yok', 403);
    }

    // ADMIN kendini SUPER_ADMIN yapamaz
    if (userRole === 'ADMIN' && role === 'SUPER_ADMIN') {
      throw new AppError('Süper Admin oluşturamazsınız', 403);
    }

    // Güncelleme verisi
    const updateData = {};
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'UPDATE_USER',
        resource: 'user',
        resourceId: updatedUser.id,
        details: { updatedFields: Object.keys(updateData) }
      }
    });

    const { password: _, ...userWithoutPassword } = updatedUser;

    res.json({
      success: true,
      message: 'Kullanıcı güncellendi',
      data: userWithoutPassword
    });
  })
);

/**
 * Kullanıcı sil
 * DELETE /api/users/:id
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { role: userRole, organizationId, userId } = req.user;

    // Kendini silemez
    if (parseInt(id) === userId) {
      throw new AppError('Kendi hesabınızı silemezsiniz', 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!user) {
      throw new AppError('Kullanıcı bulunamadı', 404);
    }

    // ADMIN sadece kendi organizasyonundaki kullanıcıları silebilir
    if (userRole === 'ADMIN' && user.organizationId !== organizationId) {
      throw new AppError('Bu kullanıcıyı silme yetkiniz yok', 403);
    }

    await prisma.user.delete({
      where: { id: parseInt(id) }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: 'DELETE_USER',
        resource: 'user',
        resourceId: parseInt(id),
        details: { deletedUserEmail: user.email }
      }
    });

    res.json({
      success: true,
      message: 'Kullanıcı silindi'
    });
  })
);

export default router;
