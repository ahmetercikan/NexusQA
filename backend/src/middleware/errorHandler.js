// Global error handling middleware

export class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    Error.captureStackTrace(this, this.constructor);
  }
}

// 404 Not Found handler
export const notFoundHandler = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

// Global error handler
export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  // Prisma error handling
  if (err.code) {
    switch (err.code) {
      case 'P2002':
        err.message = 'Unique constraint violation';
        err.statusCode = 409;
        break;
      case 'P2025':
        err.message = 'Record not found';
        err.statusCode = 404;
        break;
      case 'P2003':
        err.message = 'Foreign key constraint violation';
        err.statusCode = 400;
        break;
    }
  }

  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    message: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Async handler wrapper
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default { AppError, notFoundHandler, errorHandler, asyncHandler };
