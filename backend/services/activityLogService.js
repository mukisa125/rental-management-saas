const ActivityLog = require('../models/ActivityLog');

class ActivityLogService {
  /**
   * Log an activity
   */
  async logActivity(logData) {
    try {
      const activity = await ActivityLog.create({
        company: logData.company,
        user: logData.user,
        userName: logData.userName,
        userEmail: logData.userEmail,
        action: logData.action,
        entity: logData.entity,
        entityId: logData.entityId,
        entityName: logData.entityName,
        oldValue: logData.oldValue,
        newValue: logData.newValue,
        changes: logData.changes,
        description: logData.description,
        ipAddress: logData.ipAddress,
        userAgent: logData.userAgent,
        status: logData.status || 'success',
        errorMessage: logData.errorMessage,
        metadata: logData.metadata
      });

      return activity;
    } catch (error) {
      console.error('Error logging activity:', error);
      // Don't throw - logging should not break main functionality
      return null;
    }
  }

  /**
   * Get activities for a company
   */
  async getCompanyActivities(companyId, filters = {}) {
    try {
      const query = { company: companyId };

      if (filters.action) {
        query.action = filters.action;
      }

      if (filters.entity) {
        query.entity = filters.entity;
      }

      if (filters.userId) {
        query.user = filters.userId;
      }

      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) {
          query.createdAt.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query.createdAt.$lte = new Date(filters.endDate);
        }
      }

      if (filters.status) {
        query.status = filters.status;
      }

      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const skip = (page - 1) * limit;

      const activities = await ActivityLog.find(query)
        .populate('user', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await ActivityLog.countDocuments(query);

      return {
        activities,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Error fetching company activities: ${error.message}`);
    }
  }

  /**
   * Get user activities
   */
  async getUserActivities(userId, filters = {}) {
    try {
      const query = { user: userId };

      if (filters.action) {
        query.action = filters.action;
      }

      if (filters.startDate || filters.endDate) {
        query.createdAt = {};
        if (filters.startDate) {
          query.createdAt.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          query.createdAt.$lte = new Date(filters.endDate);
        }
      }

      const page = filters.page || 1;
      const limit = filters.limit || 50;
      const skip = (page - 1) * limit;

      const activities = await ActivityLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await ActivityLog.countDocuments(query);

      return {
        activities,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new Error(`Error fetching user activities: ${error.message}`);
    }
  }

  /**
   * Get activity summary for a company
   */
  async getActivitySummary(companyId, days = 30) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const summary = await ActivityLog.aggregate([
        {
          $match: {
            company: companyId,
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      const totalActivities = await ActivityLog.countDocuments({
        company: companyId,
        createdAt: { $gte: startDate }
      });

      const successfulActivities = await ActivityLog.countDocuments({
        company: companyId,
        createdAt: { $gte: startDate },
        status: 'success'
      });

      const failedActivities = await ActivityLog.countDocuments({
        company: companyId,
        createdAt: { $gte: startDate },
        status: 'failure'
      });

      return {
        period: `Last ${days} days`,
        totalActivities,
        successfulActivities,
        failedActivities,
        activitiesByType: summary
      };
    } catch (error) {
      throw new Error(`Error getting activity summary: ${error.message}`);
    }
  }

  /**
   * Track login activity
   */
  async trackLogin(userId, userName, userEmail, ipAddress, userAgent, company = null) {
    return this.logActivity({
      company,
      user: userId,
      userName,
      userEmail,
      action: 'login',
      entity: 'user',
      entityId: userId,
      description: `${userName} logged in`,
      ipAddress,
      userAgent,
      status: 'success'
    });
  }

  /**
   * Track logout activity
   */
  async trackLogout(userId, userName, userEmail, ipAddress, userAgent, company = null) {
    return this.logActivity({
      company,
      user: userId,
      userName,
      userEmail,
      action: 'logout',
      entity: 'user',
      entityId: userId,
      description: `${userName} logged out`,
      ipAddress,
      userAgent,
      status: 'success'
    });
  }

  /**
   * Track registration
   */
  async trackRegistration(userId, userName, userEmail, ipAddress, userAgent, company = null) {
    return this.logActivity({
      company,
      user: userId,
      userName,
      userEmail,
      action: 'register',
      entity: 'user',
      entityId: userId,
      description: `New user registered: ${userName}`,
      ipAddress,
      userAgent,
      status: 'success'
    });
  }

  /**
   * Delete old activities (cleanup)
   */
  async deleteOldActivities(daysToKeep = 90) {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      const result = await ActivityLog.deleteMany({
        createdAt: { $lt: cutoffDate }
      });

      return {
        success: true,
        deletedCount: result.deletedCount,
        message: `Deleted ${result.deletedCount} activities older than ${daysToKeep} days`
      };
    } catch (error) {
      throw new Error(`Error deleting old activities: ${error.message}`);
    }
  }

  /**
   * Export activities to CSV format
   */
  async exportActivitiesToCSV(companyId, filters = {}) {
    try {
      const { activities } = await this.getCompanyActivities(companyId, { ...filters, limit: 10000 });

      let csv = 'User,Email,Action,Entity,Entity Name,Status,Date,IP Address\n';

      activities.forEach(activity => {
        const row = [
          activity.userName,
          activity.userEmail,
          activity.action,
          activity.entity,
          activity.entityName || '',
          activity.status,
          activity.createdAt.toISOString(),
          activity.ipAddress || ''
        ];
        csv += `"${row.join('","')}"\n`;
      });

      return csv;
    } catch (error) {
      throw new Error(`Error exporting activities: ${error.message}`);
    }
  }

  /**
   * Get system-wide activity statistics
   */
  async getSystemActivityStats(days = 7) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const stats = await ActivityLog.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              action: '$action'
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.date': 1 }
        }
      ]);

      return stats;
    } catch (error) {
      throw new Error(`Error getting system activity stats: ${error.message}`);
    }
  }
}

module.exports = new ActivityLogService();
