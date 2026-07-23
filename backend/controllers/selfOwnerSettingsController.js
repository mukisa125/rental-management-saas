const SelfOwnerSettings = require('../models/SelfOwnerSettings');
const User = require('../models/User');
const Company = require('../models/Company');
const Property = require('../models/Property');
const Unit = require('../models/Unit');
const Tenant = require('../models/Tenant');
const Document = require('../models/Document');
const ActivityLog = require('../models/ActivityLog');
const SubscriptionTransaction = require('../models/SubscriptionTransaction');
const Notification = require('../models/Notification');

const getCompanyId = (req) => req.company?._id || req.user.company;
const asText = (value, fallback = '') => (value === undefined || value === null ? fallback : String(value).trim());
const asBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const token = String(value).toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(token);
};
const asNumber = (value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
};
const allowedImageTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const sanitizeImageDataUrl = (value) => {
  const raw = asText(value, '');
  if (!raw) return '';
  if (!raw.startsWith('data:')) throw new Error('Image must be a valid data URL.');
  const [meta, base64Content] = raw.split(',');
  const mimeMatch = meta.match(/^data:([^;]+);base64$/i);
  if (!mimeMatch || !allowedImageTypes.has(String(mimeMatch[1]).toLowerCase())) {
    throw new Error('Image must be JPG, PNG, or WEBP.');
  }
  if (!base64Content) throw new Error('Image is invalid.');
  const sizeInBytes = Buffer.byteLength(base64Content, 'base64');
  if (sizeInBytes > 2 * 1024 * 1024) throw new Error('Image must be 2MB or smaller.');
  return raw;
};

const toSafeSettings = (settings, req) => {
  const source = settings?.toObject ? settings.toObject() : settings;
  const user = req.user || {};

  return {
    ownerId: String(source?.ownerId || user._id || ''),
    profile: {
      fullName: asText(source?.profile?.fullName || user.name, '—'),
      email: asText(source?.profile?.email || user.email, '—'),
      phone: asText(source?.profile?.phone || user.phone, '—'),
      whatsappNumber: asText(source?.profile?.whatsappNumber, '—'),
      profilePhoto: asText(source?.profile?.profilePhoto || user.avatar, ''),
      accountId: String(user._id || ''),
      role: asText(user.role, 'self_owner'),
      accountStatus: user.isActive ? 'Active' : 'Inactive',
      memberSince: user.createdAt || null,
      lastLogin: user.lastLogin || null
    },
    business: {
      businessName: asText(source?.business?.businessName, ''),
      businessType: asText(source?.business?.businessType, 'Property Owner'),
      registrationId: asText(source?.business?.registrationId, ''),
      email: asText(source?.business?.email, ''),
      phone: asText(source?.business?.phone, ''),
      whatsappNumber: asText(source?.business?.whatsappNumber, ''),
      address: asText(source?.business?.address, ''),
      city: asText(source?.business?.city, ''),
      district: asText(source?.business?.district, ''),
      country: asText(source?.business?.country, 'Uganda'),
      workingHours: asText(source?.business?.workingHours, ''),
      description: asText(source?.business?.description, ''),
      logo: asText(source?.business?.logo, ''),
      favicon: asText(source?.business?.favicon, ''),
      primaryColor: asText(source?.business?.primaryColor, '#2563eb'),
      secondaryColor: asText(source?.business?.secondaryColor, '#0f172a')
    },
    payments: source?.payments || {},
    receiptsInvoices: source?.receiptsInvoices || {},
    notifications: source?.notifications || {},
    rentLease: source?.rentLease || {},
    documents: source?.documents || {},
    security: source?.security || {},
    subscriptionSnapshot: source?.subscriptionSnapshot || {},
    preferences: source?.preferences || {}
  };
};

const ensureSettings = async (req) => {
  const companyId = getCompanyId(req);
  let settings = await SelfOwnerSettings.findOne({ ownerId: req.user._id, company: companyId });
  if (settings) return settings;

  settings = await SelfOwnerSettings.create({
    ownerId: req.user._id,
    company: companyId,
    profile: {
      fullName: asText(req.user.name, ''),
      email: asText(req.user.email, ''),
      phone: asText(req.user.phone, ''),
      profilePhoto: asText(req.user.avatar, '')
    },
    notifications: {
      emailNotifications: asBool(req.user.notificationPreferences?.emailNotifications, true),
      smsNotifications: asBool(req.user.notificationPreferences?.smsNotifications, false),
      inAppNotifications: asBool(req.user.notificationPreferences?.inAppNotifications, true)
    }
  });
  return settings;
};

