/**
 * Authentication & Authorization Middleware
 * JWT token doğrulama ve rol bazlı yetkilendirme
 */

import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { AppError } from './errorHandler.js';

/**
 * JWT token doğrulama middleware
 */
export const authenticate = (req, res, next) => {
  try {
    // Token'ı header'dan al
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Token bulunamadı', 401);
    }

    const token = authHeader.substring(7); // 'Bearer ' kısmını çıkar

    // Token'ı doğrula
    const decoded = jwt.verify(token, config.jwtSecret);

    // User bilgisini request'e ekle
    req.user = decoded;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Geçersiz token', 401));
    }
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token süresi dolmuş', 401));
    }
    next(error);
  }
};

/**
 * Rol bazlı yetkilendirme middleware
 * @param {Array<string>} allowedRoles - İzin verilen roller
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Kimlik doğrulaması gerekli', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('Bu işlem için yetkiniz yok', 403));
    }

    next();
  };
};

/**
 * Agent Management erişim kontrolü
 * Sadece SUPER_ADMIN erişebilir
 */
export const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    return next(new AppError('Agent Management\'e sadece Süper Admin erişebilir', 403));
  }
  next();
};

/**
 * Proje oluşturma/silme kontrolü
 * Sadece SUPER_ADMIN ve ADMIN erişebilir
 * USER erişemez
 */
export const canManageProjects = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Kimlik doğrulaması gerekli', 401));
  }

  // SUPER_ADMIN ve ADMIN proje oluşturabilir/silebilir
  if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN') {
    return next();
  }

  // USER sadece görüntüleme yapabilir (GET istekleri)
  if (req.method === 'POST' || req.method === 'DELETE') {
    return next(new AppError('Proje oluşturma/silme yetkiniz yok', 403));
  }

  // PUT (güncelleme) ve GET işlemlerine izin ver
  next();
};

/**
 * Kullanıcı yönetimi kontrolü
 * Sadece SUPER_ADMIN ve ADMIN erişebilir
 */
export const canManageUsers = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Kimlik doğrulaması gerekli', 401));
  }

  if (!['SUPER_ADMIN', 'ADMIN'].includes(req.user.role)) {
    return next(new AppError('Kullanıcı yönetimi yetkiniz yok', 403));
  }

  next();
};

export default {
  authenticate,
  authorize,
  requireSuperAdmin,
  canManageProjects,
  canManageUsers
};
