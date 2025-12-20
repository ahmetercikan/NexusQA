import { Server } from 'socket.io';
import { config } from '../config/env.js';

let io;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173', config.frontendUrl],
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join rooms based on subscription
    socket.on('subscribe:agents', () => {
      socket.join('agents');
      console.log(`${socket.id} subscribed to agents`);
    });

    socket.on('subscribe:logs', () => {
      socket.join('logs');
      console.log(`${socket.id} subscribed to logs`);
    });

    socket.on('subscribe:tests', () => {
      socket.join('tests');
      console.log(`${socket.id} subscribed to tests`);
    });

    socket.on('subscribe:documents', () => {
      socket.join('documents');
      console.log(`${socket.id} subscribed to documents`);
    });

    socket.on('subscribe:automation', () => {
      socket.join('automation');
      console.log(`${socket.id} subscribed to automation`);
    });

    // Unsubscribe
    socket.on('unsubscribe:agents', () => socket.leave('agents'));
    socket.on('unsubscribe:logs', () => socket.leave('logs'));
    socket.on('unsubscribe:tests', () => socket.leave('tests'));
    socket.on('unsubscribe:documents', () => socket.leave('documents'));
    socket.on('unsubscribe:automation', () => socket.leave('automation'));

    socket.on('disconnect', (reason) => {
      console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
    });

    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  return io;
};

// Helper functions to emit events
export const emitAgentStatus = (agent) => {
  if (io) {
    io.to('agents').emit('agent:status', agent);
  }
};

export const emitNewLog = (log) => {
  if (io) {
    io.to('logs').emit('log:new', log);
  }
};

export const emitTestStarted = (testRun) => {
  if (io) {
    io.to('tests').emit('test:started', testRun);
  }
};

export const emitTestCompleted = (testRun) => {
  if (io) {
    io.to('tests').emit('test:completed', testRun);
  }
};

export const emitTestFailed = (testRun) => {
  if (io) {
    io.to('tests').emit('test:failed', testRun);
  }
};

// Document events
export const emitDocumentStatus = (document) => {
  if (io) {
    io.to('documents').emit('document:status', document);
  }
};

export const emitDocumentAnalyzing = (document) => {
  if (io) {
    io.to('documents').emit('document:analyzing', document);
  }
};

export const emitDocumentCompleted = (document) => {
  if (io) {
    io.to('documents').emit('document:completed', document);
  }
};

export const emitScenarioCreated = (scenario) => {
  if (io) {
    io.to('documents').emit('scenario:created', scenario);
  }
};

// Automation events
export const emitAutomationStarted = (workflow) => {
  if (io) {
    io.to('automation').emit('automation:started', workflow);
  }
};

export const emitAutomationStep = (step) => {
  if (io) {
    io.to('automation').emit('automation:step', step);
  }
};

export const emitAutomationElement = (element) => {
  if (io) {
    io.to('automation').emit('automation:element', element);
  }
};

export const emitAutomationScript = (script) => {
  if (io) {
    io.to('automation').emit('automation:script', script);
  }
};

export const emitAutomationTestStart = (test) => {
  if (io) {
    io.to('automation').emit('automation:test:start', test);
  }
};

export const emitAutomationTestPass = (test) => {
  if (io) {
    io.to('automation').emit('automation:test:pass', test);
  }
};

export const emitAutomationTestFail = (test) => {
  if (io) {
    io.to('automation').emit('automation:test:fail', test);
  }
};

export const emitAutomationCompleted = (workflow) => {
  if (io) {
    io.to('automation').emit('automation:completed', workflow);
  }
};

export const emitAutomationError = (error) => {
  if (io) {
    io.to('automation').emit('automation:error', error);
  }
};

// Üretilen script'i gönder (kod görüntüleme popup için)
export const emitScriptGenerated = (scriptData) => {
  if (io) {
    io.to('automation').emit('script:generated', scriptData);
    console.log(`Script generated for scenario: ${scriptData.scenarioTitle}`);
  }
};

// Test koşum sonucu
export const emitTestRunResult = (result) => {
  if (io) {
    io.to('automation').emit('test:run:result', result);
  }
};

// Browser screenshot gönder (live preview için)
export const emitBrowserScreenshot = (screenshotData) => {
  if (io) {
    io.to('automation').emit('browser:screenshot', screenshotData);
  }
};

export const getIO = () => io;

export default {
  initializeSocket,
  emitAgentStatus,
  emitNewLog,
  emitTestStarted,
  emitTestCompleted,
  emitTestFailed,
  emitDocumentStatus,
  emitDocumentAnalyzing,
  emitDocumentCompleted,
  emitScenarioCreated,
  emitAutomationStarted,
  emitAutomationStep,
  emitAutomationElement,
  emitAutomationScript,
  emitAutomationTestStart,
  emitAutomationTestPass,
  emitAutomationTestFail,
  emitAutomationCompleted,
  emitAutomationError,
  emitScriptGenerated,
  emitTestRunResult,
  emitBrowserScreenshot,
  getIO
};
