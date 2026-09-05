const Company = require('../models/Company');
const User = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const SubscriptionTransaction = require('../models/SubscriptionTransaction');
const Property = require('../models/Property');
const Unit = require('../models/Unit');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');
const PlanAssignment = require('../models/PlanAssignment');
const BillingTransaction = require('../models/BillingTransaction');
const ActivityLog = require('../models/ActivityLog');
const SystemMonitoring = require('../models/SystemMonitoring');
const SystemSettings = require('../models/SystemSettings');
const Notification = require('../models/Notification');
const subscriptionService = require('../services/subscriptionService');
const reportingService = require('../services/reportingService');
const activityLogService = require('../services/activityLogService');
const systemMonitoringService = require('../services/systemMonitoringService');
const {
  refreshCompanySubscriptionState,
  createRenewalTransaction,
  calculatePlanAmount,
  generateInvoiceNumber
} = require('../services/billingLifecycleService');
const { applyPurchasedViewCredits } = require('../services/propertySeekerBillingService');

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toDateRange = (startDate, endDate) => {
  const start = startDate ? new Date(startDate) : new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
  const end = endDate ? new Date(endDate) : new Date();
  return { start, end };
};

const safeDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const billingMethodLabel = (value) => ({
  mtn_mobile_money: 'MTN Mobile Money',
  airtel_money: 'Airtel Money',
  bank_transfer: 'Bank Transfer',
  card_payment: 'Card Payment',
  cash: 'Cash',
  manual: 'Manual',
  pending_gateway: 'Pending Gateway',
  mobile_money: 'MTN Mobile Money',
  credit_card: 'Card Payment',
  stripe: 'Card Payment',
  paypal: 'Card Payment',
  flutterwave: 'Pending Gateway'
}[String(value || '').toLowerCase()] || 'Manual');

const paymentForLabel = (value) => ({
  landlord_subscription: 'Landlord Subscription',
  listing_detail_unlock: 'Listing Detail Unlock',
  per_view_charge: 'Per View Charge',
  map_location_reveal: 'Map Location Reveal',
  landlord_contact_reveal: 'Landlord Contact Reveal',
  visit_booking: 'Visit Booking',
  credit_bundle: 'Credit Bundle',
  property_view_package: 'Property View Package',
  premium_seeker_plan: 'Premium Seeker Plan',
  other: 'Other'
}[String(value || '').toLowerCase()] || 'Other');

const chargeTypeLabel = (value) => ({
  per_view: 'Per View',
  detail_unlock: 'Detail Unlock',
  map_reveal: 'Map Reveal',
  contact_reveal: 'Contact Reveal',
  visit_booking: 'Visit Booking',
  credit_bundle: 'Credit Bundle',
  monthly_seeker_plan: 'Monthly Seeker Plan',
  other: 'Other'
}[String(value || '').toLowerCase()] || 'Other');

const toNullableNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const validateLandlordPlanCapacity = async ({ userId, plan }) => {
  if (!userId || !plan) return { ok: true };
  const [currentUnits, currentProperties] = await Promise.all([
    Unit.countDocuments({ owner: userId, deletedAt: null }),
    Property.countDocuments({ owner: userId, deletedAt: null })
  ]);

  const maxUnits = toNullableNumber(plan.maxUnits);
  if (maxUnits !== null && currentUnits > maxUnits) {
    return {
      ok: false,
      message: `Cannot assign ${plan.name || 'selected'} plan: landlord currently has ${currentUnits} units, but plan allows ${maxUnits} units.`
    };
  }

  const maxProperties = toNullableNumber(plan.maxProperties);
  if (maxProperties !== null && currentProperties > maxProperties) {
    return {
      ok: false,
      message: `Cannot assign ${plan.name || 'selected'} plan: landlord currently has ${currentProperties} properties, but plan allows ${maxProperties} properties.`
    };
  }

  return { ok: true };
};

const addMonths = (date, months) => {
  const base = safeDate(date) || new Date();
  const next = new Date(base);
  next.setMonth(next.getMonth() + Math.max(0, toNumber(months, 0)));
  return next;
};

const calculateAssignmentAmount = ({ plan, billingCycle, subscribedMonths, userType }) => {
  const months = Math.max(1, toNumber(subscribedMonths, 1));
  const cycle = String(billingCycle || 'monthly').toLowerCase();

  if (cycle === 'annual') {
    const annual = toNumber(plan?.annualPrice);
    return annual > 0 ? Number(((annual / 12) * months).toFixed(2)) : Number((toNumber(plan?.monthlyPrice) * months).toFixed(2));
  }

  if (['pay_per_use', 'credit_bundle'].includes(cycle) || userType === 'property_seeker') {
    const base = toNumber(plan?.price || plan?.monthlyPrice);
    return Number((base * months).toFixed(2));
  }

  return Number((toNumber(plan?.monthlyPrice) * months).toFixed(2));
};

const mapAssignmentToBillingStatus = (assignmentStatus) => {
  const key = String(assignmentStatus || '').toLowerCase();
  if (key === 'active') return 'paid';
  if (key === 'cancelled') return 'cancelled';
  if (key === 'expired') return 'failed';
  return 'pending';
};

