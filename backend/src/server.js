import { createServer } from 'http';
import app from './app.js';
import { config } from './config/env.js';
import prisma from './config/database.js';
import { initializeSocket } from './websocket/socketHandler.js';

const server = createServer(app);

// Initialize WebSocket
const io = initializeSocket(server);

// Make io accessible to routes
app.set('io', io);

async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('Database connected successfully');

    // Start server
    server.listen(config.port, () => {
      console.log(`
========================================
   Nexus QA Backend Server
========================================
   Environment: ${config.nodeEnv}
   Port: ${config.port}
   API: http://localhost:${config.port}/api
   Health: http://localhost:${config.port}/health
   WebSocket: ws://localhost:${config.port}
========================================
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  server.close(async () => {
    console.log('HTTP server closed');
    await prisma.$disconnect();
    console.log('Database connection closed');
    process.exit(0);
  });

  // Force close after 10s
  setTimeout(() => {
    console.error('Forced shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

startServer();
