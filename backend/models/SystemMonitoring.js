const mongoose = require('mongoose');

const systemMonitoringSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    required: true,
    index: true
  },
  cpuUsage: {
    type: Number,
    min: 0,
    max: 100
  },
  memoryUsage: {
    type: Number,
    min: 0,
    max: 100
  },
  diskUsage: {
    type: Number,
    min: 0,
    max: 100
  },
  databaseHealth: {
    type: String,
    enum: ['healthy', 'warning', 'critical'],
    default: 'healthy'
  },
  databaseResponseTime: {
    type: Number // in milliseconds
  },
  apiHealth: {
    type: String,
    enum: ['healthy', 'warning', 'critical'],
    default: 'healthy'
  },
  activeConnections: {
    type: Number,
    default: 0
  },
  totalRequests: {
    type: Number,
    default: 0
  },
  failedRequests: {
    type: Number,
    default: 0
  },
  averageResponseTime: {
    type: Number // in milliseconds
  },
  uptime: {
    type: Number // in seconds
  },
  lastRestart: {
    type: Date
  },
  errors: [{
    code: String,
    message: String,
    count: Number,
    lastOccurred: Date
  }],
  warnings: [{
    message: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  backupStatus: {
    type: String,
    enum: ['success', 'failed', 'pending', 'running'],
    default: 'pending'
  },
  lastBackup: {
    type: Date
  },
  nextScheduledBackup: {
    type: Date
  },
  storageUsed: {
    type: Number // in bytes
  },
  storageAvailable: {
    type: Number // in bytes
  }
}, {
  timestamps: true,
  indexes: [
    { timestamp: -1 },
    { createdAt: -1 }
  ]
});

// Automatically delete records older than 90 days
systemMonitoringSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90 days

module.exports = mongoose.model('SystemMonitoring', systemMonitoringSchema);