const getSubscriptionAndUsage = async (req) => {
  const companyId = getCompanyId(req);
  const [company, propertiesUsed, unitsUsed, tenantsUsed, documentsUsed, storageAgg, transactions] = await Promise.all([
    Company.findById(companyId).populate('subscriptionPlan'),
    Property.countDocuments({ company: companyId, owner: req.user._id, deletedAt: null }),
    Unit.countDocuments({ company: companyId, owner: req.user._id, deletedAt: null }),
    Tenant.countDocuments({ company: companyId, owner: req.user._id, deletedAt: null }),
    Document.countDocuments({ company: companyId, owner: req.user._id, deletedAt: null }),
    Document.aggregate([
      { $match: { company: companyId, owner: req.user._id, deletedAt: null } },
      { $group: { _id: null, total: { $sum: { $ifNull: ['$size', 0] } } } }
    ]),
    SubscriptionTransaction.find({ company: companyId })
      .populate('subscriptionPlan', 'name')
      .sort({ createdAt: -1 })
      .limit(15)
      .lean()
  ]);

  const storageUsed = Number(storageAgg?.[0]?.total || 0);
  const plan = company?.subscriptionPlan;
  return {
    subscriptionSnapshot: {
      planName: asText(plan?.name || 'Trial', 'Trial'),
      status: asText(company?.subscriptionStatus || 'trial', 'trial'),
      billingCycle: asText(company?.billingCycle || 'monthly', 'monthly'),
      nextBillingDate: company?.nextPaymentDueDate || null,
      subscriptionStartDate: company?.subscriptionStartDate || company?.createdAt || null,
      subscriptionExpiryDate: company?.subscriptionEndDate || company?.trialEndsAt || null
    },
    usage: {
      propertiesUsed,
      propertiesLimit: plan?.maxProperties ?? null,
      unitsUsed,
      unitsLimit: plan?.maxUnits ?? null,
      tenantsUsed,
      tenantsLimit: plan?.maxTenants ?? null,
      documentsUsed,
      documentsLimit: null,
      storageUsed,
      storageLimit: null,
      whatsappMessagesUsed: null,
      whatsappMessagesLimit: null
    },
    paymentHistory: transactions.map((item) => ({
      id: String(item._id || ''),
      invoiceId: asText(item.invoiceId || '—', '—'),
      plan: asText(item.subscriptionPlan?.name || '—', '—'),
      amount: asNumber(item.amount, 0),
      paymentMethod: asText(item.paymentMethod || 'manual', 'manual'),
      status: asText(item.status || 'pending', 'pending'),
      date: item.createdAt || null,
      invoiceUrl: asText(item.invoiceUrl, '')
    }))
  };
};

