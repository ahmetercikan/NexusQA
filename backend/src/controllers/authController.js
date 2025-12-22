/**
 * Authentication Controller
 * Login, Register, Logout, Token işlemleri
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import { config } from '../config/env.js';

/**
 * Kullanıcı girişi
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Validasyon
  if (!email || !password) {
    throw new AppError('Email ve şifre gereklidir', 400);
  }

  // Kullanıcıyı bul
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          licenseKey: true,
          maxUsers: true,
          licenseExpiry: true,
          isActive: true
        }
      }
    }
  });

  if (!user) {
    throw new AppError('Geçersiz email veya şifre', 401);
  }

  // Kullanıcı aktif mi?
  if (!user.isActive) {
    throw new AppError('Hesabınız devre dışı bırakılmış', 403);
  }

  // Organizasyon kontrolü
  if (user.organization && !user.organization.isActive) {
    throw new AppError('Organizasyonunuz aktif değil', 403);
  }

  // Lisans süresi kontrolü
  if (user.organization?.licenseExpiry && new Date() > user.organization.licenseExpiry) {
    throw new AppError('Lisans süreniz dolmuş. Lütfen yöneticinizle iletişime geçin', 403);
  }

  // Şifre kontrolü
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError('Geçersiz email veya şifre', 401);
  }

  // JWT token oluştur
  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId
    },
    config.jwtSecret,
    { expiresIn: '7d' }
  );

  // Son giriş bilgilerini güncelle
  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      lastLoginIp: req.ip || req.connection.remoteAddress
    }
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'LOGIN',
      resource: 'auth',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    }
  });

  // Şifreyi response'dan çıkar
  const { password: _, ...userWithoutPassword } = user;

  res.json({
    success: true,
    message: 'Giriş başarılı',
    token,
    user: userWithoutPassword
  });
});

/**
 * Kullanıcı kaydı (Sadece ADMIN ve SUPER_ADMIN)
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, role, organizationId } = req.body;

  // Validasyon
  if (!email || !password || !firstName || !lastName) {
    throw new AppError('Tüm alanlar zorunludur', 400);
  }

  // Email kontrolü
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError('Bu email zaten kullanılıyor', 409);
  }

  // Organizasyon kontrolü (ADMIN kullanıcı ekliyorsa)
  if (req.user.role === 'ADMIN') {
    if (!organizationId || organizationId !== req.user.organizationId) {
      throw new AppError('Sadece kendi organizasyonunuza kullanıcı ekleyebilirsiniz', 403);
    }

    // Lisans limiti kontrolü
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { users: true }
    });

    if (org.users.length >= org.maxUsers) {
      throw new AppError(`Lisans limiti doldu (${org.maxUsers} kullanıcı)`, 403);
    }
  }

  // Şifreyi hashle
  const hashedPassword = await bcrypt.hash(password, 10);

  // Kullanıcı oluştur
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: role || 'USER',
      organizationId: organizationId || null
    }
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: req.user.id,
      action: 'CREATE_USER',
      resource: 'user',
      resourceId: user.id,
      details: { createdUserEmail: email },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    }
  });

  const { password: _, ...userWithoutPassword } = user;

  res.status(201).json({
    success: true,
    message: 'Kullanıcı oluşturuldu',
    user: userWithoutPassword
  });
});

/**
 * Mevcut kullanıcı bilgisi
 * GET /api/auth/me
 */
export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
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

  const { password: _, ...userWithoutPassword } = user;

  res.json({
    success: true,
    user: userWithoutPassword
  });
});

/**
 * Çıkış
 * POST /api/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: req.user.userId,
      action: 'LOGOUT',
      resource: 'auth',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    }
  });

  res.json({
    success: true,
    message: 'Çıkış başarılı'
  });
});

export default {
  login,
  register,
  getCurrentUser,
  logout
};
