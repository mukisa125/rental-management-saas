const mongoose = require('mongoose');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');
const Maintenance = require('../models/Maintenance');
const Document = require('../models/Document');
const Unit = require('../models/Unit');
const Property = require('../models/Property');
const Notification = require('../models/Notification');
const SelfOwnerSettings = require('../models/SelfOwnerSettings');
const User = require('../models/User');
const Company = require('../models/Company');
const { refreshOverduePayments } = require('../services/paymentTrackingService');

const PROFILE_NOT_LINKED = 'Your tenant profile is not linked yet. Please contact your landlord.';

const getCompanyId = (req) => req.company?._id || req.user.company;
const parseBool = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;
  return Boolean(value);
};

const safeText = (value, fallback = '') => {
  const text = String(value || '').trim();
  if (!text || ['undefined', 'null', 'nan'].includes(text.toLowerCase())) return fallback;
  return text;
};

const safeNumber = (value) => Number(value) || 0;
const tenantQuery = (req) => ({ user: req.user._id, company: getCompanyId(req), deletedAt: null });

const getTenantProfile = async (req, populate = false) => {
  const query = Tenant.findOne(tenantQuery(req));
  if (populate) {
    query
      .populate('property')
      .populate('unit')
      .populate('owner', 'name email phone avatar companyName');
  }
  return query;
};

const requireTenantProfile = async (req, res, populate = false) => {
  const tenant = await getTenantProfile(req, populate);
  if (!tenant) {
    res.status(404).json({ message: PROFILE_NOT_LINKED });
    return null;
  }
  return tenant;
};

const tenantDataScope = (tenant) => ({
  company: tenant.company,
  owner: tenant.owner?._id || tenant.owner,
  property: tenant.property?._id || tenant.property,
  unit: tenant.unit?._id || tenant.unit,
  tenant: tenant._id,
  deletedAt: null
});

const ownerIdOf = (tenant) => tenant.owner?._id || tenant.owner;
const propertyIdOf = (tenant) => tenant.property?._id || tenant.property;
const unitIdOf = (tenant) => tenant.unit?._id || tenant.unit;

const getOwnerSettings = async (tenant) => {
  if (!tenant?.owner || !tenant?.company) return null;
  return SelfOwnerSettings
    .findOne({ ownerId: ownerIdOf(tenant), company: tenant.company })
    .select('documents notifications receiptsInvoices business payments profile');
};

const buildPaymentTemplate = ({ settings, owner }) => {
  const business = settings?.business || {};
  const receipts = settings?.receiptsInvoices || {};
  const businessName = safeText(business.businessName, safeText(owner?.name, 'RentSaaS'));
  return {
    businessName,
    businessLogo: safeText(business.logo, ''),
    businessAddress: safeText(business.address, ''),
    businessPhone: safeText(business.phone, safeText(owner?.phone, '')),
    businessEmail: safeText(business.email, safeText(owner?.email, '')),
    receiptHeaderName: safeText(receipts.receiptHeaderName, 'Rent Receipt'),
    receiptPrefix: safeText(receipts.receiptPrefix, 'RCPT'),
    invoicePrefix: safeText(receipts.invoicePrefix, 'INV'),
    receiptFooterMessage: safeText(receipts.receiptFooterMessage, 'Thank you for your payment.'),
    showQrVerificationCode: Boolean(receipts.showQrVerificationCode),
    showOwnerContactOnReceipt: receipts.showOwnerContactOnReceipt !== false,
    showBalanceOnReceipt: receipts.showBalanceOnReceipt !== false,
    showTenantBalance: receipts.showTenantBalance !== false,
    showPaymentInstructions: receipts.showPaymentInstructions !== false
  };
};

const createInAppNotification = async ({ company, user, title, message, type = 'maintenance_update', relatedEntity, actionUrl, priority = 'medium' }) => {
  if (!company || !user || !title || !message) return;
  try {
    await Notification.create({
      company,
      user,
      title,
      message,
      type,
      relatedEntity,
      actionUrl,
      priority
    });
  } catch (notificationError) {
    console.error('Failed to create notification:', notificationError.message);
  }
};

const addMonths = (date, months) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
};

