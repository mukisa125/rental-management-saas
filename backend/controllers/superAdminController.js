const Company = require('../models/Company');
const User = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const SubscriptionTransaction = require('../models/SubscriptionTransaction');
const Property = require('../models/Property');
const Unit = require('../models/Unit');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');
const ActivityLog = require('../models/ActivityLog');
const SystemMonitoring = require('../models/SystemMonitoring');
const SystemSettings = require('../models/SystemSettings');
const subscriptionService = require('../services/subscriptionService');
const reportingService = require('../services/reportingService');
const activityLogService = require('../services/activityLogService');
const systemMonitoringService = require('../services/systemMonitoringService');

// @desc    Get super admin dashboard data
// @route   GET /api/super-admin/dashboard
// @access  Private (super_admin only)
const getDashboard = async (req, res) => {
  try {
    const companies = await Company.find({ deletedAt: null });
    const properties = await Property.find({ deletedAt: null });
    const units = await Unit.find({ deletedAt: null });
    const owners = await User.find({ role: { $in: ['owner', 'self_owner'] } });
    const managers = await User.find({ role: 'manager' });
    const tenants = await Tenant.find({ deletedAt: null });
    const subscriptions = await SubscriptionTransaction.find({ status: 'completed' })
      .populate('company', 'companyName')
      .populate('subscriptionPlan', 'name');
    const latestTransactions = await SubscriptionTransaction.find()
      .populate('company', 'companyName')
      .sort({ processedDate: -1, createdAt: -1 })
      .limit(5);
    const activities = await ActivityLog.find()
      .populate('company', 'companyName')
      .sort({ createdAt: -1 })
      .limit(5);
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ displayOrder: 1, monthlyPrice: 1 });

    // Calculate metrics
    const activeSubscriptions = companies.filter(c => c.subscriptionStatus === 'active').length;
    const expiredSubscriptions = companies.filter(c => c.subscriptionStatus === 'expired').length;
    const monthlyRevenue = subscriptions
      .filter(t => {
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return t.processedDate >= monthAgo;
      })
      .reduce((sum, t) => sum + t.amount, 0);
    const annualRevenue = subscriptions.reduce((sum, t) => sum + t.amount, 0);

    const occupiedUnits = units.filter(u => u.status === 'occupied').length;
    const occupancyRate = units.length > 0 ? ((occupiedUnits / units.length) * 100).toFixed(2) : 0;

    const now = new Date();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const getPercentChange = (current, previous) => {
      if (!previous && !current) return 0;
      if (!previous) return 100;
      return Number((((current - previous) / previous) * 100).toFixed(1));
    };

    const countCreatedBetween = (items, start, end) => (
      items.filter((item) => item.createdAt >= start && item.createdAt < end).length
    );

    const currentSubscriptions = subscriptions.filter((transaction) => (
      transaction.processedDate >= currentMonth && transaction.processedDate < nextMonth
    ));
    const previousSubscriptions = subscriptions.filter((transaction) => (
      transaction.processedDate >= previousMonth && transaction.processedDate < currentMonth
    ));
    const previousMonthlyRevenue = previousSubscriptions.reduce((sum, transaction) => sum + transaction.amount, 0);

    const monthlyRevenueSeries = Array.from({ length: 12 }, (_, index) => {
      const monthStart = new Date(now.getFullYear(), index, 1);
      const monthEnd = new Date(now.getFullYear(), index + 1, 1);
      const value = subscriptions
        .filter((transaction) => transaction.processedDate >= monthStart && transaction.processedDate < monthEnd)
        .reduce((sum, transaction) => sum + transaction.amount, 0);

      return {
        label: monthStart.toLocaleString('en-US', { month: 'short' }),
        value
      };
    });

    const planSummary = plans.map((plan) => {
      const count = companies.filter((company) => (
        String(company.subscriptionPlan) === String(plan._id)
      )).length;

      return {
        name: plan.name,
        subscriptions: count,
        percentage: companies.length ? Number(((count / companies.length) * 100).toFixed(1)) : 0
      };
    });

    // System health
    const health = await systemMonitoringService.getSystemHealth();
    const healthMetrics = health.metrics || {};
    const systemHealth = [
      { name: 'API Service', status: healthMetrics.apiHealth || health.status || 'healthy' },
      { name: 'Database', status: healthMetrics.databaseHealth || 'healthy' },
      { name: 'File Storage', status: healthMetrics.storageAvailable === 0 ? 'warning' : 'healthy' },
      { name: 'Email Service', status: 'healthy' }
    ];

    res.json({
      success: true,
      kpis: {
        totalCustomers: companies.length,
        totalProperties: properties.length,
        totalUnits: units.length,
        totalOwners: owners.length,
        totalManagers: managers.length,
        totalTenants: tenants.length,
        activeSubscriptions,
        expiredSubscriptions,
        monthlyRevenue,
        annualRevenue,
        occupancyRate,
        systemHealth: health.status,
        customersTrend: getPercentChange(countCreatedBetween(companies, currentMonth, nextMonth), countCreatedBetween(companies, previousMonth, currentMonth)),
        propertiesTrend: getPercentChange(countCreatedBetween(properties, currentMonth, nextMonth), countCreatedBetween(properties, previousMonth, currentMonth)),
        unitsTrend: getPercentChange(countCreatedBetween(units, currentMonth, nextMonth), countCreatedBetween(units, previousMonth, currentMonth)),
        tenantsTrend: getPercentChange(countCreatedBetween(tenants, currentMonth, nextMonth), countCreatedBetween(tenants, previousMonth, currentMonth)),
        activeSubscriptionsTrend: getPercentChange(activeSubscriptions, companies.filter(c => c.subscriptionStatus !== 'active').length),
        expiredSubscriptionsTrend: getPercentChange(expiredSubscriptions, Math.max(companies.length - expiredSubscriptions, 1)),
        monthlyRevenueTrend: getPercentChange(monthlyRevenue, previousMonthlyRevenue),
        annualRevenueTrend: getPercentChange(annualRevenue, Math.max(annualRevenue - monthlyRevenue, 1))
      },
      charts: {
        revenue: monthlyRevenueSeries,
        subscriptionsByStatus: {
          active: activeSubscriptions,
          trial: companies.filter(c => c.subscriptionStatus === 'trial').length,
          pastDue: companies.filter(c => c.subscriptionStatus === 'suspended').length,
          expired: expiredSubscriptions,
          cancelled: companies.filter(c => c.subscriptionStatus === 'cancelled').length
        }
      },
      plans: planSummary,
      systems: systemHealth,
      activities: activities.map((activity) => ({
        id: activity._id,
        title: activity.description || activity.action.replace(/_/g, ' '),
        subtitle: activity.company?.companyName || activity.entityName || activity.userName || 'Platform activity',
        type: activity.action,
        createdAt: activity.createdAt
      })),
      transactions: latestTransactions.map((transaction) => ({
        id: transaction._id,
        invoiceId: transaction.invoiceId || `INV-${String(transaction._id).slice(-6).toUpperCase()}`,
        customer: transaction.company?.companyName || 'Unknown customer',
        amount: transaction.amount,
        status: transaction.status,
        date: transaction.processedDate || transaction.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all companies/customers
// @route   GET /api/super-admin/customers
// @access  Private (super_admin only)
const getCustomers = async (req, res) => {
  try {
    const { page = 1, limit = 50, status, planId } = req.query;
    const skip = (page - 1) * limit;

    let query = { deletedAt: null };
    if (status) query.subscriptionStatus = status;
    if (planId) query.subscriptionPlan = planId;

    const companies = await Company.find(query)
      .populate('subscriptionPlan', 'name price')
      .populate('superAdmin', 'name email')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Company.countDocuments(query);

    res.json({
      success: true,
      companies,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get customer details
// @route   GET /api/super-admin/customers/:companyId
// @access  Private (super_admin only)
const getCustomerDetails = async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId)
      .populate('subscriptionPlan')
      .populate('superAdmin', 'name email');

    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    // Get customer statistics
    const properties = await Property.countDocuments({ company: company._id });
    const units = await Unit.countDocuments({ company: company._id });
    const tenants = await Tenant.countDocuments({ company: company._id });
    const managers = await User.countDocuments({ company: company._id, role: 'manager' });
    const owners = await User.countDocuments({ company: company._id, role: { $in: ['owner', 'self_owner'] } });

    // Get recent transactions
    const recentTransactions = await SubscriptionTransaction.find({ company: company._id })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      company,
      statistics: {
        properties,
        units,
        tenants,
        managers,
        owners
      },
      recentTransactions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Suspend customer account
// @route   POST /api/super-admin/customers/:companyId/suspend
// @access  Private (super_admin only)
const suspendCustomer = async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    company.subscriptionStatus = 'suspended';
    company.isActive = false;
    await company.save();

    await activityLogService.logActivity({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'subscription_suspend',
      entity: 'company',
      entityId: company._id,
      entityName: company.companyName,
      description: `Suspended ${company.companyName}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Company suspended successfully',
      company
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Activate customer account
// @route   POST /api/super-admin/customers/:companyId/activate
// @access  Private (super_admin only)
const activateCustomer = async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    company.subscriptionStatus = 'active';
    company.isActive = true;
    await company.save();

    await activityLogService.logActivity({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'subscription_reactivate',
      entity: 'company',
      entityId: company._id,
      entityName: company.companyName,
      description: `Activated ${company.companyName}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Company activated successfully',
      company
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Change customer subscription plan
// @route   POST /api/super-admin/customers/:companyId/change-plan
// @access  Private (super_admin only)
const changeCustomerPlan = async (req, res) => {
  try {
    const { newPlanId } = req.body;

    const company = await Company.findById(req.params.companyId);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const newPlan = await SubscriptionPlan.findById(newPlanId);
    if (!newPlan) {
      return res.status(404).json({ success: false, message: 'Subscription plan not found' });
    }

    const oldPlanId = company.subscriptionPlan;
    company.subscriptionPlan = newPlanId;
    await company.save();

    await activityLogService.logActivity({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'subscription_upgrade',
      entity: 'company',
      entityId: company._id,
      entityName: company.companyName,
      description: `Changed plan from ${oldPlanId} to ${newPlanId}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Subscription plan changed successfully',
      company
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get system health and monitoring
// @route   GET /api/super-admin/system-monitor
// @access  Private (super_admin only)
const getSystemMonitor = async (req, res) => {
  try {
    const health = await systemMonitoringService.getSystemHealth();
    const dashboardData = await systemMonitoringService.getDashboardData(24);
    const errorLogs = await systemMonitoringService.getErrorLogs(24);
    const warningLogs = await systemMonitoringService.getWarningLogs(24);

    res.json({
      success: true,
      health,
      dashboardData,
      recentErrors: errorLogs.slice(0, 10),
      recentWarnings: warningLogs.slice(0, 10)
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get activity logs
// @route   GET /api/super-admin/activity-logs
// @access  Private (super_admin only)
const getActivityLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, action, startDate, endDate } = req.query;

    const logs = await activityLogService.getActivitySummary(null, 30);

    const activities = await ActivityLog.find()
      .populate('user', 'name email')
      .populate('company', 'companyName')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ActivityLog.countDocuments();

    res.json({
      success: true,
      activities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      summary: logs
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get subscription analytics
// @route   GET /api/super-admin/subscriptions-analytics
// @access  Private (super_admin only)
const getSubscriptionAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const report = await reportingService.generateSubscriptionReport(
      startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      endDate || new Date().toISOString().substring(0, 10)
    );

    res.json({
      success: true,
      report
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get subscription plans (all)
// @route   GET /api/super-admin/plans
// @access  Private (super_admin only)
const getPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ deletedAt: null }).sort({ displayOrder: 1 });
    res.json({ success: true, plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create subscription plan
// @route   POST /api/super-admin/plans
// @access  Private (super_admin only)
const createPlan = async (req, res) => {
  try {
    const payload = req.body;
    const plan = await SubscriptionPlan.create(payload);
    res.status(201).json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update subscription plan
// @route   PUT /api/super-admin/plans/:planId
// @access  Private (super_admin only)
const updatePlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    Object.assign(plan, req.body);
    await plan.save();
    res.json({ success: true, plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete subscription plan (soft delete)
// @route   DELETE /api/super-admin/plans/:planId
// @access  Private (super_admin only)
const deletePlan = async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    plan.deletedAt = new Date();
    plan.isActive = false;
    await plan.save();
    res.json({ success: true, message: 'Plan deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get revenue analytics
// @route   GET /api/super-admin/revenue-analytics
// @access  Private (super_admin only)
const getRevenueAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Get all subscription transactions
    const transactions = await SubscriptionTransaction.find({
      status: 'completed',
      processedDate: {
        $gte: new Date(startDate || Date.now() - 365 * 24 * 60 * 60 * 1000),
        $lte: new Date(endDate || Date.now())
      }
    }).populate('subscriptionPlan');

    const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
    const revenueByMonth = {};
    const revenueByPlan = {};

    transactions.forEach(t => {
      const month = t.processedDate.toISOString().substring(0, 7);
      revenueByMonth[month] = (revenueByMonth[month] || 0) + t.amount;

      const planName = t.subscriptionPlan?.name || 'Unknown';
      revenueByPlan[planName] = (revenueByPlan[planName] || 0) + t.amount;
    });

    res.json({
      success: true,
      analytics: {
        totalRevenue,
        transactionCount: transactions.length,
        averageTransactionValue: transactions.length > 0 ? totalRevenue / transactions.length : 0,
        revenueByMonth,
        revenueByPlan
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get system settings
// @route   GET /api/super-admin/settings
// @access  Private (super_admin only)
const getSettings = async (req, res) => {
  try {
    const settings = await SystemSettings.find().sort({ category: 1 });

    const groupedSettings = {};
    settings.forEach(setting => {
      if (!groupedSettings[setting.category]) {
        groupedSettings[setting.category] = [];
      }
      groupedSettings[setting.category].push({
        key: setting.key,
        value: setting.isEditable ? null : setting.value, // Hide sensitive values
        description: setting.description,
        dataType: setting.dataType,
        isEditable: setting.isEditable
      });
    });

    res.json({
      success: true,
      settings: groupedSettings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update system settings
// @route   PUT /api/super-admin/settings/:key
// @access  Private (super_admin only)
const updateSetting = async (req, res) => {
  try {
    const { value } = req.body;
    const { key } = req.params;

    const setting = await SystemSettings.findOneAndUpdate(
      { key },
      { value },
      { new: true }
    );

    if (!setting) {
      return res.status(404).json({ success: false, message: 'Setting not found' });
    }

    await activityLogService.logActivity({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'settings_update',
      entity: 'system_settings',
      entityId: setting._id,
      entityName: key,
      oldValue: setting.value,
      newValue: value,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Setting updated successfully',
      setting
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset user password (as super admin)
// @route   POST /api/super-admin/users/:userId/reset-password
// @access  Private (super_admin only)
const resetUserPassword = async (req, res) => {
  try {
    const { newPassword } = req.body;
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    await activityLogService.logActivity({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'user_update',
      entity: 'user',
      entityId: user._id,
      entityName: user.name,
      description: `Reset password for ${user.name}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get pending users waiting for approval
// @route   GET /api/super-admin/pending-users
// @access  Private (super_admin only)
const getPendingUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;

    const pendingUsers = await User.find({ approvalStatus: 'pending', deletedAt: null })
      .select('-password')
      .populate('company', 'companyName')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments({ approvalStatus: 'pending', deletedAt: null });

    res.json({
      success: true,
      users: pendingUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get subscriptions expiring soon
// @route   GET /api/super-admin/expiring-subscriptions
// @access  Private (super_admin only)
const getExpiringSubscriptions = async (req, res) => {
  try {
    const days = Math.max(parseInt(req.query.days, 10) || 5, 1);
    const now = new Date();
    const windowEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    const companies = await Company.find({
      deletedAt: null,
      subscriptionStatus: { $in: ['trial', 'active'] },
      $or: [
        { subscriptionEndDate: { $gte: now, $lte: windowEnd } },
        { trialEndsAt: { $gte: now, $lte: windowEnd } },
        { nextPaymentDueDate: { $gte: now, $lte: windowEnd } }
      ]
    })
      .populate('subscriptionPlan', 'name monthlyPrice annualPrice')
      .sort({ subscriptionEndDate: 1, trialEndsAt: 1, nextPaymentDueDate: 1 })
      .limit(20);

    const subscriptions = companies.map((company) => {
      const candidateDates = [
        company.subscriptionEndDate,
        company.trialEndsAt,
        company.nextPaymentDueDate
      ].filter(Boolean).map((date) => new Date(date));
      const expiryDate = candidateDates.sort((a, b) => a - b)[0];
      const daysRemaining = Math.max(0, Math.ceil((expiryDate - now) / (24 * 60 * 60 * 1000)));

      return {
        _id: company._id,
        companyName: company.companyName,
        ownerName: company.ownerName,
        email: company.email,
        subscriptionStatus: company.subscriptionStatus,
        subscriptionPlan: company.subscriptionPlan,
        expiryDate,
        daysRemaining
      };
    });

    res.json({
      success: true,
      subscriptions,
      total: subscriptions.length,
      days
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve a pending user
// @route   POST /api/super-admin/users/:userId/approve
// @access  Private (super_admin only)
const approveUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.approvalStatus === 'approved') {
      return res.status(400).json({ success: false, message: 'User is already approved' });
    }

    const previousStatus = user.approvalStatus;
    user.approvalStatus = 'approved';
    user.approvedBy = req.user._id;
    user.approvalDate = new Date();
    await user.save();

    // Log activity
    await activityLogService.logActivity({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'user_approved',
      entity: 'user',
      entityId: user._id,
      entityName: user.name,
      oldValue: previousStatus,
      newValue: 'approved',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: `User ${user.name} has been approved`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all users (managers, owners, tenants, etc.)
// @route   GET /api/super-admin/users
// @access  Private (super_admin only)
const getUsers = async (req, res) => {
  try {
    console.log('GET /api/super-admin/users called by:', req.user?.email || req.user?._id);
    console.log('Query:', req.query);
    const { page = 1, limit = 50, role, companyId, search, status } = req.query;
    const skip = (page - 1) * limit;

    let query = { deletedAt: null };
    if (role) query.role = role;
    if (companyId) query.company = companyId;
    if (status) query.approvalStatus = status;
    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ name: regex }, { email: regex }, { companyName: regex }];
    }

    const users = await User.find(query)
      .select('-password')
      .populate({ path: 'company', populate: { path: 'subscriptionPlan', select: 'name monthlyPrice annualPrice' } })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a user
// @route   PUT /api/super-admin/users/:userId
// @access  Private (super_admin only)
const updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = (({ name, email, phone, role, company, companyName, isActive, approvalStatus }) => ({ name, email, phone, role, company, companyName, isActive, approvalStatus }))(req.body);

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    Object.keys(updates).forEach(k => {
      if (updates[k] !== undefined) user[k] = updates[k];
    });

    await user.save();

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Soft-delete a user
// @route   DELETE /api/super-admin/users/:userId
// @access  Private (super_admin only)
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.deletedAt = new Date();
    user.isActive = false;
    await user.save();

    res.json({ success: true, message: 'User deleted', user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reject a pending user
// @route   POST /api/super-admin/users/:userId/reject
// @access  Private (super_admin only)
const rejectUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || rejectionReason.trim() === '') {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.approvalStatus === 'rejected') {
      return res.status(400).json({ success: false, message: 'User is already rejected' });
    }

    const previousStatus = user.approvalStatus;
    user.approvalStatus = 'rejected';
    user.rejectionReason = rejectionReason;
    await user.save();

    // Log activity
    await activityLogService.logActivity({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'user_rejected',
      entity: 'user',
      entityId: user._id,
      entityName: user.name,
      oldValue: previousStatus,
      newValue: `rejected - ${rejectionReason}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: `User ${user.name} has been rejected`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
        rejectionReason: user.rejectionReason
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDashboard,
  getCustomers,
  getCustomerDetails,
  suspendCustomer,
  activateCustomer,
  changeCustomerPlan,
  getSystemMonitor,
  getActivityLogs,
  getSubscriptionAnalytics,
  getRevenueAnalytics,
  getSettings,
  updateSetting,
  resetUserPassword,
  getPendingUsers,
  getExpiringSubscriptions,
  getUsers,
  approveUser,
  rejectUser,
  updateUser,
  deleteUser,
  getPlans,
  createPlan,
  updatePlan,
  deletePlan
};