const getSecurityActivity = async (req) => {
  const companyId = getCompanyId(req);
  const loginActivity = await ActivityLog.find({
    company: companyId,
    user: req.user._id,
    action: 'login'
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .select('userAgent ipAddress createdAt status')
    .lean();

  return loginActivity.map((item) => ({
    device: asText(item.userAgent || 'Unknown Device', 'Unknown Device'),
    browser: asText(item.userAgent || 'Unknown Browser', 'Unknown Browser'),
    location: asText(item.ipAddress || 'Unknown', 'Unknown'),
    dateTime: item.createdAt || null,
    status: asText(item.status || 'success', 'success')
  }));
};

const getSettings = async (req, res) => {
  try {
    const settings = await ensureSettings(req);
    const [subscription, loginActivity] = await Promise.all([
      getSubscriptionAndUsage(req),
      getSecurityActivity(req)
    ]);

    settings.subscriptionSnapshot = {
      ...settings.subscriptionSnapshot,
      ...subscription.subscriptionSnapshot
    };
    await settings.save();

    const whatsappConfigured = Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
    const documentsStats = await Document.aggregate([
      {
        $match: {
          company: getCompanyId(req),
          owner: req.user._id,
          deletedAt: null
        }
      },
      {
        $group: {
          _id: null,
          generatedCount: {
            $sum: {
              $cond: [
                { $in: ['$sourceModule', ['payment', 'maintenance', 'monthly_assessment', 'report_export', 'system']] },
                1,
                0
              ]
            }
          },
          uploadedCount: {
            $sum: {
              $cond: [{ $eq: ['$sourceModule', 'manual_upload'] }, 1, 0]
            }
          }
        }
      }
    ]);

    return res.json({
      success: true,
      settings: toSafeSettings(settings, req),
      subscription: subscription.subscriptionSnapshot,
      usage: subscription.usage,
      paymentHistory: subscription.paymentHistory,
      loginActivity,
      activeSessions: [
        {
          label: 'Current Session',
          current: true,
          lastSeen: new Date(),
          status: 'active'
        }
      ],
      documentStorage: {
        generatedDocuments: Number(documentsStats?.[0]?.generatedCount || 0),
        uploadedDocuments: Number(documentsStats?.[0]?.uploadedCount || 0)
      },
      warnings: {
        whatsappApiNotConfigured: !whatsappConfigured
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to load settings' });
  }
};

const saveProfile = async (req, res) => {
  try {
    const settings = await ensureSettings(req);
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const nextPhoto = req.body.profilePhoto !== undefined ? sanitizeImageDataUrl(req.body.profilePhoto) : settings.profile.profilePhoto;

    settings.profile = {
      ...settings.profile,
      fullName: asText(req.body.fullName, settings.profile.fullName || user.name || ''),
      email: asText(req.body.email, settings.profile.email || user.email || ''),
      phone: asText(req.body.phone, settings.profile.phone || user.phone || ''),
      whatsappNumber: asText(req.body.whatsappNumber, settings.profile.whatsappNumber || ''),
      profilePhoto: nextPhoto
    };

    user.name = settings.profile.fullName || user.name;
    user.email = settings.profile.email || user.email;
    user.phone = settings.profile.phone || user.phone;
    user.avatar = settings.profile.profilePhoto || user.avatar;

    await Promise.all([settings.save(), user.save()]);
    return res.json({ success: true, message: 'Profile settings saved', profile: toSafeSettings(settings, { user }).profile });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Failed to save profile settings' });
  }
};

const saveBusiness = async (req, res) => {
  try {
    const settings = await ensureSettings(req);
    settings.business = {
      ...settings.business,
      businessName: asText(req.body.businessName, settings.business.businessName),
      businessType: asText(req.body.businessType, settings.business.businessType),
      registrationId: asText(req.body.registrationId, settings.business.registrationId),
      email: asText(req.body.email, settings.business.email),
      phone: asText(req.body.phone, settings.business.phone),
      whatsappNumber: asText(req.body.whatsappNumber, settings.business.whatsappNumber),
      address: asText(req.body.address, settings.business.address),
      city: asText(req.body.city, settings.business.city),
      district: asText(req.body.district, settings.business.district),
      country: asText(req.body.country, settings.business.country),
      workingHours: asText(req.body.workingHours, settings.business.workingHours),
      description: asText(req.body.description, settings.business.description),
      logo: req.body.logo !== undefined ? sanitizeImageDataUrl(req.body.logo) : settings.business.logo,
      favicon: req.body.favicon !== undefined ? sanitizeImageDataUrl(req.body.favicon) : settings.business.favicon,
      primaryColor: asText(req.body.primaryColor, settings.business.primaryColor || '#2563eb'),
      secondaryColor: asText(req.body.secondaryColor, settings.business.secondaryColor || '#0f172a')
    };
    await settings.save();
    return res.json({ success: true, message: 'Business settings saved', business: settings.business });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Failed to save business settings' });
  }
};

const savePayments = async (req, res) => {
  try {
    const settings = await ensureSettings(req);
    settings.payments = {
      ...settings.payments,
      cash: { ...settings.payments.cash, ...req.body.cash, enabled: asBool(req.body?.cash?.enabled, settings.payments.cash.enabled) },
      mtnMobileMoney: { ...settings.payments.mtnMobileMoney, ...req.body.mtnMobileMoney, enabled: asBool(req.body?.mtnMobileMoney?.enabled, settings.payments.mtnMobileMoney.enabled) },
      airtelMoney: { ...settings.payments.airtelMoney, ...req.body.airtelMoney, enabled: asBool(req.body?.airtelMoney?.enabled, settings.payments.airtelMoney.enabled) },
      bankTransfer: { ...settings.payments.bankTransfer, ...req.body.bankTransfer, enabled: asBool(req.body?.bankTransfer?.enabled, settings.payments.bankTransfer.enabled) },
      cardOnlinePayment: { ...settings.payments.cardOnlinePayment, ...req.body.cardOnlinePayment, enabled: asBool(req.body?.cardOnlinePayment?.enabled, settings.payments.cardOnlinePayment.enabled) },
      defaultMethod: asText(req.body.defaultMethod, settings.payments.defaultMethod || 'cash'),
      allowPartialPayments: asBool(req.body.allowPartialPayments, settings.payments.allowPartialPayments),
      allowAdvancePayments: asBool(req.body.allowAdvancePayments, settings.payments.allowAdvancePayments),
      gracePeriodDays: asNumber(req.body.gracePeriodDays, settings.payments.gracePeriodDays, 0, 90),
      lateFeeType: asText(req.body.lateFeeType, settings.payments.lateFeeType || 'fixed') === 'percentage' ? 'percentage' : 'fixed',
      lateFeeAmount: asNumber(req.body.lateFeeAmount, settings.payments.lateFeeAmount, 0, 1000000000),
      showPaymentFeeTips: asBool(req.body.showPaymentFeeTips, settings.payments.showPaymentFeeTips),
      requirePaymentReference: asBool(req.body.requirePaymentReference, settings.payments.requirePaymentReference)
    };
    await settings.save();
    return res.json({ success: true, message: 'Payment settings saved', payments: settings.payments });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Failed to save payment settings' });
  }
};

const saveReceipts = async (req, res) => {
  try {
    const settings = await ensureSettings(req);
    settings.receiptsInvoices = {
      ...settings.receiptsInvoices,
      receiptHeaderName: asText(req.body.receiptHeaderName, settings.receiptsInvoices.receiptHeaderName),
      receiptPrefix: asText(req.body.receiptPrefix, settings.receiptsInvoices.receiptPrefix || 'RCPT'),
      invoicePrefix: asText(req.body.invoicePrefix, settings.receiptsInvoices.invoicePrefix || 'INV'),
      showQrVerificationCode: asBool(req.body.showQrVerificationCode, settings.receiptsInvoices.showQrVerificationCode),
      showOwnerContactOnReceipt: asBool(req.body.showOwnerContactOnReceipt, settings.receiptsInvoices.showOwnerContactOnReceipt),
      showBalanceOnReceipt: asBool(req.body.showBalanceOnReceipt, settings.receiptsInvoices.showBalanceOnReceipt),
      showSignatureOnReceipt: asBool(req.body.showSignatureOnReceipt, settings.receiptsInvoices.showSignatureOnReceipt),
      receiptFooterMessage: asText(req.body.receiptFooterMessage, settings.receiptsInvoices.receiptFooterMessage),
      defaultReceiptStatus: asText(req.body.defaultReceiptStatus, settings.receiptsInvoices.defaultReceiptStatus),
      autoGenerateMonthlyInvoices: asBool(req.body.autoGenerateMonthlyInvoices, settings.receiptsInvoices.autoGenerateMonthlyInvoices),
      invoiceDueDay: asNumber(req.body.invoiceDueDay, settings.receiptsInvoices.invoiceDueDay, 1, 31),
      showTenantBalance: asBool(req.body.showTenantBalance, settings.receiptsInvoices.showTenantBalance),
      showPaymentInstructions: asBool(req.body.showPaymentInstructions, settings.receiptsInvoices.showPaymentInstructions)
    };
    await settings.save();
    return res.json({ success: true, message: 'Receipt and invoice settings saved', receiptsInvoices: settings.receiptsInvoices });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Failed to save receipt settings' });
  }
};

const saveNotifications = async (req, res) => {
  try {
    const settings = await ensureSettings(req);
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const previousPropertyRules = asText(settings.notifications?.propertyRulesNotice, '');

    settings.notifications = {
      ...settings.notifications,
      emailNotifications: asBool(req.body.emailNotifications, settings.notifications.emailNotifications),
      smsNotifications: asBool(req.body.smsNotifications, settings.notifications.smsNotifications),
      whatsappNotifications: asBool(req.body.whatsappNotifications, settings.notifications.whatsappNotifications),
      inAppNotifications: asBool(req.body.inAppNotifications, settings.notifications.inAppNotifications),
      whatsappNumber: asText(req.body.whatsappNumber, settings.notifications.whatsappNumber),
      notificationEmail: asText(req.body.notificationEmail, settings.notifications.notificationEmail),
      rentPaymentAlerts: asBool(req.body.rentPaymentAlerts, settings.notifications.rentPaymentAlerts),
      overdueRentAlerts: asBool(req.body.overdueRentAlerts, settings.notifications.overdueRentAlerts),
      maintenanceRequestAlerts: asBool(req.body.maintenanceRequestAlerts, settings.notifications.maintenanceRequestAlerts),
      leaseExpiryAlerts: asBool(req.body.leaseExpiryAlerts, settings.notifications.leaseExpiryAlerts),
      tenantRegistrationAlerts: asBool(req.body.tenantRegistrationAlerts, settings.notifications.tenantRegistrationAlerts),
      documentExpiryAlerts: asBool(req.body.documentExpiryAlerts, settings.notifications.documentExpiryAlerts),
      invoiceGeneratedAlerts: asBool(req.body.invoiceGeneratedAlerts, settings.notifications.invoiceGeneratedAlerts),
      failedPaymentAlerts: asBool(req.body.failedPaymentAlerts, settings.notifications.failedPaymentAlerts),
      propertyRulesNotice: asText(req.body.propertyRulesNotice, settings.notifications.propertyRulesNotice).slice(0, 4000),
      dailySummary: asBool(req.body.dailySummary, settings.notifications.dailySummary),
      weeklySummary: asBool(req.body.weeklySummary, settings.notifications.weeklySummary),
      monthlySummary: asBool(req.body.monthlySummary, settings.notifications.monthlySummary)
    };

    user.notificationPreferences = {
      ...user.notificationPreferences,
      emailNotifications: settings.notifications.emailNotifications,
      smsNotifications: settings.notifications.smsNotifications,
      inAppNotifications: settings.notifications.inAppNotifications
    };

    const nextPropertyRules = asText(settings.notifications?.propertyRulesNotice, '');
    await Promise.all([settings.save(), user.save()]);

    if (nextPropertyRules && nextPropertyRules !== previousPropertyRules) {
      const tenantUsers = await Tenant.find({
        company: getCompanyId(req),
        owner: req.user._id,
        status: 'active',
        deletedAt: null,
        user: { $ne: null }
      }).select('user property unit');
      const tenantNotifications = tenantUsers
        .map((tenant) => tenant.user ? ({
          company: getCompanyId(req),
          user: tenant.user,
          title: 'Property Rules Update',
          message: nextPropertyRules,
          type: 'announcement',
          priority: 'high',
          actionUrl: '/tenant/notices',
          actionButton: { label: 'View Rules', url: '/tenant/notices' },
          metadata: {
            category: 'property_rules',
            ownerId: String(req.user._id),
            property: tenant.property || null,
            unit: tenant.unit || null
          }
        }) : null)
        .filter(Boolean);
      if (tenantNotifications.length) {
        await Notification.insertMany(tenantNotifications, { ordered: false });
      }
    }
    return res.json({
      success: true,
      message: 'Notification settings saved',
      notifications: settings.notifications,
      warnings: {
        whatsappApiNotConfigured: !Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
      }
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Failed to save notification settings' });
  }
};

const saveRentLease = async (req, res) => {
  try {
    const settings = await ensureSettings(req);
    settings.rentLease = {
      ...settings.rentLease,
      defaultRentDueDay: asNumber(req.body.defaultRentDueDay, settings.rentLease.defaultRentDueDay, 1, 31),
      gracePeriodDays: asNumber(req.body.gracePeriodDays, settings.rentLease.gracePeriodDays, 0, 90),
      autoMarkOverdueRent: asBool(req.body.autoMarkOverdueRent, settings.rentLease.autoMarkOverdueRent),
      allowPartialPayments: asBool(req.body.allowPartialPayments, settings.rentLease.allowPartialPayments),
      allowAdvancePayments: asBool(req.body.allowAdvancePayments, settings.rentLease.allowAdvancePayments),
      latePaymentFee: asNumber(req.body.latePaymentFee, settings.rentLease.latePaymentFee, 0, 1000000000),
      latePaymentFeeType: asText(req.body.latePaymentFeeType, settings.rentLease.latePaymentFeeType || 'fixed') === 'percentage' ? 'percentage' : 'fixed',
      securityDepositRequired: asBool(req.body.securityDepositRequired, settings.rentLease.securityDepositRequired),
      securityDepositType: asText(req.body.securityDepositType, settings.rentLease.securityDepositType || 'amount') === 'months' ? 'months' : 'amount',
      securityDepositValue: asNumber(req.body.securityDepositValue, settings.rentLease.securityDepositValue, 0, 1000000000),
      defaultCurrency: asText(req.body.defaultCurrency, settings.rentLease.defaultCurrency || 'UGX'),
      defaultLeaseDurationMonths: asNumber(req.body.defaultLeaseDurationMonths, settings.rentLease.defaultLeaseDurationMonths, 1, 120),
      leaseExpiryReminderDays: asNumber(req.body.leaseExpiryReminderDays, settings.rentLease.leaseExpiryReminderDays, 1, 365),
      autoGenerateLeaseDocuments: asBool(req.body.autoGenerateLeaseDocuments, settings.rentLease.autoGenerateLeaseDocuments),
      requireTenantIdBeforeLease: asBool(req.body.requireTenantIdBeforeLease, settings.rentLease.requireTenantIdBeforeLease),
      requireLcLetterBeforeLease: asBool(req.body.requireLcLetterBeforeLease, settings.rentLease.requireLcLetterBeforeLease),
      defaultMoveInChecklist: asText(req.body.defaultMoveInChecklist, settings.rentLease.defaultMoveInChecklist),
      defaultMoveOutChecklist: asText(req.body.defaultMoveOutChecklist, settings.rentLease.defaultMoveOutChecklist)
    };
    await settings.save();
    return res.json({ success: true, message: 'Rent and lease settings saved', rentLease: settings.rentLease });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Failed to save rent/lease settings' });
  }
};

const saveDocuments = async (req, res) => {
  try {
    const settings = await ensureSettings(req);
    settings.documents = {
      ...settings.documents,
      autoGeneratePaymentReceipts: asBool(req.body.autoGeneratePaymentReceipts, settings.documents.autoGeneratePaymentReceipts),
      autoGenerateTenantProfileDocuments: asBool(req.body.autoGenerateTenantProfileDocuments, settings.documents.autoGenerateTenantProfileDocuments),
      autoGeneratePropertyProfileDocuments: asBool(req.body.autoGeneratePropertyProfileDocuments, settings.documents.autoGeneratePropertyProfileDocuments),
      autoGenerateUnitProfileDocuments: asBool(req.body.autoGenerateUnitProfileDocuments, settings.documents.autoGenerateUnitProfileDocuments),
      autoGenerateMaintenanceApprovalDocuments: asBool(req.body.autoGenerateMaintenanceApprovalDocuments, settings.documents.autoGenerateMaintenanceApprovalDocuments),
      autoGenerateMaintenanceCompletionDocuments: asBool(req.body.autoGenerateMaintenanceCompletionDocuments, settings.documents.autoGenerateMaintenanceCompletionDocuments),
      autoGenerateMonthlyAssessmentReports: asBool(req.body.autoGenerateMonthlyAssessmentReports, settings.documents.autoGenerateMonthlyAssessmentReports),
      autoGenerateLeaseDocuments: asBool(req.body.autoGenerateLeaseDocuments, settings.documents.autoGenerateLeaseDocuments),
      allowTenantDocumentUploads: asBool(req.body.allowTenantDocumentUploads, settings.documents.allowTenantDocumentUploads),
      allowTenantMaintenanceImageUploads: asBool(req.body.allowTenantMaintenanceImageUploads, settings.documents.allowTenantMaintenanceImageUploads),
      showDocumentsToTenant: asBool(req.body.showDocumentsToTenant, settings.documents.showDocumentsToTenant),
      requireApprovalBeforeTenantDocumentAcceptance: asBool(req.body.requireApprovalBeforeTenantDocumentAcceptance, settings.documents.requireApprovalBeforeTenantDocumentAcceptance),
      documentExpiryReminders: asBool(req.body.documentExpiryReminders, settings.documents.documentExpiryReminders),
      watermarkDocuments: asBool(req.body.watermarkDocuments, settings.documents.watermarkDocuments),
      preventDocumentDownloadByTenant: asBool(req.body.preventDocumentDownloadByTenant, settings.documents.preventDocumentDownloadByTenant),
      encryptSensitiveDocuments: asBool(req.body.encryptSensitiveDocuments, settings.documents.encryptSensitiveDocuments),
      sendExpiryReminderBeforeDays: asNumber(req.body.sendExpiryReminderBeforeDays, settings.documents.sendExpiryReminderBeforeDays, 1, 365)
    };
    await settings.save();
    return res.json({ success: true, message: 'Document settings saved', documents: settings.documents });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Failed to save document settings' });
  }
};

const saveSecurity = async (req, res) => {
  try {
    const settings = await ensureSettings(req);
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    settings.security = {
      ...settings.security,
      twoFactorEnabled: asBool(req.body.twoFactorEnabled, settings.security.twoFactorEnabled),
      sessionTimeoutMinutes: asNumber(req.body.sessionTimeoutMinutes, settings.security.sessionTimeoutMinutes, 5, 1440)
    };
    user.twoFactorEnabled = settings.security.twoFactorEnabled;

    await Promise.all([settings.save(), user.save()]);
    return res.json({ success: true, message: 'Security settings saved', security: settings.security });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Failed to save security settings' });
  }
};

const savePreferences = async (req, res) => {
  try {
    const settings = await ensureSettings(req);
    settings.preferences = {
      ...settings.preferences,
      language: asText(req.body.language, settings.preferences.language || 'English'),
      theme: ['light', 'dark', 'system'].includes(asText(req.body.theme).toLowerCase()) ? asText(req.body.theme).toLowerCase() : settings.preferences.theme,
      dateFormat: asText(req.body.dateFormat, settings.preferences.dateFormat || 'DD/MM/YYYY'),
      timeFormat: ['12h', '24h'].includes(asText(req.body.timeFormat)) ? asText(req.body.timeFormat) : settings.preferences.timeFormat,
      currency: asText(req.body.currency, settings.preferences.currency || 'UGX'),
      currencyFormat: asText(req.body.currencyFormat, settings.preferences.currencyFormat || 'UGX 1,234'),
      defaultDashboardView: asText(req.body.defaultDashboardView, settings.preferences.defaultDashboardView || 'Overview'),
      rowsPerPage: asNumber(req.body.rowsPerPage, settings.preferences.rowsPerPage, 5, 200),
      compactTableView: asBool(req.body.compactTableView, settings.preferences.compactTableView),
      enableKeyboardShortcuts: asBool(req.body.enableKeyboardShortcuts, settings.preferences.enableKeyboardShortcuts),
      country: asText(req.body.country, settings.preferences.country || 'Uganda')
    };
    await settings.save();
    return res.json({ success: true, message: 'Preferences saved', preferences: settings.preferences });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Failed to save preferences' });
  }
};

const updatePassword = async (req, res) => {
  try {
    const currentPassword = asText(req.body.currentPassword, '');
    const newPassword = asText(req.body.newPassword, '');
    const confirmNewPassword = asText(req.body.confirmNewPassword, '');
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ success: false, message: 'Current password, new password, and confirmation are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ success: false, message: 'Password confirmation does not match.' });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    const validCurrent = await user.comparePassword(currentPassword);
    if (!validCurrent) return res.status(400).json({ success: false, message: 'Current password is incorrect.' });

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();
    return res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message || 'Failed to update password' });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const confirmation = asText(req.body.confirmation, '');
    if (confirmation !== 'DELETE') {
      return res.status(400).json({ success: false, message: 'Please send confirmation as DELETE to continue.' });
    }

    await User.updateOne({ _id: req.user._id }, { $set: { isActive: false, deletedAt: new Date() } });
    return res.json({ success: true, message: 'Account deactivated successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to deactivate account' });
  }
};

const getTabData = async (req, res) => {
  try {
    const tab = asText(req.params.tab).toLowerCase();
    const settings = await ensureSettings(req);
    const safeSettings = toSafeSettings(settings, req);
    const map = {
      profile: safeSettings.profile,
      business: safeSettings.business,
      payments: safeSettings.payments,
      receipts: safeSettings.receiptsInvoices,
      notifications: safeSettings.notifications,
      'rent-lease': safeSettings.rentLease,
      documents: safeSettings.documents,
      security: safeSettings.security,
      subscription: safeSettings.subscriptionSnapshot,
      preferences: safeSettings.preferences
    };
    if (!map[tab]) return res.status(404).json({ success: false, message: 'Unknown settings tab' });
    return res.json({ success: true, tab, data: map[tab] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to load settings tab' });
  }
};

module.exports = {
  getSettings,
  getTabData,
  saveProfile,
  saveBusiness,
  savePayments,
  saveReceipts,
  saveNotifications,
  saveRentLease,
  saveDocuments,
  saveSecurity,
  savePreferences,
  updatePassword,
  deleteAccount
};