const deriveNextDueDate = (tenant, upcomingPayment) => {
  if (upcomingPayment?.dueDate) return upcomingPayment.dueDate;
  const day = new Date(tenant.leaseStart || Date.now()).getDate() || 1;
  const today = new Date();
  const candidate = new Date(today.getFullYear(), today.getMonth(), Math.min(day, 28));
  return candidate >= today ? candidate : addMonths(candidate, 1);
};

const daysBetween = (from, to) => {
  const end = new Date(to);
  if (!to || Number.isNaN(end.getTime())) return 0;
  return Math.ceil((end.getTime() - new Date(from).getTime()) / 86400000);
};

const paymentAmountPaid = (payment) => {
  const status = String(payment.status || '').toLowerCase();
  if (status === 'paid' || status === 'partial') return safeNumber(payment.amountPaid || payment.amount);
  return safeNumber(payment.amountPaid);
};

const maintenanceCategory = (issueType) => {
  const allowed = new Set(['plumbing', 'electrical', 'painting', 'cleaning', 'other']);
  return allowed.has(issueType) ? issueType : 'other';
};

const getScopedPayments = (tenant, extraFilter = {}) => Payment.find({
  ...tenantDataScope(tenant),
  ...extraFilter
});

const getTenantPaymentSummary = (payments) => {
  const totalPaid = payments.reduce((sum, payment) => sum + paymentAmountPaid(payment), 0);
  const pending = payments
    .filter((payment) => payment.status === 'pending')
    .reduce((sum, payment) => sum + Math.max(0, safeNumber(payment.amount) - safeNumber(payment.amountPaid)), 0);
  const overdue = payments
    .filter((payment) => payment.status === 'overdue')
    .reduce((sum, payment) => sum + Math.max(0, safeNumber(payment.amount) - safeNumber(payment.amountPaid)), 0);
  const lastPayment = payments
    .filter((payment) => ['paid', 'partial'].includes(String(payment.status || '').toLowerCase()))
    .sort((a, b) => new Date(b.paidDate || b.paymentDate || b.createdAt || 0) - new Date(a.paidDate || a.paymentDate || a.createdAt || 0))[0] || null;

  return {
    totalPaid,
    pending,
    overdue,
    outstandingBalance: pending + overdue,
    numberOfPayments: payments.length,
    lastPayment
  };
};

const buildNoticeFilter = (tenant, req) => ({
  company: tenant.company,
  deletedAt: null,
  $or: [
    { user: req.user._id },
    { 'metadata.tenant': tenant._id },
    { 'metadata.tenantId': tenant._id },
    { 'metadata.tenantId': String(tenant._id) },
    { 'metadata.unit': unitIdOf(tenant) },
    { 'metadata.unitId': unitIdOf(tenant) },
    { 'metadata.unitId': String(unitIdOf(tenant)) },
    { 'metadata.property': propertyIdOf(tenant) },
    { 'metadata.propertyId': propertyIdOf(tenant) },
    { 'metadata.propertyId': String(propertyIdOf(tenant)) }
  ]
});

const documentAccessFilter = (tenant, extra = {}) => ({
  company: tenant.company,
  owner: ownerIdOf(tenant),
  tenant: tenant._id,
  isVisible: true,
  deletedAt: null,
  ...extra,
  $or: [
    { visibleToTenant: true },
    { accessLevel: 'tenant' },
    { documentType: { $in: ['lease', 'invoice', 'receipt', 'notice', 'attachment', 'tenant_doc'] } },
    { category: { $in: ['Lease Agreements', 'Payment Receipts', 'Tenant Documents', 'System Generated'] } }
  ]
});

const validObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const formatActivityDate = (value) => value || new Date();