const computeRemainingDays = (expiryDate) => {
  const expiry = safeDate(expiryDate);
  if (!expiry) return null;
  const now = new Date();
  const diff = Math.ceil((expiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  return Number.isFinite(diff) ? diff : null;
};

const remainingLabel = (days) => {
  if (days === null || days === undefined) return 'N/A';
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return 'Ends today';
  return `${days} days left`;
};

// @desc    Get super admin dashboard data
// @route   GET /api/super-admin/dashboard
// @access  Private (super_admin only)
const getDashboard = async (req, res) => {
  try {
    const companies = await Company.find({ deletedAt: null });
    const properties = await Property.find({ deletedAt: null });
    const units = await Unit.find({ deletedAt: null });
    const owners = await User.find({ role: { $in: ['owner', 'self_owner'] }, deletedAt: null });
    const propertySeekers = await User.find({ role: 'property_seeker', deletedAt: null });
    const tenants = await Tenant.find({ deletedAt: null });
    const subscriptions = await SubscriptionTransaction.find({})
      .populate('company', 'companyName')
      .populate('subscriptionPlan', 'name');
    const latestTransactions = await SubscriptionTransaction.find({})
      .populate('company', 'companyName email')
      .sort({ processedDate: -1, createdAt: -1 })
      .limit(8);
    const activities = await ActivityLog.find()
      .populate('company', 'companyName')
      .sort({ createdAt: -1 })
      .limit(12);
    const plans = await SubscriptionPlan.find({ isActive: true }).sort({ displayOrder: 1, monthlyPrice: 1 });
    const payments = await Payment.find({ deletedAt: null }).sort({ createdAt: -1 }).limit(100);

    // Calculate metrics
    const activeSubscriptions = companies.filter(c => c.subscriptionStatus === 'active').length;
    const expiredSubscriptions = companies.filter(c => c.subscriptionStatus === 'expired').length;
    const completedSubscriptions = subscriptions.filter((transaction) => transaction.status === 'completed');
    const monthlyRevenue = completedSubscriptions
      .filter(t => {
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        return t.processedDate && t.processedDate >= monthAgo;
      })
      .reduce((sum, t) => sum + toNumber(t.amount), 0);
    const annualRevenue = completedSubscriptions.reduce((sum, t) => sum + toNumber(t.amount), 0);

    const occupiedUnits = units.filter(u => u.status === 'occupied').length;
    const vacantUnits = units.filter(u => u.status === 'vacant').length;
    const occupancyRate = units.length > 0 ? Number(((occupiedUnits / units.length) * 100).toFixed(2)) : 0;

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

    const currentSubscriptions = completedSubscriptions.filter((transaction) => (
      transaction.processedDate >= currentMonth && transaction.processedDate < nextMonth
    ));
    const previousSubscriptions = completedSubscriptions.filter((transaction) => (
      transaction.processedDate >= previousMonth && transaction.processedDate < currentMonth
    ));
    const previousMonthlyRevenue = previousSubscriptions.reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);

    const monthlyRevenueSeries = Array.from({ length: 12 }, (_, index) => {
      const monthStart = new Date(now.getFullYear(), index, 1);
      const monthEnd = new Date(now.getFullYear(), index + 1, 1);
      const value = completedSubscriptions
        .filter((transaction) => transaction.processedDate >= monthStart && transaction.processedDate < monthEnd)
        .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);

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

    const listingViews = propertySeekers.reduce((sum, seeker) => sum + toNumber(seeker.propertySeekerStats?.totalViews), 0);
    const visitBookings = propertySeekers.reduce((sum, seeker) => sum + toNumber(seeker.propertySeekerStats?.totalVisits), 0);
    const detailUnlocks = propertySeekers.reduce((sum, seeker) => sum + toNumber(seeker.propertySeekerStats?.totalUnlocks), 0);
    const totalSeekerSpent = propertySeekers.reduce((sum, seeker) => sum + toNumber(seeker.propertySeekerStats?.totalSpent), 0);
    const activeSeekersThisMonth = propertySeekers.filter((seeker) => {
      const lastActiveAt = seeker.propertySeekerStats?.lastActiveAt || seeker.lastLogin;
      return lastActiveAt && new Date(lastActiveAt) >= currentMonth;
    }).length;
    const pendingPayments = subscriptions.filter((transaction) => transaction.status === 'pending').length;
    const failedPayments = subscriptions.filter((transaction) => transaction.status === 'failed').length;

    // System health
    const health = await systemMonitoringService.getSystemHealth();
    const healthMetrics = health.metrics || {};
    const systemHealth = [
      { name: 'API Service', status: healthMetrics.apiHealth || health.status || 'unknown' },
      { name: 'Database', status: healthMetrics.databaseHealth || 'unknown' },
      { name: 'File Storage', status: healthMetrics.storageAvailable === 0 ? 'warning' : 'operational' },
      { name: 'Email Service', status: 'operational' },
      { name: 'SMS Service', status: 'unknown' },
      { name: 'WhatsApp Service', status: 'unknown' },
      { name: 'Payment Gateway', status: failedPayments > 0 ? 'warning' : 'operational' },
      { name: 'Google Login/Auth', status: 'unknown' }
    ];

    const latestBillingTransactions = [
      ...latestTransactions.map((transaction) => ({
        id: transaction._id,
        transactionId: transaction.invoiceId || `TRX-${String(transaction._id).slice(-6).toUpperCase()}`,
        user: transaction.company?.companyName || transaction.company?.email || 'N/A',
        userType: 'Landlord',
        paymentFor: 'Landlord Subscription',
        amount: toNumber(transaction.amount),
        paymentMethod: transaction.paymentMethod || 'N/A',
        status: transaction.status || 'pending',
        date: transaction.processedDate || transaction.createdAt
      })),
      ...payments.slice(0, 8).map((payment) => ({
        id: payment._id,
        transactionId: payment.receiptNumber || `PAY-${String(payment._id).slice(-6).toUpperCase()}`,
        user: `Tenant (${payment.tenant || 'N/A'})`,
        userType: 'Tenant',
        paymentFor: payment.paymentFor || 'Other',
        amount: toNumber(payment.amountPaid || payment.amount),
        paymentMethod: payment.paymentMethod || 'N/A',
        status: payment.status || 'pending',
        date: payment.paymentDate || payment.paidDate || payment.createdAt
      }))
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    const ownerIds = owners.map((owner) => owner._id);
    const landlordPropertyAgg = await Property.aggregate([
      { $match: { deletedAt: null, owner: { $in: ownerIds } } },
      { $group: { _id: '$owner', properties: { $sum: 1 } } }
    ]);
    const landlordUnitAgg = await Unit.aggregate([
      { $match: { deletedAt: null, owner: { $in: ownerIds } } },
      {
        $group: {
          _id: '$owner',
          totalUnits: { $sum: 1 },
          occupiedUnits: { $sum: { $cond: [{ $eq: ['$status', 'occupied'] }, 1, 0] } },
          vacantUnits: { $sum: { $cond: [{ $eq: ['$status', 'vacant'] }, 1, 0] } }
        }
      }
    ]);
    const landlordTenantAgg = await Tenant.aggregate([
      { $match: { deletedAt: null, owner: { $in: ownerIds } } },
      { $group: { _id: '$owner', tenants: { $sum: 1 } } }
    ]);
    const propertyByOwner = Object.fromEntries(landlordPropertyAgg.map((row) => [String(row._id), row.properties]));
    const unitByOwner = Object.fromEntries(landlordUnitAgg.map((row) => [String(row._id), row]));
    const tenantByOwner = Object.fromEntries(landlordTenantAgg.map((row) => [String(row._id), row.tenants]));
    const landlordsSummary = owners
      .map((owner) => {
        const key = String(owner._id);
        const unitStats = unitByOwner[key] || {};
        return {
          id: owner._id,
          landlordName: owner.name || 'N/A',
          email: owner.email || 'N/A',
          properties: toNumber(propertyByOwner[key]),
          totalUnits: toNumber(unitStats.totalUnits),
          occupiedUnits: toNumber(unitStats.occupiedUnits),
          vacantUnits: toNumber(unitStats.vacantUnits),
          tenants: toNumber(tenantByOwner[key])
        };
      })
      .sort((a, b) => b.totalUnits - a.totalUnits)
      .slice(0, 8);

    res.json({
      success: true,
      kpis: {
        totalLandlords: owners.length,
        totalTenants: tenants.length,
        totalPropertySeekers: propertySeekers.length,
        totalProperties: properties.length,
        totalUnits: units.length,
        occupiedUnits,
        vacantUnits,
        publishedListings: vacantUnits,
        listingViews,
        visitBookings,
        activeSubscriptions,
        pendingPayments,
        failedPayments,
        expiredSubscriptions,
        monthlyRevenue,
        annualRevenue,
        platformRevenue: annualRevenue + totalSeekerSpent,
        systemAlerts: systemHealth.filter((item) => ['warning', 'down'].includes(String(item.status).toLowerCase())).length,
        occupancyRate,
        systemHealth: health.status,
        landlordsTrend: getPercentChange(countCreatedBetween(owners, currentMonth, nextMonth), countCreatedBetween(owners, previousMonth, currentMonth)),
        propertiesTrend: getPercentChange(countCreatedBetween(properties, currentMonth, nextMonth), countCreatedBetween(properties, previousMonth, currentMonth)),
        unitsTrend: getPercentChange(countCreatedBetween(units, currentMonth, nextMonth), countCreatedBetween(units, previousMonth, currentMonth)),
        tenantsTrend: getPercentChange(countCreatedBetween(tenants, currentMonth, nextMonth), countCreatedBetween(tenants, previousMonth, currentMonth)),
        propertySeekersTrend: getPercentChange(countCreatedBetween(propertySeekers, currentMonth, nextMonth), countCreatedBetween(propertySeekers, previousMonth, currentMonth)),
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
      platformOverview: {
        landlordsGrowth: getPercentChange(countCreatedBetween(owners, currentMonth, nextMonth), countCreatedBetween(owners, previousMonth, currentMonth)),
        tenantsGrowth: getPercentChange(countCreatedBetween(tenants, currentMonth, nextMonth), countCreatedBetween(tenants, previousMonth, currentMonth)),
        propertySeekersGrowth: getPercentChange(countCreatedBetween(propertySeekers, currentMonth, nextMonth), countCreatedBetween(propertySeekers, previousMonth, currentMonth)),
        propertiesGrowth: getPercentChange(countCreatedBetween(properties, currentMonth, nextMonth), countCreatedBetween(properties, previousMonth, currentMonth)),
        unitsGrowth: getPercentChange(countCreatedBetween(units, currentMonth, nextMonth), countCreatedBetween(units, previousMonth, currentMonth))
      },
      marketplaceActivity: {
        vacantListingsByStatus: {
          vacant: vacantUnits,
          occupied: occupiedUnits,
          maintenance: units.filter((unit) => unit.status === 'maintenance').length
        },
        publishedListings: vacantUnits,
        unpublishedListings: Math.max(units.length - vacantUnits, 0),
        listingViews,
        detailUnlocks,
        mapReveals: 0,
        contactReveals: 0,
        visitBookings,
        topViewedListings: [],
        mostSearchedLocations: []
      },
      revenueBilling: {
        landlordSubscriptionRevenue: annualRevenue,
        propertySeekerViewUnlockRevenue: totalSeekerSpent,
        propertySeekerVisitBookingRevenue: 0,
        totalPlatformRevenue: annualRevenue + totalSeekerSpent,
        pendingPayments,
        failedPayments
      },
      subscriptionOverview: {
        activeLandlordSubscriptions: activeSubscriptions,
        trialLandlordSubscriptions: companies.filter(c => c.subscriptionStatus === 'trial').length,
        expiredSubscriptions,
        pastDueSubscriptions: companies.filter(c => c.subscriptionStatus === 'suspended').length,
        planDistribution: planSummary
      },
      propertySeekerActivity: {
        newestPropertySeekers: propertySeekers
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 8)
          .map((seeker) => ({
            id: seeker._id,
            fullName: seeker.propertySeekerProfile?.fullName || seeker.name || 'N/A',
            email: seeker.email || 'N/A',
            location: seeker.propertySeekerProfile?.location || seeker.propertySeekerProfile?.address || 'N/A',
            joinedDate: seeker.createdAt
          })),
        totalSeekers: propertySeekers.length,
        activeSeekersThisMonth,
        topSearchedLocations: [],
        totalPaidViews: listingViews,
        totalBookedVisits: visitBookings,
        totalAmountSpentBySeekers: totalSeekerSpent,
        averageViewsPerSeeker: propertySeekers.length ? Number((listingViews / propertySeekers.length).toFixed(2)) : 0
      },
      landlordUnitBreakdown: {
        occupiedUnits,
        vacantUnits,
        totalUnits: units.length
      },
      landlordsSummary,
      plans: planSummary,
      systems: systemHealth,
      activities: activities.map((activity) => ({
        id: activity._id,
        title: activity.description || activity.action.replace(/_/g, ' '),
        subtitle: activity.company?.companyName || activity.entityName || activity.userName || 'Platform activity',
        type: activity.action,
        createdAt: activity.createdAt
      })),
      transactions: latestBillingTransactions
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
    company.subscriptionStatus = company.subscriptionStatus === 'expired' ? 'trial' : company.subscriptionStatus || 'trial';
    company.billingCycle = company.billingCycle || 'monthly';
    company.subscriptionStartDate = company.subscriptionStartDate || new Date();
    company.subscriptionEndDate = company.subscriptionEndDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
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

const getCustomerSubscriptionStatus = async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId).populate('subscriptionPlan');
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const refreshed = await refreshCompanySubscriptionState(company._id);
    const currentPlan = refreshed?.subscriptionPlan || company.subscriptionPlan;
    const nextBillingDate = refreshed?.nextPaymentDueDate || refreshed?.subscriptionEndDate || new Date();
    const amount = currentPlan ? calculatePlanAmount({
      plan: currentPlan,
      billingCycle: refreshed?.billingCycle || 'monthly',
      months: 1
    }) : 0;

    res.json({
      success: true,
      company: refreshed || company,
      status: refreshed?.subscriptionStatus || company.subscriptionStatus || 'trial',
      nextBillingDate,
      amount,
      currency: 'UGX'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const refreshCustomerSubscription = async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId).populate('subscriptionPlan');
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const refreshed = await refreshCompanySubscriptionState(company._id);

    await activityLogService.logActivity({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'subscription_refresh',
      entity: 'company',
      entityId: company._id,
      entityName: company.companyName,
      description: `Refreshed subscription state for ${company.companyName}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Subscription state refreshed successfully',
      company: refreshed || company,
      status: refreshed?.subscriptionStatus || company.subscriptionStatus || 'trial'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const renewCustomerSubscription = async (req, res) => {
  try {
    const { paymentMethod = 'manual', billingCycle = 'monthly', planId } = req.body || {};
    const company = await Company.findById(req.params.companyId).populate('subscriptionPlan');
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const selectedPlanId = planId || company.subscriptionPlan?._id || company.subscriptionPlan;
    const result = await createRenewalTransaction({
      companyId: company._id,
      planId: selectedPlanId,
      billingCycle,
      paymentMethod,
      months: 1,
      invoicePrefix: 'SUB'
    });

    await activityLogService.logActivity({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'subscription_renewal',
      entity: 'company',
      entityId: company._id,
      entityName: company.companyName,
      description: `Renewed subscription for ${company.companyName}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Subscription renewal created successfully',
      company: result.company,
      transaction: result.transaction,
      invoiceId: result.invoiceId,
      amount: result.amount,
      currency: 'UGX'
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
    const { planType = '', status = '' } = req.query;
    const query = { deletedAt: null };

    if (planType) {
      query.planType = planType;
    }

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    const plans = await SubscriptionPlan.find(query).sort({ displayOrder: 1, createdAt: -1 });
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
    const payload = req.body || {};
    const planType = String(payload.planType || 'landlord').toLowerCase() === 'property_seeker' ? 'property_seeker' : 'landlord';
    const billingModel = String(payload.billingModel || (planType === 'landlord' ? 'monthly' : 'pay_per_view')).toLowerCase();
    const features = Array.isArray(payload.features)
      ? payload.features
      : String(payload.features || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);

    const normalizedPayload = {
      ...payload,
      planType,
      targetUserType: planType === 'property_seeker' ? 'property_seeker' : 'landlord',
      billingModel,
      monthlyPrice: toNumber(payload.monthlyPrice),
      annualPrice: toNumber(payload.annualPrice),
      price: toNumber(payload.price || payload.monthlyPrice),
      includedViews: toNumber(payload.includedViews),
      includedVisits: toNumber(payload.includedVisits),
      maxProperties: toNullableNumber(payload.maxProperties),
      maxUnits: toNullableNumber(payload.maxUnits),
      maxTenants: toNullableNumber(payload.maxTenants),
      maxDocuments: toNullableNumber(payload.maxDocuments),
      whatsAppAlertsLimit: toNullableNumber(payload.whatsAppAlertsLimit),
      propertyDisplayEnabled: payload.propertyDisplayEnabled !== false,
      validityDays: toNumber(payload.validityDays, 30),
      features,
      isActive: payload.isActive !== false,
      status: payload.isActive === false ? 'inactive' : String(payload.status || 'active').toLowerCase()
    };

    if (!normalizedPayload.name || String(normalizedPayload.name).trim() === '') {
      return res.status(400).json({ success: false, message: 'Plan name is required' });
    }

    const existing = await SubscriptionPlan.findOne({
      name: String(normalizedPayload.name).trim(),
      deletedAt: null
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Plan name already exists' });
    }

    normalizedPayload.name = String(normalizedPayload.name).trim();

    if (normalizedPayload.planType === 'landlord') {
      normalizedPayload.price = toNumber(normalizedPayload.monthlyPrice);
    }

    const plan = await SubscriptionPlan.create(normalizedPayload);

    await activityLogService.logActivity({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'plan_created',
      entity: 'subscription_plan',
      entityId: plan._id,
      entityName: plan.name,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

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

    const payload = req.body || {};
    const features = Array.isArray(payload.features)
      ? payload.features
      : (typeof payload.features === 'string'
        ? payload.features.split(',').map((item) => item.trim()).filter(Boolean)
        : plan.features);

    const nextPlanType = payload.planType
      ? (String(payload.planType).toLowerCase() === 'property_seeker' ? 'property_seeker' : 'landlord')
      : plan.planType;

    Object.assign(plan, {
      ...payload,
      planType: nextPlanType,
      targetUserType: nextPlanType === 'property_seeker' ? 'property_seeker' : 'landlord',
      monthlyPrice: payload.monthlyPrice !== undefined ? toNumber(payload.monthlyPrice) : plan.monthlyPrice,
      annualPrice: payload.annualPrice !== undefined ? toNumber(payload.annualPrice) : plan.annualPrice,
      price: payload.price !== undefined ? toNumber(payload.price) : plan.price,
      includedViews: payload.includedViews !== undefined ? toNumber(payload.includedViews) : plan.includedViews,
      includedVisits: payload.includedVisits !== undefined ? toNumber(payload.includedVisits) : plan.includedVisits,
      validityDays: payload.validityDays !== undefined ? toNumber(payload.validityDays, plan.validityDays || 30) : plan.validityDays,
      maxProperties: payload.maxProperties !== undefined ? toNullableNumber(payload.maxProperties) : plan.maxProperties,
      maxUnits: payload.maxUnits !== undefined ? toNullableNumber(payload.maxUnits) : plan.maxUnits,
      maxTenants: payload.maxTenants !== undefined ? toNullableNumber(payload.maxTenants) : plan.maxTenants,
      maxDocuments: payload.maxDocuments !== undefined ? toNullableNumber(payload.maxDocuments) : plan.maxDocuments,
      whatsAppAlertsLimit: payload.whatsAppAlertsLimit !== undefined ? toNullableNumber(payload.whatsAppAlertsLimit) : plan.whatsAppAlertsLimit,
      propertyDisplayEnabled: payload.propertyDisplayEnabled !== undefined ? Boolean(payload.propertyDisplayEnabled) : plan.propertyDisplayEnabled,
      features
    });

    if (payload.status !== undefined) {
      plan.status = String(payload.status).toLowerCase();
      plan.isActive = plan.status === 'active';
    }

    if (payload.isActive !== undefined) {
      plan.isActive = Boolean(payload.isActive);
      plan.status = plan.isActive ? 'active' : 'inactive';
    }

    await plan.save();

    await activityLogService.logActivity({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'plan_updated',
      entity: 'subscription_plan',
      entityId: plan._id,
      entityName: plan.name,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

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
    plan.status = 'inactive';
    await plan.save();

    await activityLogService.logActivity({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'plan_deleted',
      entity: 'subscription_plan',
      entityId: plan._id,
      entityName: plan.name,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

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

    // Ensure approved self-owner accounts have a company association.
    // Some self-owner users may be created via /auth/register and only carry
    // companyName text, which breaks company-scoped routes after approval.
    if (user.role === 'self_owner' && !user.company) {
      let linkedCompany = await Company.findOne({ email: user.email, deletedAt: null });

      if (!linkedCompany && user.companyName) {
        linkedCompany = await Company.findOne({ companyName: user.companyName, deletedAt: null });
      }

      if (!linkedCompany) {
        const trialPlan = await SubscriptionPlan.findOne({ name: 'Trial', isActive: true })
          || await SubscriptionPlan.findOne({ isActive: true }).sort({ displayOrder: 1, monthlyPrice: 1 });

        if (!trialPlan) {
          return res.status(500).json({
            success: false,
            message: 'No active subscription plan found for company creation'
          });
        }

        const baseCompanyName = (user.companyName && user.companyName.trim())
          ? user.companyName.trim()
          : `${user.name}'s Company`;

        let uniqueCompanyName = baseCompanyName;
        let suffix = 1;
        while (await Company.findOne({ companyName: uniqueCompanyName })) {
          suffix += 1;
          uniqueCompanyName = `${baseCompanyName} ${suffix}`;
        }

        linkedCompany = await Company.create({
          companyName: uniqueCompanyName,
          ownerName: user.name,
          email: user.email,
          phone: user.phone || 'Not provided',
          superAdmin: user._id,
          subscriptionPlan: trialPlan._id,
          subscriptionStatus: 'trial',
          billingCycle: 'monthly',
          trialEndsAt: trialPlan.trialDays
            ? new Date(Date.now() + trialPlan.trialDays * 24 * 60 * 60 * 1000)
            : undefined
        });
      }

      user.company = linkedCompany._id;
      if (!user.companyName) {
        user.companyName = linkedCompany.companyName;
      }
    }

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

// @desc    Get all users
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

// @desc    Get landlords list
// @route   GET /api/super-admin/landlords
// @access  Private (super_admin only)
const getLandlords = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = '', plan = '', location = '' } = req.query;
    const skip = (toNumber(page, 1) - 1) * toNumber(limit, 20);
    const regex = search ? new RegExp(search, 'i') : null;

    const query = {
      role: { $in: ['owner', 'self_owner'] },
      deletedAt: null
    };
    if (regex) query.$or = [{ name: regex }, { email: regex }, { phone: regex }, { companyName: regex }];

    const landlords = await User.find(query)
      .select('-password')
      .populate({
        path: 'company',
        select: 'companyName location phone subscriptionStatus subscriptionPlan createdAt',
        populate: { path: 'subscriptionPlan', select: 'name monthlyPrice annualPrice' }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(toNumber(limit, 20));

    const landlordIds = landlords.map((item) => item._id);
    const propertiesByOwner = await Property.aggregate([
      { $match: { deletedAt: null, owner: { $in: landlordIds } } },
      { $group: { _id: '$owner', count: { $sum: 1 } } }
    ]);
    const unitsByOwner = await Unit.aggregate([
      { $match: { deletedAt: null, owner: { $in: landlordIds } } },
      {
        $group: {
          _id: '$owner',
          count: { $sum: 1 },
          occupiedUnits: { $sum: { $cond: [{ $eq: ['$status', 'occupied'] }, 1, 0] } },
          vacantUnits: { $sum: { $cond: [{ $eq: ['$status', 'vacant'] }, 1, 0] } }
        }
      }
    ]);
    const tenantsByOwner = await Tenant.aggregate([
      { $match: { deletedAt: null, owner: { $in: landlordIds } } },
      { $group: { _id: '$owner', count: { $sum: 1 } } }
    ]);

    const propertyCountMap = Object.fromEntries(propertiesByOwner.map((row) => [String(row._id), row.count]));
    const unitCountMap = Object.fromEntries(unitsByOwner.map((row) => [String(row._id), row]));
    const tenantCountMap = Object.fromEntries(tenantsByOwner.map((row) => [String(row._id), row.count]));

    const rows = landlords
      .map((landlord) => {
        const subscriptionName = landlord.company?.subscriptionPlan?.name || 'N/A';
        if (plan && subscriptionName !== plan) return null;
        const landlordLocation = landlord.propertySeekerProfile?.location || landlord.company?.location || 'N/A';
        if (location && !String(landlordLocation).toLowerCase().includes(String(location).toLowerCase())) return null;

        const key = String(landlord._id);
        const unitStats = unitCountMap[key] || {};
        const subscriptionStatus = landlord.company?.subscriptionStatus || 'n/a';
        if (status && String(subscriptionStatus).toLowerCase() !== String(status).toLowerCase()) return null;
        return {
          id: landlord._id,
          companyId: landlord.company?._id || null,
          landlordName: landlord.name || 'N/A',
          displayName: landlord.companyName || landlord.company?.companyName || landlord.name || 'N/A',
          email: landlord.email || 'N/A',
          phone: landlord.phone || landlord.company?.phone || 'N/A',
          whatsAppNumber: landlord.whatsAppNumber || 'N/A',
          location: landlordLocation,
          approvalStatus: landlord.approvalStatus || 'approved',
          subscriptionPlan: subscriptionName,
          properties: propertyCountMap[key] || 0,
          units: toNumber(unitStats.count),
          occupiedUnits: toNumber(unitStats.occupiedUnits),
          vacantUnits: toNumber(unitStats.vacantUnits),
          tenants: tenantCountMap[key] || 0,
          status: landlord.isActive ? 'Active' : 'Suspended',
          subscriptionStatus,
          monthlyPrice: toNumber(landlord.company?.subscriptionPlan?.monthlyPrice),
          annualPrice: toNumber(landlord.company?.subscriptionPlan?.annualPrice),
          subscriptionEndDate: landlord.company?.subscriptionEndDate || null,
          joinedDate: landlord.createdAt,
          lastLogin: landlord.lastLogin || null
        };
      })
      .filter(Boolean);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      landlords: rows,
      pagination: {
        page: toNumber(page, 1),
        limit: toNumber(limit, 20),
        total,
        pages: Math.max(1, Math.ceil(total / toNumber(limit, 20)))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get platform tenant list
// @route   GET /api/super-admin/tenants
// @access  Private (super_admin only)
const getTenantsList = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = '' } = req.query;
    const skip = (toNumber(page, 1) - 1) * toNumber(limit, 20);
    const regex = search ? new RegExp(search, 'i') : null;
    const query = { deletedAt: null };
    if (status) query.status = status;
    if (regex) query.$or = [{ fullName: regex }, { email: regex }, { phone: regex }];

    const tenants = await Tenant.find(query)
      .populate('user', '_id isActive')
      .populate('owner', 'name email phone')
      .populate('property', 'name location')
      .populate('unit', 'unitNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(toNumber(limit, 20));

    const tenantIds = tenants.map((tenant) => tenant._id);
    const paymentStatuses = await Payment.aggregate([
      { $match: { tenant: { $in: tenantIds }, deletedAt: null } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$tenant',
          status: { $first: '$status' }
        }
      }
    ]);
    const paymentStatusMap = Object.fromEntries(paymentStatuses.map((row) => [String(row._id), row.status]));

    const rows = tenants.map((tenant) => ({
      id: tenant._id,
      userId: tenant.user?._id || null,
      tenantId: tenant._id,
      ownerId: tenant.owner?._id || null,
      landlordId: tenant.owner?._id || null,
      selfOwnerId: tenant.owner?._id || null,
      propertyId: tenant.property?._id || null,
      unitId: tenant.unit?._id || null,
      tenantName: tenant.fullName || 'N/A',
      email: tenant.email || 'N/A',
      phone: tenant.phone || 'N/A',
      landlord: tenant.owner?.name || 'N/A',
      property: tenant.property?.name || 'N/A',
      unit: tenant.unit?.unitNumber || 'N/A',
      leaseStatus: tenant.status || 'N/A',
      paymentStatus: paymentStatusMap[String(tenant._id)] || 'N/A',
      joinedDate: tenant.createdAt
    }));

    const total = await Tenant.countDocuments(query);
    res.json({
      success: true,
      tenants: rows,
      pagination: {
        page: toNumber(page, 1),
        limit: toNumber(limit, 20),
        total,
        pages: Math.max(1, Math.ceil(total / toNumber(limit, 20)))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get property seekers
// @route   GET /api/super-admin/property-seekers
// @access  Private (super_admin only)
const getPropertySeekers = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', status = '' } = req.query;
    const skip = (toNumber(page, 1) - 1) * toNumber(limit, 20);
    const regex = search ? new RegExp(search, 'i') : null;
    const query = { role: 'property_seeker', deletedAt: null };
    if (status) query.isActive = status === 'active';
    if (regex) query.$or = [{ name: regex }, { email: regex }, { phone: regex }, { 'propertySeekerProfile.location': regex }];

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(toNumber(limit, 20));

    const seekers = users.map((user) => ({
      id: user._id,
      userId: user._id,
      fullName: user.propertySeekerProfile?.fullName || user.name || 'N/A',
      email: user.email || 'N/A',
      phoneNumber: user.phone || 'N/A',
      address: user.propertySeekerProfile?.address || user.propertySeekerProfile?.location || 'N/A',
      location: user.propertySeekerProfile?.location || 'N/A',
      googleAccountStatus: user.propertySeekerProfile?.googleId ? 'Connected' : 'Pending',
      profilePhoto: user.propertySeekerProfile?.profilePhoto || user.avatar || '',
      searchesCount: toNumber(user.propertySeekerStats?.totalSearches),
      listingViews: toNumber(user.propertySeekerStats?.totalViews),
      detailUnlocks: toNumber(user.propertySeekerStats?.totalUnlocks),
      visitBookings: toNumber(user.propertySeekerStats?.totalVisits),
      walletCredits: toNumber(user.propertySeekerStats?.walletBalance),
      amountSpent: toNumber(user.propertySeekerStats?.totalSpent),
      status: user.isActive ? 'Active' : 'Suspended',
      joinedDate: user.createdAt,
      lastActive: user.propertySeekerStats?.lastActiveAt || user.lastLogin || user.updatedAt
    }));

    const total = await User.countDocuments(query);
    res.json({
      success: true,
      propertySeekers: seekers,
      pagination: {
        page: toNumber(page, 1),
        limit: toNumber(limit, 20),
        total,
        pages: Math.max(1, Math.ceil(total / toNumber(limit, 20)))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get vacant listings overview
// @route   GET /api/super-admin/vacant-listings
// @access  Private (super_admin only)
const getVacantListings = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (toNumber(page, 1) - 1) * toNumber(limit, 20);
    const regex = search ? new RegExp(search, 'i') : null;

    const units = await Unit.find({ deletedAt: null })
      .populate('owner', 'name email')
      .populate('property', 'name location')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(toNumber(limit, 20));

    const listings = units
      .filter((unit) => !regex || regex.test(unit.unitNumber) || regex.test(unit.property?.name || '') || regex.test(unit.property?.location || ''))
      .map((unit) => ({
        id: unit._id,
        listingTitle: `${unit.property?.name || 'Property'} - Unit ${unit.unitNumber || 'N/A'}`,
        landlord: unit.owner?.name || 'N/A',
        ownerId: unit.owner?._id || null,
        property: unit.property?.name || 'N/A',
        propertyId: unit.property?._id || null,
        unit: unit.unitNumber || 'N/A',
        unitId: unit._id,
        location: unit.property?.location || 'N/A',
        rentPrice: toNumber(unit.rentAmount),
        vacancyStatus: unit.status || 'unknown',
        publishStatus: unit.status === 'vacant' ? 'Published' : 'Unpublished',
        views: 0,
        unlocks: 0,
        visits: 0,
        createdDate: unit.createdAt
      }));

    const total = await Unit.countDocuments({ deletedAt: null });
    res.json({
      success: true,
      listings,
      pagination: {
        page: toNumber(page, 1),
        limit: toNumber(limit, 20),
        total,
        pages: Math.max(1, Math.ceil(total / toNumber(limit, 20)))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get property seeker billable actions
// @route   GET /api/super-admin/views-visits
// @access  Private (super_admin only)
const getViewsVisits = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (toNumber(page, 1) - 1) * toNumber(limit, 20);

    const seekers = await User.find({ role: 'property_seeker', deletedAt: null })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(toNumber(limit, 20));

    const rows = seekers.map((seeker) => ({
      id: seeker._id,
      seeker: seeker.propertySeekerProfile?.fullName || seeker.name || 'N/A',
      listing: 'N/A',
      landlord: 'N/A',
      actionType: 'view_listing_summary',
      amountCharged: 0,
      paymentStatus: 'N/A',
      dateTime: seeker.propertySeekerStats?.lastActiveAt || seeker.updatedAt,
      visitDate: null,
      visitStatus: toNumber(seeker.propertySeekerStats?.totalVisits) > 0 ? 'Booked' : 'N/A'
    }));

    const total = await User.countDocuments({ role: 'property_seeker', deletedAt: null });
    res.json({
      success: true,
      viewsVisits: rows,
      pagination: {
        page: toNumber(page, 1),
        limit: toNumber(limit, 20),
        total,
        pages: Math.max(1, Math.ceil(total / toNumber(limit, 20)))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get billing transactions
// @route   GET /api/super-admin/billing
// @access  Private (super_admin only)
const getBilling = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '', userType = '' } = req.query;
    const skip = (toNumber(page, 1) - 1) * toNumber(limit, 20);

    const transactions = await SubscriptionTransaction.find(status ? { status } : {})
      .populate('company', 'companyName')
      .sort({ processedDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(toNumber(limit, 20));

    const rows = transactions
      .map((transaction) => ({
        id: transaction._id,
        transactionId: transaction.invoiceId || `TRX-${String(transaction._id).slice(-6).toUpperCase()}`,
        user: transaction.company?.companyName || 'N/A',
        userType: 'Landlord',
        paymentFor: 'Landlord Subscription',
        amount: toNumber(transaction.amount),
        paymentMethod: transaction.paymentMethod || 'N/A',
        status: transaction.status || 'pending',
        date: transaction.processedDate || transaction.createdAt
      }))
      .filter((row) => !userType || row.userType.toLowerCase() === String(userType).toLowerCase());

    const total = await SubscriptionTransaction.countDocuments(status ? { status } : {});
    res.json({
      success: true,
      transactions: rows,
      pagination: {
        page: toNumber(page, 1),
        limit: toNumber(limit, 20),
        total,
        pages: Math.max(1, Math.ceil(total / toNumber(limit, 20)))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const upsertAssignmentBillingTransaction = async ({ assignment, user, plan, actorId }) => {
  if (!assignment || !user || !plan) return;
  const transactionId = `SUB-${String(assignment._id).slice(-8).toUpperCase()}`;
  const status = mapAssignmentToBillingStatus(assignment.status);

  await BillingTransaction.findOneAndUpdate(
    { assignmentId: assignment._id, deletedAt: null },
    {
      transactionId,
      userId: user._id,
      userType: assignment.userType,
      planId: plan._id,
      assignmentId: assignment._id,
      paymentFor: assignment.userType === 'property_seeker' ? 'premium_seeker_plan' : 'landlord_subscription',
      chargeType: assignment.userType === 'property_seeker' ? 'monthly_seeker_plan' : 'other',
      amount: toNumber(assignment.amount),
      currency: 'UGX',
      paymentMethod: 'manual',
      status,
      manualRecordedBy: actorId || null,
      paidAt: status === 'paid' ? new Date() : null,
      startDate: assignment.startDate || null,
      expiryDate: assignment.expiryDate || null,
      subscribedMonths: Math.max(1, toNumber(assignment.subscribedMonths, 1)),
      provider: 'manual',
      providerStatus: assignment.status,
      autoBillingEnabled: false,
      autoRenewEnabled: false
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

// @desc    Get plan assignments
// @route   GET /api/super-admin/plan-assignments
// @access  Private (super_admin only)
const getPlanAssignments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status = '', userType = '', search = '' } = req.query;
    const skip = (toNumber(page, 1) - 1) * toNumber(limit, 20);

    const query = { deletedAt: null };
    if (status) query.status = status;
    if (userType) query.userType = userType;

    const assignments = await PlanAssignment.find(query)
      .populate('userId', 'name email phone role company companyName')
      .populate('companyId', 'companyName')
      .populate('planId', 'name planType billingModel monthlyPrice annualPrice price')
      .populate('assignedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(toNumber(limit, 20));

    const rows = assignments
      .map((assignment) => {
        const user = assignment.userId;
        const companyName = assignment.companyId?.companyName || user?.companyName || 'N/A';
        const subscribedMonths = Math.max(1, toNumber(assignment.subscribedMonths, 1));
        const amount = toNumber(
          assignment.amount !== undefined && assignment.amount !== null
            ? assignment.amount
            : calculateAssignmentAmount({
              plan: assignment.planId,
              billingCycle: assignment.billingCycle,
              subscribedMonths,
              userType: assignment.userType
            })
        );
        const remainingDays = computeRemainingDays(assignment.expiryDate);

        return {
          id: assignment._id,
          userId: user?._id || null,
          user: user?.name || user?.email || 'N/A',
          business: companyName,
          userType: assignment.userType === 'property_seeker' ? 'Property Seeker' : 'Landlord',
          assignedPlan: assignment.planId?.name || 'N/A',
          amount,
          subscribedMonths,
          status: assignment.status || 'trial',
          billingCycle: assignment.billingCycle || 'monthly',
          startDate: assignment.startDate,
          renewalDate: assignment.renewalDate || assignment.expiryDate,
          expiryDate: assignment.expiryDate,
          remainingDays,
          remainingTime: remainingLabel(remainingDays),
          assignmentMode: assignment.assignmentType === 'automatic' ? 'Auto Billing' : 'Manual Assignment',
          assignedBy: assignment.assignedBy?.name || assignment.assignedBy?.email || 'System',
          notes: assignment.notes || ''
        };
      })
      .filter((row) => {
        if (!search) return true;
        const term = String(search).toLowerCase();
        return [
          row.user,
          row.business,
          row.userType,
          row.assignedPlan,
          row.status,
          row.assignmentMode
        ].some((value) => String(value || '').toLowerCase().includes(term));
      });

    const total = await PlanAssignment.countDocuments(query);
    res.json({
      success: true,
      assignments: rows,
      pagination: {
        page: toNumber(page, 1),
        limit: toNumber(limit, 20),
        total,
        pages: Math.max(1, Math.ceil(total / toNumber(limit, 20)))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a manual plan assignment
// @route   POST /api/super-admin/plan-assignments
// @access  Private (super_admin only)
const createPlanAssignment = async (req, res) => {
  try {
    const {
      userId,
      userType,
      planId,
      status = 'trial',
      billingCycle = 'monthly',
      startDate,
      subscribedMonths = 1,
      amount,
      expiryDate,
      renewalDate,
      notes = ''
    } = req.body || {};

    if (!userId || !planId || !userType) {
      return res.status(400).json({ success: false, message: 'userId, userType and planId are required' });
    }

    const normalizedUserType = String(userType).toLowerCase() === 'property_seeker' ? 'property_seeker' : 'landlord';
    const user = await User.findById(userId).populate('company', 'companyName');
    if (!user || user.deletedAt) {
      return res.status(404).json({ success: false, message: 'Selected user not found' });
    }

    const allowedRole = normalizedUserType === 'property_seeker'
      ? user.role === 'property_seeker'
      : ['owner', 'self_owner'].includes(user.role);
    if (!allowedRole) {
      return res.status(400).json({ success: false, message: 'User type does not match selected account' });
    }

    const plan = await SubscriptionPlan.findOne({ _id: planId, deletedAt: null });
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Selected plan not found' });
    }

    const planType = String(plan.planType || (plan.targetUserType === 'property_seeker' ? 'property_seeker' : 'landlord')).toLowerCase();
    if (planType !== normalizedUserType) {
      return res.status(400).json({ success: false, message: 'Plan type does not match selected user type' });
    }

    if (normalizedUserType === 'landlord') {
      const capacityValidation = await validateLandlordPlanCapacity({ userId: user._id, plan });
      if (!capacityValidation.ok) {
        return res.status(400).json({ success: false, message: capacityValidation.message });
      }
    }

    const normalizedMonths = Math.max(1, toNumber(subscribedMonths, 1));
    const effectiveStartDate = safeDate(startDate) || new Date();
    const computedAmount = toNumber(
      amount !== undefined && amount !== null
        ? amount
        : calculateAssignmentAmount({
          plan,
          billingCycle,
          subscribedMonths: normalizedMonths,
          userType: normalizedUserType
        })
    );
    const computedExpiryDate = safeDate(expiryDate) || addMonths(effectiveStartDate, normalizedMonths);

    const assignment = await PlanAssignment.create({
      userId: user._id,
      companyId: normalizedUserType === 'landlord' ? (user.company?._id || null) : null,
      userType: normalizedUserType,
      planId: plan._id,
      status: String(status || 'trial').toLowerCase(),
      billingCycle: String(billingCycle || 'monthly').toLowerCase(),
      subscribedMonths: normalizedMonths,
      amount: computedAmount,
      startDate: effectiveStartDate,
      expiryDate: computedExpiryDate,
      renewalDate: safeDate(renewalDate) || computedExpiryDate,
      assignmentType: 'manual',
      notes: String(notes || ''),
      assignedBy: req.user._id
    });

    if (normalizedUserType === 'landlord' && user.company?._id) {
      const company = await Company.findById(user.company._id);
      if (company) {
        company.subscriptionPlan = plan._id;
        company.subscriptionStatus = assignment.status === 'past_due' ? 'suspended' : assignment.status;
        company.billingCycle = assignment.billingCycle === 'annual' ? 'annual' : 'monthly';
        company.subscriptionStartDate = assignment.startDate;
        company.subscriptionEndDate = assignment.expiryDate;
        company.nextPaymentDueDate = assignment.renewalDate || assignment.expiryDate;
        await company.save();
      }
    }

    if (normalizedUserType === 'property_seeker') {
      user.propertySeekerSubscription = {
        planId: plan._id,
        status: assignment.status,
        billingCycle: assignment.billingCycle,
        startDate: assignment.startDate,
        expiryDate: assignment.expiryDate,
        renewalDate: assignment.renewalDate || assignment.expiryDate,
        assignmentType: 'manual',
        autoBillingEnabled: false,
        autoRenewEnabled: false
      };
      await user.save();
    }

    await upsertAssignmentBillingTransaction({
      assignment,
      user,
      plan,
      actorId: req.user._id
    });

    await activityLogService.logActivity({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'plan_assigned',
      entity: 'plan_assignment',
      entityId: assignment._id,
      entityName: plan.name,
      description: `Plan ${plan.name} assigned to ${user.name || user.email}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({ success: true, assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update plan assignment
// @route   PUT /api/super-admin/plan-assignments/:assignmentId
// @access  Private (super_admin only)
const updatePlanAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const assignment = await PlanAssignment.findById(assignmentId).populate('userId', 'name email company').populate('planId');
    if (!assignment || assignment.deletedAt) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    const allowedFields = ['planId', 'status', 'billingCycle', 'startDate', 'expiryDate', 'renewalDate', 'subscribedMonths', 'amount', 'notes'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        assignment[field] = req.body[field];
      }
    });

    assignment.startDate = safeDate(assignment.startDate) || new Date();
    assignment.subscribedMonths = Math.max(1, toNumber(assignment.subscribedMonths, 1));
    assignment.expiryDate = safeDate(assignment.expiryDate);
    if (!assignment.expiryDate) {
      assignment.expiryDate = addMonths(assignment.startDate, assignment.subscribedMonths);
    }
    assignment.renewalDate = safeDate(assignment.renewalDate) || assignment.expiryDate;
    assignment.status = String(assignment.status || 'trial').toLowerCase();
    assignment.billingCycle = String(assignment.billingCycle || 'monthly').toLowerCase();

    const planForValidation = await SubscriptionPlan.findById(assignment.planId);
    assignment.amount = toNumber(
      req.body.amount !== undefined && req.body.amount !== null
        ? req.body.amount
        : calculateAssignmentAmount({
          plan: planForValidation,
          billingCycle: assignment.billingCycle,
          subscribedMonths: assignment.subscribedMonths,
          userType: assignment.userType
        })
    );

    if (assignment.userType === 'landlord') {
      const capacityValidation = await validateLandlordPlanCapacity({
        userId: assignment.userId?._id,
        plan: planForValidation
      });
      if (!capacityValidation.ok) {
        return res.status(400).json({ success: false, message: capacityValidation.message });
      }
    }

    await assignment.save();

    if (assignment.userType === 'landlord' && assignment.userId?.company) {
      const company = await Company.findById(assignment.userId.company);
      if (company) {
        company.subscriptionPlan = assignment.planId?._id || company.subscriptionPlan;
        company.subscriptionStatus = assignment.status === 'past_due' ? 'suspended' : assignment.status;
        company.billingCycle = assignment.billingCycle === 'annual' ? 'annual' : 'monthly';
        company.subscriptionStartDate = assignment.startDate;
        company.subscriptionEndDate = assignment.expiryDate;
        company.nextPaymentDueDate = assignment.renewalDate || assignment.expiryDate;
        await company.save();
      }
    }

    if (assignment.userType === 'property_seeker') {
      await User.findByIdAndUpdate(assignment.userId?._id, {
        propertySeekerSubscription: {
          planId: assignment.planId?._id || null,
          status: assignment.status,
          billingCycle: assignment.billingCycle,
          startDate: assignment.startDate,
          expiryDate: assignment.expiryDate,
          renewalDate: assignment.renewalDate || assignment.expiryDate,
          assignmentType: assignment.assignmentType,
          autoBillingEnabled: false,
          autoRenewEnabled: false
        }
      });
    }

    if (planForValidation) {
      await upsertAssignmentBillingTransaction({
        assignment,
        user: assignment.userId,
        plan: planForValidation,
        actorId: req.user._id
      });
    }

    await activityLogService.logActivity({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: assignment.status === 'cancelled' ? 'plan_cancelled' : 'plan_updated',
      entity: 'plan_assignment',
      entityId: assignment._id,
      entityName: assignment.planId?.name || 'Plan assignment',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ success: true, assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete/cancel plan assignment
// @route   DELETE /api/super-admin/plan-assignments/:assignmentId
// @access  Private (super_admin only)
const deletePlanAssignment = async (req, res) => {
  try {
    const { assignmentId } = req.params;
    const assignment = await PlanAssignment.findById(assignmentId);
    if (!assignment || assignment.deletedAt) {
      return res.status(404).json({ success: false, message: 'Assignment not found' });
    }

    assignment.deletedAt = new Date();
    assignment.status = 'cancelled';
    await assignment.save();

    await BillingTransaction.updateMany(
      { assignmentId: assignment._id, deletedAt: null },
      { status: 'cancelled', providerStatus: 'cancelled', manualRecordedBy: req.user._id }
    );

    await activityLogService.logActivity({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'plan_cancelled',
      entity: 'plan_assignment',
      entityId: assignment._id,
      entityName: 'Plan assignment',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ success: true, message: 'Plan assignment cancelled' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const normalizeLegacyStatus = (status) => ({
  completed: 'paid',
  processing: 'pending',
  pending: 'pending',
  failed: 'failed',
  cancelled: 'cancelled',
  refunded: 'refunded'
}[String(status || '').toLowerCase()] || 'pending');

// @desc    Get billing summary
// @route   GET /api/super-admin/billing/summary
// @access  Private (super_admin only)
const getBillingSummary = async (req, res) => {
  try {
    const [manualTransactions, subscriptionTransactions] = await Promise.all([
      BillingTransaction.find({ deletedAt: null }),
      SubscriptionTransaction.find({})
    ]);

    const allTransactions = [
      ...manualTransactions.map((transaction) => ({
        amount: toNumber(transaction.amount),
        status: transaction.status,
        paymentFor: transaction.paymentFor,
        chargeType: transaction.chargeType,
        userType: transaction.userType
      })),
      ...subscriptionTransactions.map((transaction) => ({
        amount: toNumber(transaction.amount),
        status: normalizeLegacyStatus(transaction.status),
        paymentFor: 'landlord_subscription',
        chargeType: 'other',
        userType: 'landlord'
      }))
    ];

    const totalRevenue = allTransactions
      .filter((transaction) => transaction.status === 'paid')
      .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);
    const landlordSubscriptionRevenue = allTransactions
      .filter((transaction) => transaction.status === 'paid' && transaction.paymentFor === 'landlord_subscription')
      .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);
    const propertySeekerRevenue = allTransactions
      .filter((transaction) => transaction.status === 'paid' && transaction.userType === 'property_seeker')
      .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);
    const perViewCharges = allTransactions
      .filter((transaction) => transaction.status === 'paid' && ['per_view_charge', 'listing_detail_unlock', 'map_location_reveal', 'landlord_contact_reveal'].includes(transaction.paymentFor))
      .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);
    const perVisitCharges = allTransactions
      .filter((transaction) => transaction.status === 'paid' && transaction.paymentFor === 'visit_booking')
      .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);
    const pendingPayments = allTransactions
      .filter((transaction) => transaction.status === 'pending')
      .reduce((sum, transaction) => sum + toNumber(transaction.amount), 0);

    res.json({
      success: true,
      summary: {
        totalRevenue,
        landlordSubscriptionRevenue,
        propertySeekerRevenue,
        perViewCharges,
        perVisitCharges,
        pendingPayments
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get billing transactions (manual + subscription)
// @route   GET /api/super-admin/billing/transactions
// @access  Private (super_admin only)
const getBillingTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      userType = '',
      status = '',
      paymentMethod = '',
      paymentFor = '',
      startDate = '',
      endDate = '',
      tab = 'all'
    } = req.query;

    const from = safeDate(startDate);
    const to = safeDate(endDate);

    const manualQuery = { deletedAt: null };
    if (status) manualQuery.status = status;
    if (userType) manualQuery.userType = String(userType).toLowerCase();
    if (paymentMethod) manualQuery.paymentMethod = String(paymentMethod).toLowerCase();
    if (paymentFor) manualQuery.paymentFor = String(paymentFor).toLowerCase();
    if (from || to) {
      manualQuery.createdAt = {};
      if (from) manualQuery.createdAt.$gte = from;
      if (to) manualQuery.createdAt.$lte = to;
    }

    const [manualTransactions, subscriptionTransactions] = await Promise.all([
      BillingTransaction.find(manualQuery)
        .populate('userId', 'name email phone avatar')
        .populate('planId', 'name planType billingModel monthlyPrice annualPrice price')
        .populate('listingId', 'title name propertyName')
        .sort({ createdAt: -1 }),
      SubscriptionTransaction.find(status ? { status: status === 'paid' ? 'completed' : status } : {})
        .populate('company', 'companyName email phone')
        .populate('subscriptionPlan', 'name')
        .sort({ processedDate: -1, createdAt: -1 })
    ]);

    const mappedManual = manualTransactions.map((transaction) => {
      const remainingDays = computeRemainingDays(transaction.expiryDate);
      return {
        id: transaction._id,
        assignmentId: transaction.assignmentId || null,
        currentPlanId: transaction.planId?._id || null,
        profilePhoto: transaction.userId?.avatar || '',
        transactionId: transaction.transactionId || `BTX-${String(transaction._id).slice(-6).toUpperCase()}`,
        user: transaction.userId?.name || transaction.userId?.email || 'N/A',
        email: transaction.userId?.email || 'N/A',
        phone: transaction.userId?.phone || 'N/A',
        userType: transaction.userType === 'property_seeker'
          ? 'Property Seeker'
          : (transaction.userType === 'tenant' ? 'Tenant' : 'Landlord'),
        plan: transaction.planId?.name || paymentForLabel(transaction.paymentFor),
        paymentFor: paymentForLabel(transaction.paymentFor),
        chargeType: chargeTypeLabel(transaction.chargeType),
        listing: transaction.listingId?.title || transaction.listingId?.name || transaction.listingId?.propertyName || 'N/A',
        amount: toNumber(transaction.amount),
        selectedViews: toNumber(transaction.selectedViews),
        pricePerView: toNumber(transaction.pricePerView),
        totalAmount: toNumber(transaction.totalAmount || transaction.amount),
        paymentMethod: billingMethodLabel(transaction.paymentMethod),
        status: transaction.status || 'pending',
        date: transaction.paidAt || transaction.createdAt,
        subscribedMonths: Math.max(1, toNumber(transaction.subscribedMonths, 1)),
        startDate: transaction.startDate || null,
        expiryDate: transaction.expiryDate || null,
        remainingDays,
        remainingTime: remainingLabel(remainingDays),
        source: 'billing_transaction'
      };
    });

    const mappedLegacySubscriptions = subscriptionTransactions.map((transaction) => ({
      id: transaction._id,
      assignmentId: null,
      currentPlanId: transaction.subscriptionPlan?._id || null,
      profilePhoto: '',
      transactionId: transaction.invoiceId || transaction.paymentId || `TRX-${String(transaction._id).slice(-6).toUpperCase()}`,
      user: transaction.company?.companyName || 'N/A',
      email: transaction.company?.email || 'N/A',
      phone: transaction.company?.phone || 'N/A',
      userType: 'Landlord',
      plan: transaction.subscriptionPlan?.name || 'N/A',
      paymentFor: 'Landlord Subscription',
      chargeType: 'Other',
      listing: 'N/A',
      amount: toNumber(transaction.amount),
      paymentMethod: billingMethodLabel(transaction.paymentMethod),
      status: normalizeLegacyStatus(transaction.status),
      date: transaction.processedDate || transaction.createdAt,
      subscribedMonths: 1,
      startDate: transaction.startDate || null,
      expiryDate: transaction.endDate || null,
      remainingDays: computeRemainingDays(transaction.endDate),
      remainingTime: remainingLabel(computeRemainingDays(transaction.endDate)),
      source: 'subscription_transaction'
    }));

    const assignmentRows = await PlanAssignment.find({ deletedAt: null })
      .populate('userId', 'name email phone avatar')
      .populate('planId', 'name monthlyPrice annualPrice price planType billingModel')
      .sort({ createdAt: -1 });

    const billedAssignmentIds = new Set(
      manualTransactions
        .map((item) => item.assignmentId ? String(item.assignmentId) : '')
        .filter(Boolean)
    );

    const mappedAssignments = assignmentRows
      .filter((assignment) => !billedAssignmentIds.has(String(assignment._id)))
      .map((assignment) => {
        const userTypeLabel = assignment.userType === 'property_seeker' ? 'Property Seeker' : 'Landlord';
        const remainingDays = computeRemainingDays(assignment.expiryDate);
        return {
          id: assignment._id,
          assignmentId: assignment._id,
          currentPlanId: assignment.planId?._id || null,
          profilePhoto: assignment.userId?.avatar || '',
          transactionId: `SUBA-${String(assignment._id).slice(-6).toUpperCase()}`,
          user: assignment.userId?.name || assignment.userId?.email || 'N/A',
          email: assignment.userId?.email || 'N/A',
          phone: assignment.userId?.phone || 'N/A',
          userType: userTypeLabel,
          plan: assignment.planId?.name || 'N/A',
          paymentFor: assignment.userType === 'property_seeker' ? 'Premium Seeker Plan' : 'Landlord Subscription',
          chargeType: assignment.userType === 'property_seeker' ? 'Monthly Seeker Plan' : 'Other',
          listing: 'N/A',
          amount: toNumber(
            assignment.amount !== undefined && assignment.amount !== null
              ? assignment.amount
              : calculateAssignmentAmount({
                plan: assignment.planId,
                billingCycle: assignment.billingCycle,
                subscribedMonths: assignment.subscribedMonths,
                userType: assignment.userType
              })
          ),
          paymentMethod: 'Manual',
          status: mapAssignmentToBillingStatus(assignment.status),
          date: assignment.createdAt,
          subscribedMonths: Math.max(1, toNumber(assignment.subscribedMonths, 1)),
          startDate: assignment.startDate || null,
          expiryDate: assignment.expiryDate || null,
          remainingDays,
          remainingTime: remainingLabel(remainingDays),
          source: 'plan_assignment'
        };
      });

    let merged = [...mappedManual, ...mappedLegacySubscriptions, ...mappedAssignments];

    if (tab === 'subscribed_users') {
      merged = merged.filter((row) => ['Landlord Subscription', 'Premium Seeker Plan'].includes(row.paymentFor));
    } else if (tab === 'active_subscriptions') {
      merged = merged.filter((row) => row.status === 'paid' && ['Landlord Subscription', 'Premium Seeker Plan'].includes(row.paymentFor));
    } else if (tab === 'expiring_soon') {
      merged = merged.filter((row) => ['Landlord Subscription', 'Premium Seeker Plan'].includes(row.paymentFor) && row.remainingDays !== null && row.remainingDays >= 0 && row.remainingDays <= 30);
    } else if (tab === 'expired_subscriptions') {
      merged = merged.filter((row) => ['Landlord Subscription', 'Premium Seeker Plan'].includes(row.paymentFor) && row.remainingDays !== null && row.remainingDays < 0);
    } else if (tab === 'past_due') {
      merged = merged.filter((row) => ['Landlord Subscription', 'Premium Seeker Plan'].includes(row.paymentFor) && ['pending', 'failed'].includes(String(row.status).toLowerCase()));
    } else if (tab === 'landlord_subscriptions') {
      merged = merged.filter((row) => row.paymentFor === 'Landlord Subscription');
    } else if (tab === 'property_seekers') {
      merged = merged.filter((row) => row.userType === 'Property Seeker');
    } else if (tab === 'per_view_billing') {
      merged = merged.filter((row) => ['Property View Package', 'Credit Bundle', 'Per View Charge', 'Listing Detail Unlock', 'Map Location Reveal', 'Landlord Contact Reveal'].includes(row.paymentFor));
    } else if (tab === 'per_visit_billing') {
      merged = merged.filter((row) => row.paymentFor === 'Visit Booking');
    } else if (tab === 'pending_payments') {
      merged = merged.filter((row) => row.status === 'pending');
    } else if (tab === 'failed_payments') {
      merged = merged.filter((row) => row.status === 'failed');
    }

    if (search) {
      const term = String(search).toLowerCase();
      merged = merged.filter((row) => (
        [
          row.transactionId,
          row.user,
          row.email,
          row.phone,
          row.paymentFor,
          row.userType,
          row.paymentMethod
        ].some((value) => String(value || '').toLowerCase().includes(term))
      ));
    }

    merged.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

    const total = merged.length;
    const parsedPage = toNumber(page, 1);
    const parsedLimit = toNumber(limit, 20);
    const startIndex = (parsedPage - 1) * parsedLimit;
    const paginated = merged.slice(startIndex, startIndex + parsedLimit);

    res.json({
      success: true,
      transactions: paginated,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        pages: Math.max(1, Math.ceil(total / parsedLimit))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update billing transaction status
// @route   PUT /api/super-admin/billing/transactions/:transactionId/status
// @access  Private (super_admin only)
const updateBillingTransactionStatus = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { status } = req.body || {};
    const normalizedStatus = String(status || '').toLowerCase();
    const allowedStatuses = ['paid', 'pending', 'failed', 'cancelled', 'refunded', 'partial'];
    if (!allowedStatuses.includes(normalizedStatus)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    let updated = await BillingTransaction.findOne({ transactionId, deletedAt: null });
    if (!updated && String(transactionId || '').match(/^[a-f0-9]{24}$/i)) {
      updated = await BillingTransaction.findOne({ _id: transactionId, deletedAt: null });
    }

    if (updated) {
      const wasPaid = updated.status === 'paid';
      updated.status = normalizedStatus;
      if (normalizedStatus === 'paid') {
        updated.paidAt = new Date();
      }
      updated.manualRecordedBy = req.user._id;
      await updated.save();
      if (normalizedStatus === 'paid' && !wasPaid) {
        await applyPurchasedViewCredits(updated);
      }
    } else {
      let legacy = await SubscriptionTransaction.findOne({
        $or: [{ invoiceId: transactionId }, { paymentId: transactionId }]
      });
      if (!legacy && String(transactionId || '').match(/^[a-f0-9]{24}$/i)) {
        legacy = await SubscriptionTransaction.findById(transactionId);
      }

      if (!legacy) {
        return res.status(404).json({ success: false, message: 'Transaction not found' });
      }

      legacy.status = ({
        paid: 'completed',
        pending: 'pending',
        failed: 'failed',
        cancelled: 'cancelled',
        refunded: 'refunded',
        partial: 'processing'
      })[normalizedStatus] || legacy.status;
      if (legacy.status === 'completed') {
        legacy.processedDate = new Date();
      }
      await legacy.save();
      updated = legacy;
    }

    await activityLogService.logActivity({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: normalizedStatus === 'paid' ? 'manual_payment_marked_paid' : 'billing_transaction_status_changed',
      entity: 'billing_transaction',
      entityId: updated._id,
      entityName: transactionId,
      newValue: normalizedStatus,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ success: true, message: 'Transaction status updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get reports payload
// @route   GET /api/super-admin/reports
// @access  Private (super_admin only)
const getReports = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { start, end } = toDateRange(startDate, endDate);

    const [landlordGrowth, tenantGrowth, seekerGrowth, payments] = await Promise.all([
      User.countDocuments({ role: { $in: ['owner', 'self_owner'] }, deletedAt: null, createdAt: { $gte: start, $lte: end } }),
      Tenant.countDocuments({ deletedAt: null, createdAt: { $gte: start, $lte: end } }),
      User.countDocuments({ role: 'property_seeker', deletedAt: null, createdAt: { $gte: start, $lte: end } }),
      Payment.find({ deletedAt: null, createdAt: { $gte: start, $lte: end } })
    ]);

    const platformRevenue = payments.reduce((sum, payment) => sum + toNumber(payment.amountPaid || payment.amount), 0);

    res.json({
      success: true,
      reports: {
        platformRevenue,
        landlordGrowth,
        tenantGrowth,
        propertySeekerGrowth: seekerGrowth,
        listingPerformance: [],
        visitBookings: 0,
        subscriptionRevenue: platformRevenue,
        seekerBillingRevenue: 0,
        systemActivity: []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get support tickets placeholder
// @route   GET /api/super-admin/support-tickets
// @access  Private (super_admin only)
const getSupportTickets = async (req, res) => {
  res.json({
    success: true,
    tickets: [],
    pagination: { page: 1, pages: 1, total: 0 }
  });
};

// @desc    Get announcements
// @route   GET /api/super-admin/announcements
// @access  Private (super_admin only)
const getAnnouncements = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (toNumber(page, 1) - 1) * toNumber(limit, 20);
    const rows = await Notification.find({ type: 'announcement', deletedAt: null })
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(toNumber(limit, 20));

    const announcements = rows.map((item) => ({
      id: item._id,
      title: item.title,
      message: item.message,
      audience: item.metadata?.audience || 'all_users',
      createdAt: item.createdAt,
      createdBy: item.user?.name || item.user?.email || 'System'
    }));

    const total = await Notification.countDocuments({ type: 'announcement', deletedAt: null });
    res.json({
      success: true,
      announcements,
      pagination: {
        page: toNumber(page, 1),
        limit: toNumber(limit, 20),
        total,
        pages: Math.max(1, Math.ceil(total / toNumber(limit, 20)))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create announcement
// @route   POST /api/super-admin/announcements
// @access  Private (super_admin only)
const createAnnouncement = async (req, res) => {
  try {
    const { title, message, audience = 'all_users' } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required' });
    }

    let roleFilter = { $in: ['self_owner', 'tenant', 'property_seeker', 'owner'] };
    if (audience === 'landlords') roleFilter = { $in: ['self_owner', 'owner'] };
    if (audience === 'tenants') roleFilter = 'tenant';
    if (audience === 'property_seekers') roleFilter = 'property_seeker';

    const users = await User.find({ role: roleFilter, isActive: true, deletedAt: null }).select('_id company');
    const notifications = users
      .filter((user) => user.company)
      .map((user) => ({
        company: user.company,
        user: user._id,
        title: title.trim(),
        message: message.trim(),
        type: 'announcement',
        priority: 'medium',
        channels: { inApp: true, email: false, sms: false, push: false },
        metadata: {
          audience,
          sourceModule: 'super_admin_announcements',
          createdBy: req.user._id
        }
      }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    await activityLogService.logActivity({
      user: req.user._id,
      userName: req.user.name,
      userEmail: req.user.email,
      action: 'notification_sent',
      entity: 'announcement',
      entityName: title.trim(),
      description: `Announcement sent to ${audience}`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { audience, recipients: notifications.length }
    });

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      sentTo: notifications.length
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
  getLandlords,
  getTenantsList,
  getPropertySeekers,
  getVacantListings,
  getViewsVisits,
  getBilling,
  getReports,
  getSupportTickets,
  getAnnouncements,
  createAnnouncement,
  getCustomers,
  getCustomerDetails,
  suspendCustomer,
  activateCustomer,
  changeCustomerPlan,
  getCustomerSubscriptionStatus,
  refreshCustomerSubscription,
  renewCustomerSubscription,
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
  deletePlan,
  getPlanAssignments,
  createPlanAssignment,
  updatePlanAssignment,
  deletePlanAssignment,
  getBillingSummary,
  getBillingTransactions,
  updateBillingTransactionStatus
};
