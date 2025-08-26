const { logger } = require('../utils/logger');
const jwt = require('jsonwebtoken');

let io;

function setupWebSocket(socketIo) {
  io = socketIo;
  
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }
      
      // Remove 'Bearer ' prefix if present
      const cleanToken = token.replace('Bearer ', '');
      
      const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET || 'your-secret-key');
      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      
      next();
    } catch (error) {
      logger.error('WebSocket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`User ${socket.userId} connected to WebSocket`);
    
    // Handle pipeline subscriptions
    socket.on('subscribe:pipeline', (pipelineId) => {
      socket.join(`pipeline:${pipelineId}`);
      logger.info(`User ${socket.userId} subscribed to pipeline ${pipelineId}`);
    });

    socket.on('unsubscribe:pipeline', (pipelineId) => {
      socket.leave(`pipeline:${pipelineId}`);
      logger.info(`User ${socket.userId} unsubscribed from pipeline ${pipelineId}`);
    });

    // Handle dashboard subscriptions
    socket.on('subscribe:dashboard', () => {
      socket.join('dashboard');
      logger.info(`User ${socket.userId} subscribed to dashboard updates`);
    });

    socket.on('unsubscribe:dashboard', () => {
      socket.leave('dashboard');
      logger.info(`User ${socket.userId} unsubscribed from dashboard updates`);
    });

    // Handle metrics requests
    socket.on('request:metrics', async () => {
      try {
        // Emit current metrics to the requesting user
        socket.emit('metrics:update', {
          timestamp: new Date().toISOString(),
          type: 'current'
        });
      } catch (error) {
        logger.error('Error handling metrics request:', error);
        socket.emit('error', { message: 'Failed to fetch metrics' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`User ${socket.userId} disconnected: ${reason}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`WebSocket error for user ${socket.userId}:`, error);
    });
  });

  logger.info('WebSocket server setup completed');
}

// Utility functions for emitting events
function emitToPipeline(pipelineId, event, data) {
  if (io) {
    io.to(`pipeline:${pipelineId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
    logger.debug(`Emitted ${event} to pipeline ${pipelineId}`);
  }
}

function emitToDashboard(event, data) {
  if (io) {
    io.to('dashboard').emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
    logger.debug(`Emitted ${event} to dashboard`);
  }
}

function emitToUser(userId, event, data) {
  if (io) {
    // Find socket by userId (this is a simplified approach)
    const sockets = Array.from(io.sockets.sockets.values());
    const userSocket = sockets.find(socket => socket.userId === userId);
    
    if (userSocket) {
      userSocket.emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      });
      logger.debug(`Emitted ${event} to user ${userId}`);
    }
  }
}

function broadcastToAll(event, data) {
  if (io) {
    io.emit(event, {
      ...data,
      timestamp: new Date().toISOString()
    });
    logger.debug(`Broadcasted ${event} to all connected clients`);
  }
}

// Specific event emitters
function emitPipelineUpdate(pipelineId, pipelineData) {
  emitToPipeline(pipelineId, 'pipeline:update', {
    pipelineId,
    data: pipelineData
  });
}

function emitBuildStatus(buildData) {
  emitToPipeline(buildData.pipeline_id, 'build:status', {
    buildId: buildData.id,
    status: buildData.status,
    pipelineId: buildData.pipeline_id,
    data: buildData
  });
  
  // Also emit to dashboard for overall updates
  emitToDashboard('build:update', {
    buildId: buildData.id,
    status: buildData.status,
    pipelineId: buildData.pipeline_id
  });
}

function emitMetricsUpdate(metricsData) {
  emitToDashboard('metrics:update', {
    type: 'realtime',
    data: metricsData
  });
}

function emitAlertTriggered(alertData) {
  // Emit to dashboard
  emitToDashboard('alert:triggered', {
    alertId: alertData.id,
    severity: alertData.severity,
    message: alertData.message,
    pipelineId: alertData.pipeline_id
  });
  
  // Emit to specific pipeline if applicable
  if (alertData.pipeline_id) {
    emitToPipeline(alertData.pipeline_id, 'alert:triggered', {
      alertId: alertData.id,
      severity: alertData.severity,
      message: alertData.message
    });
  }
}

function emitSystemNotification(notificationData) {
  broadcastToAll('system:notification', {
    type: notificationData.type,
    message: notificationData.message,
    severity: notificationData.severity || 'info'
  });
}

module.exports = {
  setupWebSocket,
  emitToPipeline,
  emitToDashboard,
  emitToUser,
  broadcastToAll,
  emitPipelineUpdate,
  emitBuildStatus,
  emitMetricsUpdate,
  emitAlertTriggered,
  emitSystemNotification
};
