const SystemMonitoring = require('../models/SystemMonitoring');
const os = require('os');

class SystemMonitoringService {
  /**
   * Record system metrics
   */
  async recordMetrics() {
    try {
      const cpus = os.cpus();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;

      // Calculate CPU usage percentage
      let totalIdle = 0;
      let totalTick = 0;

      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });

      const cpuUsage = 100 - ~~(100 * totalIdle / totalTick);
      const memoryUsage = (usedMem / totalMem) * 100;

      const metrics = {
        cpuUsage,
        memoryUsage,
        databaseHealth: 'healthy',
        apiHealth: 'healthy',
        activeConnections: 0,
        totalRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        uptime: process.uptime(),
        lastRestart: new Date(Date.now() - process.uptime() * 1000)
      };

      const monitoring = await SystemMonitoring.create(metrics);
      return monitoring;
    } catch (error) {
      console.error('Error recording metrics:', error);
      return null;
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth() {
    try {
      const latestMetrics = await SystemMonitoring.findOne().sort({ timestamp: -1 });

      if (!latestMetrics) {
        return {
          status: 'unknown',
          message: 'No metrics available'
        };
      }

      let status = 'healthy';
      const alerts = [];

      if (latestMetrics.cpuUsage > 80) {
        status = 'warning';
        alerts.push(`CPU usage is high: ${latestMetrics.cpuUsage}%`);
      }

      if (latestMetrics.memoryUsage > 80) {
        status = 'warning';
        alerts.push(`Memory usage is high: ${latestMetrics.memoryUsage}%`);
      }

      if (latestMetrics.cpuUsage > 95 || latestMetrics.memoryUsage > 95) {
        status = 'critical';
      }

      return {
        status,
        metrics: latestMetrics,
        alerts,
        timestamp: latestMetrics.timestamp
      };
    } catch (error) {
      throw new Error(`Error getting system health: ${error.message}`);
    }
  }

  /**
   * Get monitoring dashboard data
   */
  async getDashboardData(hours = 24) {
    try {
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

      const metrics = await SystemMonitoring.find({
        timestamp: { $gte: startTime }
      }).sort({ timestamp: -1 }).limit(100);

      const cpuChart = metrics.map(m => ({
        timestamp: m.timestamp,
        value: m.cpuUsage
      })).reverse();

      const memoryChart = metrics.map(m => ({
        timestamp: m.timestamp,
        value: m.memoryUsage
      })).reverse();

      const avgCpuUsage = metrics.reduce((sum, m) => sum + (m.cpuUsage || 0), 0) / metrics.length;
      const avgMemoryUsage = metrics.reduce((sum, m) => sum + (m.memoryUsage || 0), 0) / metrics.length;
      const maxCpuUsage = Math.max(...metrics.map(m => m.cpuUsage || 0));
      const maxMemoryUsage = Math.max(...metrics.map(m => m.memoryUsage || 0));

      return {
        cpuChart,
        memoryChart,
        statistics: {
          avgCpuUsage: avgCpuUsage.toFixed(2),
          avgMemoryUsage: avgMemoryUsage.toFixed(2),
          maxCpuUsage: maxCpuUsage.toFixed(2),
          maxMemoryUsage: maxMemoryUsage.toFixed(2)
        }
      };
    } catch (error) {
      throw new Error(`Error getting dashboard data: ${error.message}`);
    }
  }

  /**
   * Log an error
   */
  async logError(errorCode, errorMessage, severity = 'medium') {
    try {
      const latestMetrics = await SystemMonitoring.findOne().sort({ timestamp: -1 });

      if (latestMetrics) {
        const existingError = latestMetrics.errors.find(e => e.code === errorCode);

        if (existingError) {
          existingError.count += 1;
          existingError.lastOccurred = new Date();
        } else {
          latestMetrics.errors.push({
            code: errorCode,
            message: errorMessage,
            count: 1,
            lastOccurred: new Date()
          });
        }

        await latestMetrics.save();
      }

      return true;
    } catch (error) {
      console.error('Error logging system error:', error);
      return false;
    }
  }

  /**
   * Log a warning
   */
  async logWarning(warningMessage, severity = 'medium') {
    try {
      const latestMetrics = await SystemMonitoring.findOne().sort({ timestamp: -1 });

      if (latestMetrics) {
        latestMetrics.warnings.push({
          message: warningMessage,
          severity,
          timestamp: new Date()
        });

        await latestMetrics.save();
      }

      return true;
    } catch (error) {
      console.error('Error logging warning:', error);
      return false;
    }
  }

  /**
   * Update database health status
   */
  async updateDatabaseHealth(status) {
    try {
      const latestMetrics = await SystemMonitoring.findOne().sort({ timestamp: -1 });

      if (latestMetrics) {
        latestMetrics.databaseHealth = status;
        await latestMetrics.save();
      }

      return true;
    } catch (error) {
      console.error('Error updating database health:', error);
      return false;
    }
  }

  /**
   * Update API health status
   */
  async updateAPIHealth(status) {
    try {
      const latestMetrics = await SystemMonitoring.findOne().sort({ timestamp: -1 });

      if (latestMetrics) {
        latestMetrics.apiHealth = status;
        await latestMetrics.save();
      }

      return true;
    } catch (error) {
      console.error('Error updating API health:', error);
      return false;
    }
  }

  /**
   * Get error logs
   */
  async getErrorLogs(hours = 24) {
    try {
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

      const logs = await SystemMonitoring.aggregate([
        {
          $match: {
            timestamp: { $gte: startTime },
            errors: { $exists: true, $ne: [] }
          }
        },
        {
          $unwind: '$errors'
        },
        {
          $sort: { 'errors.lastOccurred': -1 }
        },
        {
          $limit: 100
        }
      ]);

      return logs;
    } catch (error) {
      throw new Error(`Error getting error logs: ${error.message}`);
    }
  }

  /**
   * Get warning logs
   */
  async getWarningLogs(hours = 24) {
    try {
      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);

      const logs = await SystemMonitoring.aggregate([
        {
          $match: {
            timestamp: { $gte: startTime },
            warnings: { $exists: true, $ne: [] }
          }
        },
        {
          $unwind: '$warnings'
        },
        {
          $sort: { 'warnings.timestamp': -1 }
        },
        {
          $limit: 100
        }
      ]);

      return logs;
    } catch (error) {
      throw new Error(`Error getting warning logs: ${error.message}`);
    }
  }

  /**
   * Cleanup old monitoring data
   */
  async cleanupOldData(daysToKeep = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      const result = await SystemMonitoring.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      return {
        success: true,
        deletedCount: result.deletedCount
      };
    } catch (error) {
      throw new Error(`Error cleaning up monitoring data: ${error.message}`);
    }
  }
}

module.exports = new SystemMonitoringService();