const getTenantDashboardSummary = async (req, res) => {
  try {
    const tenant = await requireTenantProfile(req, res, true);
    if (!tenant) return;

    const [ownerSettings, company] = await Promise.all([
      getOwnerSettings(tenant),
      Company.findById(tenant.company).select('companyName phone').lean()
    ]);
    const ownerFallbackId = ownerIdOf(tenant) || tenant.property?.owner;
    const owner = tenant.owner?._id
      ? tenant.owner
      : ownerFallbackId
        ? await User.findById(ownerFallbackId).select('name email phone companyName').lean()
        : null;
    const property = tenant.property?._id
      ? tenant.property
      : await Property.findOne({
          _id: propertyIdOf(tenant),
          company: tenant.company,
          deletedAt: null
        }).select('name owner').lean();
    const unit = tenant.unit?._id
      ? tenant.unit
      : await Unit.findOne({
          _id: unitIdOf(tenant),
          company: tenant.company,
          deletedAt: null
        }).select('unitNumber rentAmount').lean();

    const scope = tenantDataScope(tenant);
    // Refresh overdue status before reading payments so the dashboard is accurate
    await refreshOverduePayments(scope);
    const payments = await getScopedPayments(tenant).sort({ dueDate: -1, createdAt: -1 }).limit(50);
    const paymentSummary = getTenantPaymentSummary(payments);
    const upcomingPayment = payments
      .filter((payment) => ['pending', 'overdue'].includes(String(payment.status || '').toLowerCase()))
      .sort((a, b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0))[0] || null;
    const openMaintenanceRequests = await Maintenance.countDocuments({
      ...scope,
      status: { $nin: ['completed', 'cancelled', 'rejected'] }
    });
    const recentMaintenance = await Maintenance.find(scope).sort({ createdAt: -1 }).limit(3);
    const recentDocuments = await Document.find(documentAccessFilter(tenant)).sort({ createdAt: -1 }).limit(3);
    const recentNotices = await Notification.find(buildNoticeFilter(tenant, req)).sort({ createdAt: -1 }).limit(5);
    const nextDueDate = deriveNextDueDate(tenant, upcomingPayment);
    const latestPayment = paymentSummary.lastPayment;
    const outstandingBalance = Math.max(paymentSummary.outstandingBalance, safeNumber(tenant.outstandingBalance));
    const defaultPaymentMethod = safeText(ownerSettings?.payments?.defaultMethod, 'cash');
    const paymentMethod = latestPayment?.paymentMethod || upcomingPayment?.paymentMethod || defaultPaymentMethod;
    const paymentStatus = outstandingBalance > 0 ? 'pending' : 'up_to_date';
    const ownerObject = owner?.toObject ? owner.toObject() : (owner || {});
    const profileSettings = ownerSettings?.profile || {};
    const businessSettings = ownerSettings?.business || {};
    const notificationsSettings = ownerSettings?.notifications || {};
    const ownerCompanyName = safeText(ownerObject.companyName, safeText(company?.companyName, 'RentSaaS'));
    const ownerName = safeText(profileSettings.fullName, safeText(ownerObject.name, ''));
    const ownerEmail = safeText(profileSettings.email, safeText(businessSettings.email, safeText(ownerObject.email, '')));
    const ownerPhone = safeText(
      profileSettings.phone,
      safeText(
        profileSettings.whatsappNumber,
        safeText(
          businessSettings.phone,
          safeText(businessSettings.whatsappNumber, safeText(notificationsSettings.whatsappNumber, safeText(ownerObject.phone, safeText(company?.phone, ''))))
        )
      )
    );

    const activities = [
      ...(latestPayment ? [{
        type: 'payment',
        title: 'Payment received',
        description: `${safeText(latestPayment.receiptNumber, 'Receipt')} - ${safeNumber(latestPayment.amountPaid || latestPayment.amount) ? `UGX ${safeNumber(latestPayment.amountPaid || latestPayment.amount).toLocaleString('en-US')}` : 'Payment recorded'}`,
        date: formatActivityDate(latestPayment.paidDate || latestPayment.paymentDate || latestPayment.createdAt)
      }] : []),
      ...recentMaintenance.map((item) => ({
        type: 'maintenance',
        title: 'Maintenance request created',
        description: safeText(item.issue || item.description, 'Maintenance request'),
        date: formatActivityDate(item.submittedDate || item.createdAt)
      })),
      ...recentDocuments.map((item) => ({
        type: 'document',
        title: 'Document uploaded',
        description: safeText(item.title || item.fileName, 'Tenant document'),
        date: formatActivityDate(item.createdAt)
      })),
      ...recentNotices.map((item) => ({
        type: 'notice',
        title: safeText(item.title, 'Notice received'),
        description: safeText(item.message, 'Important landlord notice'),
        date: formatActivityDate(item.createdAt)
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

    res.json({
      tenant,
      property,
      unit,
      owner: owner ? {
        ...ownerObject,
        name: ownerName || ownerObject.name,
        email: ownerEmail || ownerObject.email,
        phone: ownerPhone || ownerObject.phone,
        companyName: ownerCompanyName
      } : { companyName: ownerCompanyName, phone: ownerPhone },
      currentRent: safeNumber(tenant.rentAmount || unit?.rentAmount),
      monthlyRent: safeNumber(tenant.rentAmount || unit?.rentAmount),
      nextDueDate,
      outstandingBalance,
      activeMaintenanceRequests: openMaintenanceRequests,
      openMaintenanceRequests,
      daysRemainingOnLease: daysBetween(new Date(), tenant.leaseEnd),
      leaseStartDate: tenant.leaseStart,
      leaseEndDate: tenant.leaseEnd,
      paymentDay: `Day ${new Date(nextDueDate).getDate()} of each month`,
      totalPaid: paymentSummary.totalPaid,
      totalPending: paymentSummary.pending,
      totalOverdue: paymentSummary.overdue,
      lastPayment: latestPayment,
      paymentMethod,
      paymentStatus,
      propertyName: safeText(property?.name, ''),
      unitNumber: safeText(unit?.unitNumber, ''),
      ownerName,
      ownerEmail,
      ownerPhone,
      ownerCompanyName,
      recentActivity: activities
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTenantRentalInfo = async (req, res) => {
  try {
    const tenant = await requireTenantProfile(req, res, true);
    if (!tenant) return;
    const ownerSettings = await getOwnerSettings(tenant);
    const profileSettings = ownerSettings?.profile || {};
    const businessSettings = ownerSettings?.business || {};

    const [property, unit, upcomingPayment, payments, company, ownerUser] = await Promise.all([
      Property.findOne({
        _id: propertyIdOf(tenant),
        company: tenant.company,
        owner: ownerIdOf(tenant),
        deletedAt: null
      }),
      Unit.findOne({
        _id: unitIdOf(tenant),
        company: tenant.company,
        owner: ownerIdOf(tenant),
        property: propertyIdOf(tenant),
        deletedAt: null
      }),
      Payment.findOne({
        ...tenantDataScope(tenant),
        status: { $in: ['pending', 'overdue'] }
      }).sort({ dueDate: 1 }),
      getScopedPayments(tenant),
      Company.findById(tenant.company).select('companyName phone').lean(),
      User.findById(ownerIdOf(tenant)).select('name email phone companyName').lean()
    ]);

    const paymentSummary = getTenantPaymentSummary(payments);
    const owner = tenant.owner?.toObject ? tenant.owner.toObject() : (tenant.owner || {});
    const ownerPhone = safeText(
      profileSettings.phone,
      safeText(
        profileSettings.whatsappNumber,
        safeText(
          businessSettings.phone,
          safeText(businessSettings.whatsappNumber, safeText(ownerSettings?.notifications?.whatsappNumber, safeText(owner.phone, safeText(ownerUser?.phone, safeText(company?.phone, '')))))
        )
      )
    );
    const ownerEmail = safeText(profileSettings.email, safeText(businessSettings.email, safeText(owner.email, safeText(ownerUser?.email, ''))));
    const ownerName = safeText(profileSettings.fullName, safeText(owner.name, safeText(ownerUser?.name, '')));

    res.json({
      ...tenant.toObject(),
      tenant,
      property,
      unit,
      owner: {
        ...owner,
        name: ownerName || owner.name,
        email: ownerEmail || owner.email,
        phone: ownerPhone || owner.phone,
        companyName: safeText(owner.companyName, safeText(ownerUser?.companyName, safeText(company?.companyName, '')))
      },
      propertyRulesNotice: safeText(ownerSettings?.notifications?.propertyRulesNotice, ''),
      upcomingPayment,
      outstandingBalance: paymentSummary.outstandingBalance,
      nextDueDate: deriveNextDueDate(tenant, upcomingPayment)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTenantPaymentHistory = async (req, res) => {
  try {
    const tenant = await requireTenantProfile(req, res);
    if (!tenant) return;

    // Refresh overdue status before returning payment history
    await refreshOverduePayments(tenantDataScope(tenant));

    const { status, paymentMethod, search } = req.query;
    const filter = {};
    if (status && status !== 'all') filter.status = status;
    if (paymentMethod && paymentMethod !== 'all') filter.paymentMethod = paymentMethod;
    if (search) {
      filter.$or = [
        { receiptNumber: new RegExp(search, 'i') },
        { paymentReference: new RegExp(search, 'i') },
        { paymentFor: new RegExp(search, 'i') }
      ];
    }

    const payments = await getScopedPayments(tenant, filter)
      .populate('unit', 'unitNumber')
      .populate('property', 'name')
      .sort({ dueDate: -1, createdAt: -1 });

    const ownerSettings = await getOwnerSettings(tenant);
    const owner = await User.findById(ownerIdOf(tenant)).select('name email phone');
    const template = buildPaymentTemplate({ settings: ownerSettings, owner });
    res.json({ payments, summary: getTenantPaymentSummary(payments), template });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTenantPaymentDetail = async (req, res) => {
  try {
    const tenant = await requireTenantProfile(req, res);
    if (!tenant) return;
    if (!validObjectId(req.params.id)) return res.status(404).json({ message: 'Payment not found' });

    const payment = await Payment.findOne({ _id: req.params.id, ...tenantDataScope(tenant) })
      .populate('unit', 'unitNumber')
      .populate('property', 'name');

    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    return res.json(payment);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getTenantMaintenanceRequests = async (req, res) => {
  try {
    const tenant = await requireTenantProfile(req, res);
    if (!tenant) return;

    const { status } = req.query;
    const filter = {};
    if (status && status !== 'all') {
      filter.status = status === 'open'
        ? { $in: ['pending', 'submitted', 'approved', 'assigned'] }
        : status === 'in_progress'
          ? { $in: ['in_progress', 'on_hold'] }
          : status;
    }

    const requests = await Maintenance.find({ ...tenantDataScope(tenant), ...filter })
      .populate('property', 'name')
      .populate('unit', 'unitNumber')
      .populate('assignedTo', 'name email')
      .populate('comments.author', 'name fullName email')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createMaintenanceRequest = async (req, res) => {
  try {
    const { issueType, priority, description, issueImages, contactPhone, availableTime } = req.body;
    const tenant = await requireTenantProfile(req, res);
    if (!tenant) return;

    const ownerSettings = await getOwnerSettings(tenant);
    const docsSettings = ownerSettings?.documents || {};
    const notificationsSettings = ownerSettings?.notifications || {};
    if (Array.isArray(issueImages) && issueImages.length > 3) {
      return res.status(400).json({ message: 'Maximum 3 images are allowed per maintenance request' });
    }
    if (Array.isArray(issueImages) && issueImages.length > 0 && !parseBool(docsSettings.allowTenantMaintenanceImageUploads, true)) {
      return res.status(403).json({ message: 'Maintenance image uploads are disabled by landlord settings.' });
    }

    const cleanImages = Array.isArray(issueImages)
      ? issueImages.slice(0, 3).map((image) => ({
        base64: safeText(image.base64),
        contentType: safeText(image.contentType, 'image/jpeg'),
        originalName: safeText(image.originalName, 'issue-image'),
        size: safeNumber(image.size),
        uploadedBy: req.user._id
      }))
      : [];

    const issueText = safeText(description, 'Maintenance request');
    const maintenance = new Maintenance({
      tenant: tenant._id,
      property: propertyIdOf(tenant),
      unit: unitIdOf(tenant),
      owner: ownerIdOf(tenant),
      company: tenant.company,
      issueType: issueType || 'other',
      category: maintenanceCategory(issueType || 'other'),
      priority: priority || 'medium',
      description: issueText,
      issue: issueText.slice(0, 80),
      issueImages: cleanImages,
      contactPhone: safeText(contactPhone),
      availableTime: safeText(availableTime),
      source: 'tenant_portal',
      status: 'pending',
      tenantNotes: issueText
    });

    await maintenance.save();
    await maintenance.populate([
      { path: 'tenant', select: 'fullName phone email' },
      { path: 'property', select: 'name' },
      { path: 'unit', select: 'unitNumber' }
    ]);

    if (parseBool(notificationsSettings.inAppNotifications, true) && parseBool(notificationsSettings.maintenanceRequestAlerts, true)) {
      await createInAppNotification({
        company: tenant.company,
        user: ownerIdOf(tenant),
        title: 'New maintenance request',
        message: `${tenant.fullName} submitted a maintenance request for unit ${maintenance.unit?.unitNumber || ''}`.trim(),
        type: 'maintenance_request',
        relatedEntity: { entityType: 'maintenance', entityId: maintenance._id },
        actionUrl: '/self-owner/maintenance',
        priority: priority === 'urgent' ? 'high' : 'medium'
      });
    }

    return res.status(201).json(maintenance);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getMaintenanceRequestDetail = async (req, res) => {
  try {
    const { maintenanceId } = req.params;
    const tenant = await requireTenantProfile(req, res);
    if (!tenant) return;
    if (!validObjectId(maintenanceId)) return res.status(404).json({ message: 'Maintenance request not found' });

    const maintenance = await Maintenance.findOne({ _id: maintenanceId, ...tenantDataScope(tenant) })
      .populate('tenant', 'fullName email phone')
      .populate('property', 'name address location')
      .populate('unit', 'unitNumber')
      .populate('assignedTo', 'name email phone')
      .populate('comments.author', 'name email');

    if (!maintenance) return res.status(404).json({ message: 'Maintenance request not found' });
    return res.json(maintenance);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const addMaintenanceComment = async (req, res) => {
  try {
    const { maintenanceId } = req.params;
    const { comment } = req.body;
    const tenant = await requireTenantProfile(req, res);
    if (!tenant) return;
    if (!validObjectId(maintenanceId)) return res.status(404).json({ message: 'Maintenance request not found' });

    const maintenance = await Maintenance.findOne({ _id: maintenanceId, ...tenantDataScope(tenant) });
    if (!maintenance) return res.status(404).json({ message: 'Maintenance request not found' });

    maintenance.comments.push({ author: req.user._id, comment: safeText(comment) });
    await maintenance.save();

    const ownerSettings = await getOwnerSettings(tenant);
    const notificationSettings = ownerSettings?.notifications || {};
    if (parseBool(notificationSettings.inAppNotifications, true) && parseBool(notificationSettings.maintenanceRequestAlerts, true)) {
      await createInAppNotification({
        company: maintenance.company,
        user: maintenance.owner,
        title: 'New tenant comment',
        message: `A tenant added a comment on maintenance request ${maintenance.requestId}`,
        type: 'maintenance_update',
        relatedEntity: { entityType: 'maintenance', entityId: maintenance._id },
        actionUrl: '/self-owner/maintenance',
        priority: 'medium'
      });
    }

    const updatedMaintenance = await Maintenance.findOne({ _id: maintenanceId, ...tenantDataScope(tenant) })
      .populate('tenant', 'fullName email phone')
      .populate('property', 'name')
      .populate('unit', 'unitNumber')
      .populate('comments.author', 'name fullName email');
    return res.json(updatedMaintenance);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const cancelMaintenanceRequest = async (req, res) => {
  try {
    const tenant = await requireTenantProfile(req, res);
    if (!tenant) return;
    if (!validObjectId(req.params.maintenanceId)) return res.status(404).json({ message: 'Maintenance request not found' });

    const maintenance = await Maintenance.findOne({
      _id: req.params.maintenanceId,
      ...tenantDataScope(tenant),
      status: { $in: ['pending', 'submitted', 'approved'] }
    });

    if (!maintenance) return res.status(404).json({ message: 'Maintenance request not found or cannot be cancelled' });
    maintenance.status = 'cancelled';
    await maintenance.save();
    return res.json(maintenance);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getTenantDocuments = async (req, res) => {
  try {
    const tenant = await requireTenantProfile(req, res);
    if (!tenant) return;

    const ownerSettings = await getOwnerSettings(tenant);
    const docsSettings = ownerSettings?.documents || {};
    if (!parseBool(docsSettings.showDocumentsToTenant, true)) return res.json([]);

    const documents = await Document.find(documentAccessFilter(tenant))
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 });

    const canDownload = !parseBool(docsSettings.preventDocumentDownloadByTenant, false);
    res.json(documents.map((doc) => ({ ...doc.toObject(), canDownload })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTenantDocumentDetail = async (req, res) => {
  try {
    const tenant = await requireTenantProfile(req, res);
    if (!tenant) return;
    if (!validObjectId(req.params.id)) return res.status(404).json({ message: 'Document not found' });

    const document = await Document.findOne(documentAccessFilter(tenant, { _id: req.params.id })).populate('uploadedBy', 'name');
    if (!document) return res.status(404).json({ message: 'Document not found' });
    return res.json(document);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const downloadTenantDocument = async (req, res) => {
  try {
    const tenant = await requireTenantProfile(req, res);
    if (!tenant) return;

    const ownerSettings = await getOwnerSettings(tenant);
    const docsSettings = ownerSettings?.documents || {};
    if (!parseBool(docsSettings.showDocumentsToTenant, true)) {
      return res.status(403).json({ message: 'Document access is disabled by landlord settings.' });
    }
    if (parseBool(docsSettings.preventDocumentDownloadByTenant, false)) {
      return res.status(403).json({ message: 'Document download is disabled by landlord settings.' });
    }
    if (!validObjectId(req.params.id)) return res.status(404).json({ message: 'Document not found' });

    const document = await Document.findOne(documentAccessFilter(tenant, { _id: req.params.id }));
    if (!document) return res.status(404).json({ message: 'Document not found' });

    const binary = document.fileData && document.fileData.length
      ? document.fileData
      : document.fileBase64
        ? Buffer.from(document.fileBase64, 'base64')
        : null;

    if (binary) {
      res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${document.fileName || 'document'}"`);
      return res.send(binary);
    }

    if (document.fileUrl) return res.json({ fileUrl: document.fileUrl });
    return res.status(404).json({ message: 'Document content not found' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getTenantNotices = async (req, res) => {
  try {
    const tenant = await requireTenantProfile(req, res);
    if (!tenant) return;

    const { category, status, search } = req.query;
    const filter = buildNoticeFilter(tenant, req);
    if (status === 'read') filter.isRead = true;
    if (status === 'new' || status === 'unread') filter.isRead = false;
    if (category && category !== 'all') filter.type = category;
    if (search) {
      filter.$and = [{ $or: filter.$or }, {
        $or: [
          { title: new RegExp(search, 'i') },
          { message: new RegExp(search, 'i') }
        ]
      }];
      delete filter.$or;
    }

    const notices = await Notification.find(filter).sort({ createdAt: -1 }).limit(200);
    const deduped = [];
    const seenKeys = new Set();
    notices.forEach((notice) => {
      const documentId = String(notice?.metadata?.documentId || notice?.relatedEntity?.entityId || '').trim();
      const fallbackKey = [
        String(notice.user || ''),
        String(notice.type || ''),
        String(notice.title || '').trim().toLowerCase(),
        String(notice.message || '').trim().toLowerCase()
      ].join('|');
      const key = documentId ? `doc:${documentId}` : `msg:${fallbackKey}`;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);
      deduped.push(notice);
    });
    return res.json(deduped.slice(0, 100));
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const markTenantNoticeRead = async (req, res) => {
  try {
    const tenant = await requireTenantProfile(req, res);
    if (!tenant) return;
    if (!validObjectId(req.params.id)) return res.status(404).json({ message: 'Notice not found' });

    const notice = await Notification.findOneAndUpdate(
      { _id: req.params.id, ...buildNoticeFilter(tenant, req) },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!notice) return res.status(404).json({ message: 'Notice not found' });
    return res.json(notice);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const deleteTenantNotice = async (req, res) => {
  try {
    const tenant = await requireTenantProfile(req, res);
    if (!tenant) return;
    if (!validObjectId(req.params.id)) return res.status(404).json({ message: 'Notice not found' });

    const notice = await Notification.findOneAndUpdate(
      { _id: req.params.id, ...buildNoticeFilter(tenant, req) },
      { deletedAt: new Date(), isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!notice) return res.status(404).json({ message: 'Notice not found' });
    return res.json({ success: true, message: 'Notice deleted' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getTenantProfileDetails = async (req, res) => {
  try {
    const tenant = await requireTenantProfile(req, res, true);
    if (!tenant) return;
    const user = await User.findById(req.user._id).select('-password');
    return res.json({ user, tenant });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateTenantProfileDetails = async (req, res) => {
  try {
    const tenant = await requireTenantProfile(req, res);
    if (!tenant) return;

    const { fullName, name, email, phone, whatsAppNumber, avatar, idNumber, emergencyContact, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (newPassword) {
      if (!currentPassword || !(await user.comparePassword(currentPassword))) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }
      user.password = newPassword;
      user.passwordChangedAt = new Date();
    }

    if (name !== undefined || fullName !== undefined) {
      user.name = safeText(name || fullName, user.name);
      tenant.fullName = safeText(fullName || name, tenant.fullName);
    }
    if (email !== undefined) {
      user.email = safeText(email, user.email).toLowerCase();
      tenant.email = safeText(email, tenant.email).toLowerCase();
    }
    if (phone !== undefined) {
      user.phone = safeText(phone);
      tenant.phone = safeText(phone, tenant.phone);
    }
    if (whatsAppNumber !== undefined) user.whatsAppNumber = safeText(whatsAppNumber);
    if (avatar !== undefined) user.avatar = safeText(avatar);
    if (idNumber !== undefined) tenant.idNumber = safeText(idNumber, tenant.idNumber);
    if (emergencyContact && typeof emergencyContact === 'object') {
      tenant.emergencyContact = {
        ...tenant.emergencyContact,
        name: safeText(emergencyContact.name, tenant.emergencyContact?.name),
        phone: safeText(emergencyContact.phone, tenant.emergencyContact?.phone),
        relationship: safeText(emergencyContact.relationship, tenant.emergencyContact?.relationship),
        email: safeText(emergencyContact.email, tenant.emergencyContact?.email)
      };
    }

    await Promise.all([user.save(), tenant.save()]);
    const refreshedUser = await User.findById(req.user._id).select('-password');
    const refreshedTenant = await Tenant.findById(tenant._id)
      .populate('property')
      .populate('unit')
      .populate('owner', 'name email phone avatar companyName');
    return res.json({ user: refreshedUser, tenant: refreshedTenant, message: 'Profile updated successfully' });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const getTenantSettings = async (req, res) => {
  try {
    const tenant = await requireTenantProfile(req, res);
    if (!tenant) return;
    const user = await User.findById(req.user._id).select('notificationPreferences tenantSettings');
    return res.json({
      notificationPreferences: user?.notificationPreferences || {},
      tenantSettings: user?.tenantSettings || {}
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const updateTenantSettings = async (req, res) => {
  try {
    const tenant = await requireTenantProfile(req, res);
    if (!tenant) return;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (req.body.notificationPreferences) {
      user.notificationPreferences = {
        ...user.notificationPreferences,
        ...req.body.notificationPreferences
      };
    }
    if (req.body.tenantSettings) {
      user.tenantSettings = {
        ...user.tenantSettings,
        ...req.body.tenantSettings,
        paymentReminders: {
          ...user.tenantSettings?.paymentReminders,
          ...req.body.tenantSettings.paymentReminders,
          channels: {
            ...user.tenantSettings?.paymentReminders?.channels,
            ...req.body.tenantSettings.paymentReminders?.channels
          }
        }
      };
    }

    await user.save();
    return res.json({
      notificationPreferences: user.notificationPreferences,
      tenantSettings: user.tenantSettings,
      message: 'Settings saved successfully'
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTenantDashboardSummary,
  getTenantRentalInfo,
  getTenantPaymentHistory,
  getTenantPaymentDetail,
  getTenantMaintenanceRequests,
  createMaintenanceRequest,
  getMaintenanceRequestDetail,
  addMaintenanceComment,
  cancelMaintenanceRequest,
  getTenantDocuments,
  getTenantDocumentDetail,
  downloadTenantDocument,
  getTenantNotices,
  markTenantNoticeRead,
  deleteTenantNotice,
  getTenantProfileDetails,
  updateTenantProfileDetails,
  getTenantSettings,
  updateTenantSettings
};
