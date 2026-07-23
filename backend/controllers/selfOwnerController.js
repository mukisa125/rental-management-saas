const Property = require('../models/Property');
const Unit = require('../models/Unit');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');
const Maintenance = require('../models/Maintenance');
const Document = require('../models/Document');
const User = require('../models/User');
const Notification = require('../models/Notification');
const SelfOwnerSettings = require('../models/SelfOwnerSettings');
const {
  createDocumentRecord,
  generatePaymentReceiptDocument,
  generateMonthlyAssessmentDocument,
  generateMaintenanceApprovalDocument,
  generateMaintenanceCompletionDocument,
  generateTenantProfileDocument,
  registerTenantAttachmentDocuments,
  generatePropertyProfileDocument,
  registerPropertyImageDocuments,
  generateUnitProfileDocument,
  generateReportExportDocument,
  listOwnerDocuments,
  getOwnerDocumentById,
  softDeleteOwnerDocument
} = require('../services/documentService');
const { sendPaymentReceiptMessage } = require('../services/whatsappService');

const getCompanyId = (req) => req.company?._id || req.user.company;
const ownerScope = (req, extra = {}) => {
  const baseScope = {
    company: getCompanyId(req),
    deletedAt: null,
    ...extra
  };
  
  // For self_owner role, filter by owner. For manager role, no owner filter (see all)
  if (req.user.role === 'self_owner') {
    return { ...baseScope, owner: req.user._id };
  }
  
  return baseScope;
};

const documentOwnerContext = (req) => {
  const context = {
    company: getCompanyId(req),
    uploadedBy: req.user._id,
    generatedBy: req.user._id
  };
  
  // For self_owner role, set owner. For manager role, no owner context needed
  if (req.user.role === 'self_owner') {
    context.owner = req.user._id;
  }
  
  return context;
};

const queueDocumentTask = (task) => {
  Promise.resolve()
    .then(task)
    .catch((error) => {
      console.error('Automatic document generation failed:', error.message);
    });
};

const getOwnerSettings = async (req) => {
  if (!req?.user || req.user.role !== 'self_owner') return null;
  if (req._ownerSettings !== undefined) return req._ownerSettings;
  req._ownerSettings = await SelfOwnerSettings.findOne({
    company: getCompanyId(req),
    ownerId: req.user._id
  }).select('documents payments receiptsInvoices rentLease notifications');
  return req._ownerSettings;
};

const shouldGenerateDocument = async (req, key, fallback = true) => {
  const settings = await getOwnerSettings(req);
  if (!settings) return fallback;
  const value = settings?.documents?.[key];
  return value === undefined ? fallback : Boolean(value);
};

const getPublicApiBaseUrl = (req) => {
  const configured = cleanString(process.env.PUBLIC_API_URL || process.env.BACKEND_PUBLIC_URL || '', 500);
  if (configured) return configured.replace(/\/+$/, '');
  return `${req.protocol}://${req.get('host')}/api`;
};

const shouldSendWhatsappReceipt = (req, payment, previousStatus) => {
  if (parseBool(req.body.sendWhatsappReceipt, true) === false) return false;
  if (!payment || payment.status !== 'paid') return false;
  return previousStatus !== 'paid';
};

const sendClearedRentWhatsappReceipt = async (req, payment, previousStatus) => {
  const tenant = payment?.tenant || {};
  const recipient = cleanString(
    req.body.whatsappRecipient || tenant.whatsappNumber || tenant.whatsAppNumber || tenant.phone || '',
    40
  );

  if (!shouldSendWhatsappReceipt(req, payment, previousStatus)) {
    return {
      sent: false,
      skipped: true,
      status: 'skipped',
      recipient,
      message: 'WhatsApp receipt was not requested for this payment.'
    };
  }

  try {
    const receiptNumber = cleanString(payment.receiptNumber || 'receipt', 120);
    const receiptUrl = `${getPublicApiBaseUrl(req)}/self-owner/payments/verify/${encodeURIComponent(receiptNumber)}`;
    const result = await sendPaymentReceiptMessage({ payment, to: recipient, receiptUrl });
    return {
      sent: true,
      skipped: false,
      status: 'sent',
      recipient,
      message: 'WhatsApp receipt sent to tenant.',
      messageId: result?.messages?.[0]?.id || result?.body?.messages?.[0]?.id || null
    };
  } catch (error) {
    console.error('Automatic WhatsApp receipt failed:', error.message);
    return {
      sent: false,
      skipped: false,
      status: 'failed',
      recipient,
      message: `Payment saved, but WhatsApp receipt was not sent: ${error.message}`,
      errorCode: error.meta?.code || null,
      errorDetails: error.meta?.details || null,
      traceId: error.meta?.traceId || null
    };
  }
};

const paymentMethodAlias = {
  cash: 'cash',
  mtn_mobile_money: 'mtn_mobile_money',
  mtnmobilemoney: 'mtn_mobile_money',
  mtnMobileMoney: 'mtn_mobile_money',
  airtel_money: 'airtel_money',
  airtelmoney: 'airtel_money',
  airtelMoney: 'airtel_money',
  bank_transfer: 'bank_transfer',
  banktransfer: 'bank_transfer',
  bankTransfer: 'bank_transfer',
  card: 'card',
  cardonlinepayment: 'card',
  cardOnlinePayment: 'card',
  online: 'online',
  mobile_money: 'mobile_money',
  mobilemoney: 'mobile_money',
  other: 'other'
};

const normalizePaymentMethod = (value, fallback = 'cash') => {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  return paymentMethodAlias[raw] || paymentMethodAlias[raw.toLowerCase()] || raw.toLowerCase();
};

const getEnabledPaymentMethods = async (req) => {
  const settings = await getOwnerSettings(req);
  if (!settings?.payments) return null;
  const enabled = new Set();
  if (settings.payments.cash?.enabled) enabled.add('cash');
  if (settings.payments.mtnMobileMoney?.enabled) enabled.add('mtn_mobile_money');
  if (settings.payments.airtelMoney?.enabled) enabled.add('airtel_money');
  if (settings.payments.bankTransfer?.enabled) enabled.add('bank_transfer');
  if (settings.payments.cardOnlinePayment?.enabled) {
    enabled.add('card');
    enabled.add('online');
  }
  if (!enabled.size) enabled.add('cash');
  return enabled;
};

const getDefaultPaymentMethod = async (req, fallback = 'cash') => {
  const settings = await getOwnerSettings(req);
  const normalized = normalizePaymentMethod(settings?.payments?.defaultMethod, fallback);
  return normalized;
};

const DOC_MIME_TO_FILE_TYPE = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
};

const allowedDocumentMimeTypes = new Set(Object.keys(DOC_MIME_TO_FILE_TYPE));

const cleanString = (value, max = 300) => String(value || '').trim().slice(0, max);
const parseBool = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const text = String(value).toLowerCase();
  return ['true', '1', 'yes', 'on'].includes(text);
};
const parseDate = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};
const parseNumberOrNull = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};
const normalizeCompressedImages = (images = [], max = 3, fieldLabel = 'image') => {
  if (!Array.isArray(images) || images.length > max) {
    throw new Error(`A ${fieldLabel} list can have up to ${max} images.`);
  }
  return images.map((image) => {
    const contentType = String(image?.contentType || '').trim().toLowerCase();
    const base64 = String(image?.base64 || '').trim();
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType) || !base64 || base64.length > 400000) {
      throw new Error(`Each compressed ${fieldLabel} must be a JPG, PNG, or WebP under 300KB.`);
    }
    return {
      base64,
      contentType,
      originalName: String(image?.originalName || `${fieldLabel}`),
      size: Number(image?.size) || 0,
      isMain: Boolean(image?.isMain)
    };
  });
};
const normalizeTenantAttachment = (attachment, documentType) => {
  if (!attachment) return null;
  const contentType = String(attachment.contentType || '').trim().toLowerCase();
  const base64 = String(attachment.base64 || '').trim();
  if (!base64 || base64.length > 420000 || !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(contentType)) {
    throw new Error('Attachments must be JPG, PNG, WEBP, or PDF files under 300KB.');
  }
  return {
    base64,
    contentType,
    originalName: String(attachment.originalName || documentType).trim(),
    size: Number(attachment.size) || 0,
    documentType,
    uploadedAt: new Date()
  };
};
const escapeRegexQuery = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildDocumentQuery = (req) => {
  const query = ownerScope(req);

  const category = cleanString(req.query.category || '');
  const status = cleanString(req.query.status || '');
  const sourceModule = cleanString(req.query.sourceModule || '');
  const documentType = cleanString(req.query.documentType || req.query.type || '');
  const property = cleanString(req.query.property || req.query.propertyId || '');
  const tenant = cleanString(req.query.tenant || req.query.tenantId || '');
  const unit = cleanString(req.query.unit || req.query.unitId || '');
  const search = cleanString(req.query.search || '', 120);

  if (category) query.category = category;
  if (status) query.status = status;
  if (sourceModule) query.sourceModule = sourceModule;
  if (documentType) query.documentType = documentType;
  if (property) query.property = property;
  if (tenant) query.tenant = tenant;
  if (unit) query.unit = unit;

  const startDate = parseDate(req.query.startDate);
  const endDate = parseDate(req.query.endDate);
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) {
      endDate.setHours(23, 59, 59, 999);
      query.createdAt.$lte = endDate;
    }
  }

  if (search) {
    const pattern = new RegExp(escapeRegexQuery(search), 'i');
    query.$or = [
      { title: pattern },
      { documentName: pattern },
      { fileName: pattern },
      { sourceAction: pattern },
      { reportId: pattern }
    ];
  }

  return query;
};

const resolveDocumentRelations = async (req, payload) => {
  const propertyId = payload.property || payload.propertyId;
  const tenantId = payload.tenant || payload.tenantId;
  const unitId = payload.unit || payload.unitId;

  const [property, tenant, unit] = await Promise.all([
    propertyId ? ownedProperty(req, propertyId) : null,
    tenantId ? ownedTenant(req, tenantId) : null,
    unitId ? Unit.findOne(ownerScope(req, { _id: unitId })) : null
  ]);

  if (propertyId && !property) throw new Error('Property not found');
  if (tenantId && !tenant) throw new Error('Tenant not found');
  if (unitId && !unit) throw new Error('Unit not found');

  if (tenant && property && String(tenant.property) !== String(property._id)) {
    throw new Error('Tenant and property mismatch.');
  }

  if (tenant && unit && String(tenant.unit) !== String(unit._id)) {
    throw new Error('Tenant and unit mismatch.');
  }

  if (unit && property && String(unit.property) !== String(property._id)) {
    throw new Error('Unit does not belong to selected property.');
  }

  return { property, tenant, unit };
};

const pagination = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 25));
  return { page, limit, skip: (page - 1) * limit };
};

const paged = async (Model, filter, query, populate, sort = { createdAt: -1 }) => {
  const { page, limit, skip } = pagination(query);
  const [items, total] = await Promise.all([
    Model.find(filter).populate(populate).sort(sort).skip(skip).limit(limit),
    Model.countDocuments(filter)
  ]);
  return { items, pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } };
};

const ownedProperty = (req, id) => Property.findOne(ownerScope(req, { _id: id }));
const ownedTenant = (req, id) => Tenant.findOne(ownerScope(req, { _id: id }));

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

const refreshPropertyIncome = async (req, propertyId) => {
  const units = await Unit.find(ownerScope(req, { property: propertyId })).select('rentAmount status currentTenant');
  const property = await ownedProperty(req, propertyId);
  if (!property) return;
  property.totalUnits = units.length;
  property.occupiedUnits = units.filter((unit) => unit.status === 'occupied' || Boolean(unit.currentTenant)).length;
  property.vacantUnits = Math.max(0, property.totalUnits - property.occupiedUnits);
  property.occupancyRate = property.totalUnits ? Math.round((property.occupiedUnits / property.totalUnits) * 100) : 0;
  property.monthlyIncome = units.reduce((total, unit) => total + (Number(unit.rentAmount) || 0), 0);
  property.annualIncome = property.monthlyIncome * 12;
  await property.save();
};

const getDashboard = async (req, res) => {
  try {
    const scope = ownerScope(req);
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const [properties, units, tenants, monthPayments, maintenance, upcomingPayments] = await Promise.all([
      Property.find(scope).sort({ createdAt: -1 }),
      Unit.find(scope),
      Tenant.find(scope).sort({ createdAt: -1 }),
      Payment.find({ ...scope, status: 'paid', paidDate: { $gte: startOfMonth } }).sort({ paidDate: -1 }),
      Maintenance.find(scope).populate('tenant', 'fullName').populate('unit', 'unitNumber').sort({ createdAt: -1 }),
      Payment.find({ ...scope, status: { $in: ['pending', 'partial', 'overdue'] } }).populate('tenant', 'fullName').populate('unit', 'unitNumber').sort({ dueDate: 1 }).limit(5)
    ]);
    const occupiedUnits = units.filter((unit) => unit.status === 'occupied').length;
    const collectedThisMonth = monthPayments.reduce((total, payment) => total + (payment.amountPaid || payment.amount || 0), 0);
    const expectedRent = tenants.filter((tenant) => tenant.status === 'active').reduce((total, tenant) => total + (tenant.rentAmount || 0), 0);
    const pendingRent = upcomingPayments.reduce((total, payment) => total + Math.max(0, (payment.amount || 0) - (payment.amountPaid || 0)), 0);

    res.json({
      success: true,
      kpis: {
        totalProperties: properties.length,
        totalUnits: units.length,
        occupiedUnits,
        vacantUnits: units.filter((unit) => unit.status === 'vacant').length,
        totalTenants: tenants.filter((tenant) => tenant.status === 'active').length,
        monthlyRent: expectedRent,
        collectedThisMonth,
        pendingRent,
        overdueRent: upcomingPayments.filter((payment) => payment.status === 'overdue').reduce((total, payment) => total + Math.max(0, payment.amount - payment.amountPaid), 0),
        occupancyRate: units.length ? Math.round((occupiedUnits / units.length) * 100) : 0,
        openMaintenanceRequests: maintenance.filter((item) => !['completed', 'cancelled'].includes(item.status)).length,
        expiringLeases: tenants.filter((tenant) => tenant.leaseEnd && new Date(tenant.leaseEnd) < new Date(Date.now() + 30 * 86400000)).length
      },
      charts: { rentCollection: monthPayments.map((payment) => ({ date: payment.paidDate, amount: payment.amountPaid || payment.amount || 0 })) },
      recentActivity: {
        recentTenants: tenants.slice(0, 5),
        recentPayments: monthPayments.slice(0, 5),
        recentMaintenance: maintenance.slice(0, 5),
        upcomingPayments
      }
    });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const getProperties = async (req, res) => {
  try {
    const filter = ownerScope(req, req.query.status ? { status: req.query.status } : {});
    const result = await paged(Property, filter, req.query, '', { createdAt: -1 });
    const propertyIds = result.items.map((property) => property._id);
    if (propertyIds.length) {
      const unitStats = await Unit.aggregate([
        { $match: ownerScope(req, { property: { $in: propertyIds } }) },
        {
          $group: {
            _id: '$property',
            monthlyIncome: { $sum: '$rentAmount' },
            totalUnits: { $sum: 1 },
            occupiedUnits: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ['$status', 'occupied'] },
                      { $ne: ['$currentTenant', null] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);
      const totalsByProperty = new Map(unitStats.map((stats) => [stats._id.toString(), stats]));
      result.items = result.items.map((property) => {
        const stats = totalsByProperty.get(property._id.toString()) || {};
        const totalUnits = Number(stats.totalUnits) || 0;
        const occupiedUnits = Number(stats.occupiedUnits) || 0;
        const vacantUnits = Math.max(0, totalUnits - occupiedUnits);
        const expectedMonthlyRent = Number(stats.monthlyIncome) || 0;
        return {
          ...property.toObject(),
          totalUnits,
          occupiedUnits,
          vacantUnits,
          occupancyRate: totalUnits ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
          monthlyIncome: expectedMonthlyRent,
          expectedMonthlyRent
        };
      });
    }
    res.json({ success: true, properties: result.items, pagination: result.pagination });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const createProperty = async (req, res) => {
  try {
    const {
      name,
      location,
      address,
      propertyType,
      description,
      amenities,
      propertyImages = [],
      units = [],
      generalArea,
      googleMapsLocation,
      formattedAddress,
      placeId,
      latitude,
      longitude,
      locationVisibility,
      publishToMarketplace,
      showOnMap,
      exactLocationLocked,
      allowVisitBooking,
      allowContactReveal
    } = req.body;
    const duplicate = await Property.findOne(ownerScope(req, { name: new RegExp(`^${String(name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }));
    if (duplicate) return res.status(409).json({ success: false, message: 'You already have a property with this name.' });
    if (!Array.isArray(units)) return res.status(400).json({ success: false, message: 'Units must be provided as a list.' });
    const images = normalizeCompressedImages(propertyImages, 3, 'property image');
    const normalizedUnits = units.map((unit) => {
      if (!unit.unitNumber || !Number.isFinite(Number(unit.rentAmount)) || Number(unit.rentAmount) < 0) throw new Error('Each unit needs a number and valid monthly rent.');
      const unitImages = normalizeCompressedImages(unit.images || [], 3, 'unit image').map((image, index) => ({
        ...image,
        isMain: image.isMain || index === 0
      }));
      return {
        unitNumber: unit.unitNumber,
        rentAmount: Number(unit.rentAmount),
        depositAmount: Number(unit.depositAmount) || 0,
        description: String(unit.description || '').trim(),
        bedrooms: Number(unit.bedrooms) || 1,
        bathrooms: Number(unit.bathrooms) || 1,
        status: ['vacant', 'maintenance'].includes(unit.status) ? unit.status : 'vacant',
        images: unitImages
      };
    });
    const monthlyIncome = normalizedUnits.reduce((total, unit) => total + unit.rentAmount, 0);
    const property = await Property.create({
      ...ownerScope(req),
      name,
      location,
      address: {
        ...(address || {}),
        formattedAddress: cleanString(address?.formattedAddress || formattedAddress, 300),
        placeId: cleanString(address?.placeId || placeId, 160),
        gps: {
          latitude: parseNumberOrNull(latitude) ?? address?.gps?.latitude ?? null,
          longitude: parseNumberOrNull(longitude) ?? address?.gps?.longitude ?? null
        }
      },
      propertyType,
      description,
      amenities,
      generalArea: cleanString(generalArea, 180),
      googleMapsLocation: cleanString(googleMapsLocation, 500),
      formattedAddress: cleanString(formattedAddress || address?.formattedAddress, 300),
      placeId: cleanString(placeId || address?.placeId, 160),
      latitude: parseNumberOrNull(latitude),
      longitude: parseNumberOrNull(longitude),
      locationVisibility: ['public', 'tenants_only', 'private'].includes(String(locationVisibility || '').toLowerCase())
        ? String(locationVisibility).toLowerCase()
        : 'public',
      publishToMarketplace: publishToMarketplace !== false,
      showOnMap: showOnMap !== false,
      exactLocationLocked: exactLocationLocked !== false,
      allowVisitBooking: allowVisitBooking !== false,
      allowContactReveal: allowContactReveal !== false,
      propertyImages: images,
      totalUnits: normalizedUnits.length,
      occupiedUnits: 0,
      monthlyIncome,
      annualIncome: monthlyIncome * 12
    });
    if (normalizedUnits.length) await Unit.insertMany(normalizedUnits.map((unit) => ({ ...unit, ...ownerScope(req), property: property._id })));

    if (await shouldGenerateDocument(req, 'autoGeneratePropertyProfileDocuments', true)) {
      queueDocumentTask(async () => {
        const ownerContext = documentOwnerContext(req);
        await generatePropertyProfileDocument({ ownerContext, property });
        if (Array.isArray(property.propertyImages) && property.propertyImages.length) {
          await registerPropertyImageDocuments({ ownerContext, property, propertyImages: property.propertyImages });
        }
      });
    }

    res.status(201).json({ success: true, property });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const updateProperty = async (req, res) => {
  try {
    const property = await ownedProperty(req, req.params.id);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
    if (req.body.name && req.body.name.trim().toLowerCase() !== property.name.toLowerCase()) {
      const duplicate = await Property.findOne(ownerScope(req, { _id: { $ne: property._id }, name: new RegExp(`^${String(req.body.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }));
      if (duplicate) return res.status(409).json({ success: false, message: 'You already have a property with this name.' });
    }
    ['name', 'location', 'propertyType', 'status', 'description', 'amenities', 'generalArea', 'googleMapsLocation', 'formattedAddress', 'placeId'].forEach((field) => {
      if (req.body[field] !== undefined) property[field] = req.body[field];
    });
    ['publishToMarketplace', 'showOnMap', 'exactLocationLocked', 'allowVisitBooking', 'allowContactReveal'].forEach((field) => {
      if (req.body[field] !== undefined) property[field] = Boolean(req.body[field]);
    });
    if (req.body.locationVisibility !== undefined) {
      const value = String(req.body.locationVisibility || '').toLowerCase();
      property.locationVisibility = ['public', 'tenants_only', 'private'].includes(value) ? value : property.locationVisibility;
    }
    if (req.body.latitude !== undefined) property.latitude = parseNumberOrNull(req.body.latitude);
    if (req.body.longitude !== undefined) property.longitude = parseNumberOrNull(req.body.longitude);
    if (req.body.address !== undefined) {
      property.address = {
        ...(req.body.address || {}),
        formattedAddress: cleanString(req.body.address?.formattedAddress || req.body.formattedAddress, 300),
        placeId: cleanString(req.body.address?.placeId || req.body.placeId, 160),
        gps: {
          latitude: parseNumberOrNull(req.body.latitude) ?? req.body.address?.gps?.latitude ?? property.address?.gps?.latitude ?? null,
          longitude: parseNumberOrNull(req.body.longitude) ?? req.body.address?.gps?.longitude ?? property.address?.gps?.longitude ?? null
        }
      };
    }
    if (req.body.propertyImages !== undefined) {
      property.propertyImages = normalizeCompressedImages(req.body.propertyImages, 3, 'property image');
    }
    await property.save();
    res.json({ success: true, property });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const deleteProperty = async (req, res) => {
  try {
    const property = await ownedProperty(req, req.params.id);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
    const occupied = await Unit.countDocuments(ownerScope(req, {
      property: property._id,
      $or: [{ status: 'occupied' }, { currentTenant: { $ne: null } }]
    }));
    if (occupied) return res.status(409).json({ success: false, message: 'Move tenants before removing this property' });
    await Unit.updateMany(ownerScope(req, { property: property._id }), { $set: { deletedAt: new Date() } });
    property.deletedAt = new Date();
    await property.save();
    res.json({ success: true });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const getUnits = async (req, res) => {
  try {
    const extra = {};
    if (req.query.property) extra.property = req.query.property;
    if (req.query.status) extra.status = req.query.status;
    const result = await paged(Unit, ownerScope(req, extra), req.query, [{ path: 'property', select: 'name location' }, { path: 'currentTenant', select: 'fullName email' }], { unitNumber: 1 });
    res.json({ success: true, units: result.items, pagination: result.pagination });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const createUnit = async (req, res) => {
  try {
    const property = await ownedProperty(req, req.body.property);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
    const unitNumber = String(req.body.unitNumber || '').trim();
    if (!unitNumber) return res.status(400).json({ success: false, message: 'Unit number is required.' });
    const existingUnit = await Unit.findOne(ownerScope(req, {
      property: property._id,
      unitNumber
    }));
    if (existingUnit) return res.status(409).json({ success: false, message: 'A unit with this number already exists in this property.' });
    const unitImages = normalizeCompressedImages(req.body.images || [], 3, 'unit image').map((image, index) => ({
      ...image,
      isMain: image.isMain || index === 0
    }));
    const unit = await Unit.create({
      ...ownerScope(req),
      property: property._id,
      unitNumber,
      rentAmount: req.body.rentAmount,
      depositAmount: req.body.depositAmount || 0,
      description: String(req.body.description || '').trim(),
      bedrooms: req.body.bedrooms || 1,
      bathrooms: req.body.bathrooms || 1,
      area: req.body.area,
      status: req.body.status || 'vacant',
      images: unitImages
    });
    await refreshPropertyIncome(req, property._id);

    if (await shouldGenerateDocument(req, 'autoGenerateUnitProfileDocuments', true)) {
      queueDocumentTask(() => generateUnitProfileDocument({ ownerContext: documentOwnerContext(req), unit, property }));
    }

    res.status(201).json({ success: true, unit });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const updateUnit = async (req, res) => {
  try {
    const unit = await Unit.findOne(ownerScope(req, { _id: req.params.id }));
    if (!unit) return res.status(404).json({ success: false, message: 'Unit not found' });
    const originalPropertyId = String(unit.property);
    if (req.body.property && String(req.body.property) !== originalPropertyId) {
      if (unit.status === 'occupied' || unit.currentTenant) {
        return res.status(409).json({ success: false, message: 'Cannot move an occupied unit to another property.' });
      }
      const targetProperty = await ownedProperty(req, req.body.property);
      if (!targetProperty) return res.status(404).json({ success: false, message: 'Target property not found' });
      unit.property = targetProperty._id;
    }
    if (req.body.unitNumber !== undefined) {
      const duplicate = await Unit.findOne(ownerScope(req, {
        _id: { $ne: unit._id },
        property: unit.property,
        unitNumber: String(req.body.unitNumber).trim()
      }));
      if (duplicate) return res.status(409).json({ success: false, message: 'A unit with this number already exists in this property.' });
    }
    const nextStatus = req.body.status ?? unit.status;
    if (unit.currentTenant && nextStatus !== 'occupied') {
      return res.status(409).json({ success: false, message: 'This unit still has an allocated tenant. Move or remove the tenant first.' });
    }
    ['unitNumber', 'rentAmount', 'depositAmount', 'description', 'bedrooms', 'bathrooms', 'area', 'status'].forEach((field) => {
      if (req.body[field] === undefined) return;
      if (field === 'description') {
        unit[field] = String(req.body[field]).trim();
        return;
      }
      if (field === 'unitNumber') {
        unit[field] = String(req.body[field]).trim();
        return;
      }
      unit[field] = req.body[field];
    });
    if (req.body.images !== undefined) {
      unit.images = normalizeCompressedImages(req.body.images, 3, 'unit image').map((image, index) => ({
        ...image,
        isMain: image.isMain || index === 0
      }));
    }
    await unit.save();
    await refreshPropertyIncome(req, unit.property);
    if (String(unit.property) !== originalPropertyId) {
      await refreshPropertyIncome(req, originalPropertyId);
    }
    res.json({ success: true, unit });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const deleteUnit = async (req, res) => {
  try {
    const unit = await Unit.findOne(ownerScope(req, { _id: req.params.id }));
    if (!unit) return res.status(404).json({ success: false, message: 'Unit not found' });
    if (unit.status === 'occupied') return res.status(409).json({ success: false, message: 'Move the tenant before deleting this occupied unit.' });
    unit.deletedAt = new Date();
    await unit.save();
    await refreshPropertyIncome(req, unit.property);
    res.json({ success: true });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const getPropertyUnits = async (req, res) => {
  const property = await ownedProperty(req, req.params.propertyId);
  if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
  req.query.property = property._id.toString();
  return getUnits(req, res);
};

const getTenants = async (req, res) => {
  try {
    const extra = req.query.status ? { status: req.query.status } : {};
    const result = await paged(Tenant, ownerScope(req, extra), req.query, [
      { path: 'property', select: 'name' },
      { path: 'unit', select: 'unitNumber rentAmount' },
      { path: 'user', select: 'name email isActive' }
    ]);
    res.json({ success: true, tenants: result.items, pagination: result.pagination });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const createTenant = async (req, res) => {
  try {
    const property = await ownedProperty(req, req.body.property);
    const unit = await Unit.findOne(ownerScope(req, { _id: req.body.unit, property: req.body.property }));
    if (!property || !unit) return res.status(404).json({ success: false, message: 'Property or unit not found' });
    if (unit.status === 'occupied' || unit.currentTenant) return res.status(409).json({ success: false, message: 'Unit is already assigned to a tenant.' });
    const required = ['fullName', 'phone', 'idNumber', 'leaseStart', 'leaseEnd', 'rentAmount'];
    if (required.some((field) => !req.body[field])) return res.status(400).json({ success: false, message: 'Complete all required tenant and lease fields.' });
    if (new Date(req.body.leaseEnd) <= new Date(req.body.leaseStart)) return res.status(400).json({ success: false, message: 'Lease end date must be after the start date.' });
    const photo = req.body.photo ? normalizeTenantAttachment(req.body.photo, 'photo') : undefined;
    const identityAttachments = [
      normalizeTenantAttachment(req.body.attachments?.national_id_front, 'national_id_front'),
      normalizeTenantAttachment(req.body.attachments?.national_id_back, 'national_id_back'),
      normalizeTenantAttachment(req.body.attachments?.lc_letter, 'lc_letter')
    ].filter(Boolean);
    let account;
    if (req.body.createAccount) {
      const accountEmail = String(req.body.accountEmail || '').trim().toLowerCase();
      if (!accountEmail || !req.body.accountPassword || req.body.accountPassword.length < 6) return res.status(400).json({ success: false, message: 'Tenant account email and a password of at least six characters are required.' });
      if (await User.findOne({ email: accountEmail, deletedAt: null })) return res.status(409).json({ success: false, message: 'An account already exists with this email address.' });
      account = await User.create({ name: req.body.fullName, email: accountEmail, password: req.body.accountPassword, role: 'tenant', company: getCompanyId(req), isActive: true });
    }
    const ownerSettings = await getOwnerSettings(req);
    const rentLease = ownerSettings?.rentLease || {};
    const depositFromSettings = Number(rentLease.securityDepositValue || 0);
    const tenant = await Tenant.create({
      ...ownerScope(req),
      user: account?._id,
      fullName: req.body.fullName,
      email: req.body.email || req.body.accountEmail || undefined,
      phone: req.body.phone,
      idNumber: req.body.idNumber,
      gender: req.body.gender || undefined,
      dateOfBirth: req.body.dateOfBirth || undefined,
      occupation: req.body.occupation,
      emergencyContact: { name: req.body.emergencyContactName, phone: req.body.emergencyContactPhone },
      notes: req.body.notes,
      photo,
      identityAttachments,
      property: property._id,
      unit: unit._id,
      leaseStart: req.body.leaseStart,
      leaseEnd: req.body.leaseEnd,
      rentAmount: req.body.rentAmount || unit.rentAmount,
      securityDeposit: req.body.securityDeposit || (rentLease.securityDepositRequired ? depositFromSettings : 0),
      status: 'active'
    });
    const allocatedUnit = await Unit.findOneAndUpdate(
      ownerScope(req, { _id: unit._id, property: property._id, status: { $ne: 'occupied' }, currentTenant: null }),
      { $set: { status: 'occupied', currentTenant: tenant._id, leaseStartDate: tenant.leaseStart, leaseEndDate: tenant.leaseEnd } },
      { new: true }
    );
    if (!allocatedUnit) {
      await Promise.allSettled([Tenant.deleteOne(ownerScope(req, { _id: tenant._id })), account ? User.deleteOne({ _id: account._id }) : Promise.resolve()]);
      return res.status(409).json({ success: false, message: 'This unit has just been assigned to another tenant. Choose another vacant unit.' });
    }
    const previousOccupiedUnits = property.occupiedUnits;
    property.occupiedUnits += 1;
    try {
      await property.save();
    } catch (allocationError) {
      property.occupiedUnits = previousOccupiedUnits;
      await Promise.allSettled([
        Unit.updateOne(ownerScope(req, { _id: allocatedUnit._id, currentTenant: tenant._id }), { $set: { status: 'vacant' }, $unset: { currentTenant: 1, leaseStartDate: 1, leaseEndDate: 1 } }),
        property.save(),
        Tenant.deleteOne(ownerScope(req, { _id: tenant._id })),
        account ? User.deleteOne({ _id: account._id }) : Promise.resolve()
      ]);
      throw allocationError;
    }

    if (await shouldGenerateDocument(req, 'autoGenerateTenantProfileDocuments', true)) {
      queueDocumentTask(async () => {
        const ownerContext = documentOwnerContext(req);
        await generateTenantProfileDocument({ ownerContext, tenant, property, unit: allocatedUnit });

        const attachmentList = [];
        if (tenant.photo?.base64 && tenant.photo?.contentType) {
          attachmentList.push({ ...tenant.photo, documentType: 'photo' });
        }
        if (Array.isArray(tenant.identityAttachments)) {
          attachmentList.push(...tenant.identityAttachments);
        }

        if (attachmentList.length) {
          await registerTenantAttachmentDocuments({ ownerContext, tenant, property, unit: allocatedUnit, attachments: attachmentList });
        }
      });
    }

    res.status(201).json({ success: true, tenant });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const updateTenant = async (req, res) => {
  try {
    const tenant = await ownedTenant(req, req.params.id);
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });

    const nextLeaseStart = req.body.leaseStart !== undefined ? req.body.leaseStart : tenant.leaseStart;
    const nextLeaseEnd = req.body.leaseEnd !== undefined ? req.body.leaseEnd : tenant.leaseEnd;
    if (nextLeaseStart && nextLeaseEnd && new Date(nextLeaseEnd) <= new Date(nextLeaseStart)) {
      return res.status(400).json({ success: false, message: 'Lease end date must be after the start date.' });
    }

    [
      'fullName',
      'email',
      'phone',
      'idNumber',
      'occupation',
      'leaseStart',
      'leaseEnd',
      'rentAmount',
      'securityDeposit',
      'status',
      'notes'
    ].forEach((field) => {
      if (req.body[field] !== undefined) tenant[field] = req.body[field];
    });
    if (req.body.gender !== undefined) tenant.gender = req.body.gender || undefined;
    if (req.body.dateOfBirth !== undefined) tenant.dateOfBirth = req.body.dateOfBirth || undefined;
    if (req.body.emergencyContact !== undefined || req.body.emergencyContactName !== undefined || req.body.emergencyContactPhone !== undefined) {
      tenant.emergencyContact = {
        ...(tenant.emergencyContact?.toObject?.() || tenant.emergencyContact || {}),
        ...(req.body.emergencyContact || {}),
        name: req.body.emergencyContactName !== undefined ? req.body.emergencyContactName : tenant.emergencyContact?.name,
        phone: req.body.emergencyContactPhone !== undefined ? req.body.emergencyContactPhone : tenant.emergencyContact?.phone
      };
    }
    if (req.body.photo !== undefined) {
      tenant.photo = req.body.photo ? normalizeTenantAttachment(req.body.photo, 'photo') : undefined;
    }
    if (req.body.attachments !== undefined) {
      const existingAttachments = new Map((tenant.identityAttachments || []).map((attachment) => [attachment.documentType, attachment]));
      ['national_id_front', 'national_id_back', 'lc_letter'].forEach((documentType) => {
        if (!Object.prototype.hasOwnProperty.call(req.body.attachments || {}, documentType)) return;
        const attachment = req.body.attachments[documentType];
        if (attachment) existingAttachments.set(documentType, normalizeTenantAttachment(attachment, documentType));
        else existingAttachments.delete(documentType);
      });
      tenant.identityAttachments = Array.from(existingAttachments.values());
    }

    if (req.body.createAccount && !tenant.user) {
      const accountEmail = cleanString(req.body.accountEmail || req.body.email || tenant.email, 160).toLowerCase();
      if (!accountEmail || !req.body.accountPassword || req.body.accountPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'Tenant account email and a password of at least six characters are required.' });
      }
      if (await User.findOne({ email: accountEmail, deletedAt: null })) {
        return res.status(409).json({ success: false, message: 'An account already exists with this email address.' });
      }
      const account = await User.create({
        name: tenant.fullName,
        email: accountEmail,
        password: req.body.accountPassword,
        role: 'tenant',
        company: getCompanyId(req),
        isActive: true
      });
      tenant.user = account._id;
      tenant.email = tenant.email || accountEmail;
    }

    await tenant.save();
    if (tenant.user) {
      await User.updateOne(
        { _id: tenant.user, company: getCompanyId(req), deletedAt: null },
        { $set: { name: tenant.fullName, phone: tenant.phone } }
      );
    }
    await Unit.updateOne(
      ownerScope(req, { _id: tenant.unit, currentTenant: tenant._id }),
      { $set: { leaseStartDate: tenant.leaseStart, leaseEndDate: tenant.leaseEnd } }
    );
    res.json({ success: true, tenant });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const deleteTenant = async (req, res) => {
  try {
    const tenant = await ownedTenant(req, req.params.id);
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });
    const unit = await Unit.findOne(ownerScope(req, { _id: tenant.unit, currentTenant: tenant._id }));
    tenant.deletedAt = new Date();
    tenant.status = 'terminated';
    const changes = [tenant.save()];
    if (unit) {
      unit.status = 'vacant';
      unit.currentTenant = undefined;
      unit.leaseStartDate = undefined;
      unit.leaseEndDate = undefined;
      changes.push(unit.save());
      const property = await ownedProperty(req, tenant.property);
      if (property) { property.occupiedUnits = Math.max(0, (property.occupiedUnits || 0) - 1); changes.push(property.save()); }
    }
    if (tenant.user) changes.push(User.updateOne({ _id: tenant.user, company: getCompanyId(req) }, { $set: { isActive: false, deletedAt: new Date() } }));
    await Promise.all(changes);
    res.json({ success: true });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const PAYMENT_METHODS = new Set(['mtn_mobile_money', 'airtel_money', 'bank_transfer', 'cash', 'mobile_money', 'card', 'online', 'other']);
const RECEIPT_POPULATE = [
  { path: 'tenant', select: 'fullName email phone' },
  { path: 'property', select: 'name' },
  { path: 'unit', select: 'unitNumber rentAmount' },
  { path: 'receivedBy', select: 'name email phone companyName' }
];

const money = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const safeDate = (value, fallback = new Date()) => {
  const date = value ? new Date(value) : fallback;
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const paymentPeriodFromBillingMonth = (billingMonth, fallbackDate = new Date()) => {
  const value = String(billingMonth || '').trim();
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (year >= 2000 && month >= 1 && month <= 12) return { month, year };
  }
  const fallback = safeDate(fallbackDate, new Date());
  return { month: fallback.getMonth() + 1, year: fallback.getFullYear() };
};

const paymentForLabel = (paymentPeriod) => {
  if (!paymentPeriod?.month || !paymentPeriod?.year) return '';
  return `Rent for ${new Date(paymentPeriod.year, paymentPeriod.month - 1, 1).toLocaleDateString('en-UG', { month: 'long', year: 'numeric' })}`;
};

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const paymentStatus = (amountPaid, balance, requestedStatus) => {
  if (['failed', 'reversed'].includes(requestedStatus)) return requestedStatus;
  if (amountPaid <= 0) return 'pending';
  if (amountPaid >= balance) return 'paid';
  return 'partial';
};

const isAppliedPayment = (payment) => ['paid', 'partial'].includes(payment?.status);

const normalizeProof = (proof) => {
  if (!proof) return undefined;
  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);
  const contentType = String(proof.contentType || '');
  const base64 = String(proof.base64 || proof.data || '').replace(/^data:[^;]+;base64,/, '');
  const size = money(proof.size);
  if (!allowedTypes.has(contentType)) throw new Error('Proof must be a JPG, PNG, WEBP, or PDF file.');
  if (!base64 || base64.length > 2800000 || size > 2 * 1024 * 1024) throw new Error('Proof of payment must be 2MB or smaller.');
  return {
    base64,
    contentType,
    originalName: String(proof.originalName || 'proof-of-payment').slice(0, 180),
    size,
    uploadedAt: new Date()
  };
};

const createPaymentWithReceiptRetry = async (payload) => {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await Payment.create({ ...payload, receiptNumber: undefined });
    } catch (error) {
      lastError = error;
      if (error?.code !== 11000) throw error;
    }
  }
  throw lastError || new Error('Unable to generate a unique receipt number.');
};

const getPayments = async (req, res) => {
  try {
    const filter = ownerScope(req);
    if (req.query.status) filter.status = req.query.status;
    if (req.query.property) filter.property = req.query.property;
    if (req.query.paymentMethod) filter.paymentMethod = req.query.paymentMethod;
    if (req.query.startDate || req.query.endDate) {
      filter.paymentDate = {};
      if (req.query.startDate) filter.paymentDate.$gte = safeDate(req.query.startDate);
      if (req.query.endDate) {
        const end = safeDate(req.query.endDate);
        end.setHours(23, 59, 59, 999);
        filter.paymentDate.$lte = end;
      }
    }
    if (req.query.search) {
      const search = new RegExp(escapeRegex(req.query.search), 'i');
      const [tenants, properties] = await Promise.all([
        Tenant.find(ownerScope(req, { fullName: search })).select('_id'),
        Property.find(ownerScope(req, { name: search })).select('_id')
      ]);
      filter.$or = [
        { receiptNumber: search },
        { tenant: { $in: tenants.map((tenant) => tenant._id) } },
        { property: { $in: properties.map((property) => property._id) } }
      ];
    }
    const result = await paged(Payment, filter, req.query, RECEIPT_POPULATE, { paymentDate: -1, createdAt: -1 });
    // Proof data can be up to 2MB. It is intentionally loaded only for the
    // single payment/receipt view rather than every row in the history table.
    result.items = result.items.map((payment) => {
      const item = payment.toObject();
      delete item.proofOfPayment;
      return item;
    });
    res.json({ success: true, payments: result.items, pagination: result.pagination });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const getPaymentSummary = async (req, res) => {
  try {
    const scope = ownerScope(req);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const [payments, tenants] = await Promise.all([
      Payment.find(scope).select('amount amountPaid remainingBalance paymentMethod paymentDate paidDate status receiptNumber'),
      Tenant.find(ownerScope(req, { status: 'active' })).select('outstandingBalance')
    ]);
    const currentMonthPayments = payments.filter((payment) => safeDate(payment.paymentDate || payment.paidDate).getTime() >= monthStart.getTime());
    const applied = (payment) => isAppliedPayment(payment) ? money(payment.amountPaid || payment.amount) : 0;
    const collectedThisMonth = currentMonthPayments.reduce((total, payment) => total + applied(payment), 0);
    const mobileMoneyPayments = currentMonthPayments.filter((payment) => ['mtn_mobile_money', 'airtel_money', 'mobile_money'].includes(payment.paymentMethod));
    const bankPayments = currentMonthPayments.filter((payment) => payment.paymentMethod === 'bank_transfer');
    const allApplied = payments.filter(isAppliedPayment);
    
    // Invoice statistics
    const invoices = payments.filter(p => p.status !== 'cancelled');
    const paidInvoices = invoices.filter(p => p.status === 'paid');
    const unpaidInvoices = invoices.filter(p => p.status === 'pending');
    const partialInvoices = invoices.filter(p => p.status === 'partial');
    const overdueInvoices = invoices.filter(p => p.status === 'overdue' || (p.dueDate && new Date(p.dueDate) < new Date() && ['pending', 'partial'].includes(p.status)));
    
    const paidAmount = paidInvoices.reduce((total, p) => total + money(p.amount), 0);
    const unpaidAmount = unpaidInvoices.reduce((total, p) => total + (money(p.amount) - money(p.amountPaid)), 0);
    const partialAmount = partialInvoices.reduce((total, p) => total + (money(p.amount) - money(p.amountPaid)), 0);
    const overdueAmount = overdueInvoices.reduce((total, p) => total + (money(p.amount) - money(p.amountPaid)), 0);
    
    res.json({
      success: true,
      summary: {
        // Original fields
        totalCollectedThisMonth: collectedThisMonth,
        outstandingBalance: tenants.reduce((total, tenant) => total + money(tenant.outstandingBalance), 0),
        pendingPayments: payments.filter((payment) => payment.status === 'pending').length,
        overdueRent: payments.filter((payment) => payment.status === 'overdue').reduce((total, payment) => total + money(payment.remainingBalance || money(payment.amount) - money(payment.amountPaid)), 0),
        mobileMoneyPayments: mobileMoneyPayments.length,
        bankTransferPayments: bankPayments.length,
        collectedByMobileMoney: mobileMoneyPayments.reduce((total, payment) => total + applied(payment), 0),
        collectedByBank: bankPayments.reduce((total, payment) => total + applied(payment), 0),
        averagePayment: allApplied.length ? Math.round(allApplied.reduce((total, payment) => total + applied(payment), 0) / allApplied.length) : 0,
        receiptsGenerated: currentMonthPayments.filter((payment) => payment.receiptNumber).length,
        
        // Invoice statistics
        totalInvoiced: invoices.length,
        totalInvoicedThisMonth: currentMonthPayments.length,
        paidInvoices: paidInvoices.length,
        unpaidInvoices: unpaidInvoices.length,
        partialInvoices: partialInvoices.length,
        overdueInvoices: overdueInvoices.length,
        paidAmount,
        unpaidAmount,
        partialAmount,
        overdueAmount,
        outstandingBalance: unpaidAmount + partialAmount + overdueAmount
      }
    });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findOne(ownerScope(req, { _id: req.params.id })).populate(RECEIPT_POPULATE);
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    res.json({ success: true, payment });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const recordPayment = async (req, res) => {
  try {
    const tenant = await ownedTenant(req, req.body.tenantId);
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });
    const unit = await Unit.findOne(ownerScope(req, { _id: tenant.unit, property: tenant.property }));
    if (!unit) return res.status(400).json({ success: false, message: 'The selected tenant does not have an available unit.' });
    if ((req.body.propertyId && String(req.body.propertyId) !== String(tenant.property)) || (req.body.unitId && String(req.body.unitId) !== String(tenant.unit))) {
      return res.status(400).json({ success: false, message: 'Tenant, property, and unit must belong together.' });
    }
    const amountPaid = money(req.body.amountPaid ?? req.body.amount);
    if (!Number.isFinite(Number(req.body.amountPaid ?? req.body.amount)) || amountPaid < 0) return res.status(400).json({ success: false, message: 'Enter a valid payment amount.' });
    const enabledMethods = await getEnabledPaymentMethods(req);
    const defaultMethod = await getDefaultPaymentMethod(req, 'cash');
    const method = normalizePaymentMethod(req.body.paymentMethod || defaultMethod, defaultMethod);
    if (!PAYMENT_METHODS.has(method)) return res.status(400).json({ success: false, message: 'Choose a valid payment method.' });
    if (enabledMethods && !enabledMethods.has(method) && method !== 'mobile_money') {
      return res.status(400).json({ success: false, message: 'Selected payment method is disabled in settings.' });
    }
    const monthlyRent = money(req.body.monthlyRent) || money(tenant.rentAmount) || money(unit.rentAmount);
    const previousBalance = money(tenant.outstandingBalance) || monthlyRent;
    const status = paymentStatus(amountPaid, previousBalance, req.body.status);
    const appliedAmount = ['paid', 'partial'].includes(status) ? amountPaid : 0;
    const remainingBalance = Math.max(0, previousBalance - appliedAmount);
    const paymentDate = safeDate(req.body.paymentDate || req.body.dueDate);
    const proofOfPayment = normalizeProof(req.body.proofOfPayment);

    // Auto-generate paymentFor from the payment date when the caller omits it
    const rawPaymentFor = String(req.body.paymentFor || '').trim();
    const paymentFor = rawPaymentFor.slice(0, 60) ||
      paymentForLabel({ month: paymentDate.getMonth() + 1, year: paymentDate.getFullYear() });

    // Duplicate guard — block if a live payment for the same billing period exists
    if (paymentFor) {
      const duplicatePayment = await Payment.findOne({
        ...ownerScope(req),
        tenant: tenant._id,
        paymentFor: { $regex: new RegExp(`^${escapeRegex(paymentFor)}$`, 'i') },
        status: { $nin: ['cancelled', 'reversed', 'failed'] },
        deletedAt: null
      }).select('_id status').lean();
      if (duplicatePayment) {
        return res.status(409).json({
          success: false,
          message: `A payment for "${paymentFor}" already exists for this tenant.`,
          existingPaymentId: duplicatePayment._id
        });
      }
    }

    const payment = await createPaymentWithReceiptRetry({
      ...ownerScope(req), tenant: tenant._id, property: tenant.property, unit: tenant.unit,
      amount: previousBalance, amountPaid, monthlyRent, previousBalance, remainingBalance,
      paymentFor, paymentDate, dueDate: paymentDate,
      paidDate: appliedAmount > 0 ? paymentDate : undefined, paymentMethod: method,
      paymentReference: String(req.body.paymentReference || req.body.transactionId || '').trim().slice(0, 120),
      transactionId: String(req.body.paymentReference || req.body.transactionId || '').trim().slice(0, 120),
      proofOfPayment, status, notes: String(req.body.notes || '').trim().slice(0, 500),
      recordedBy: req.user._id, receivedBy: req.user._id
    });
    try {
      tenant.outstandingBalance = remainingBalance;
      tenant.totalPaidAmount = money(tenant.totalPaidAmount) + appliedAmount;
      await tenant.save();
    } catch (updateError) {
      await Payment.deleteOne(ownerScope(req, { _id: payment._id }));
      throw updateError;
    }
    await payment.populate(RECEIPT_POPULATE);

    if (await shouldGenerateDocument(req, 'autoGeneratePaymentReceipts', true)) {
      queueDocumentTask(() => generatePaymentReceiptDocument({
        ownerContext: documentOwnerContext(req),
        payment,
        tenant: payment.tenant,
        property: payment.property,
        unit: payment.unit
      }));
    }

    const whatsapp = await sendClearedRentWhatsappReceipt(req, payment);
    res.status(201).json({ success: true, payment, whatsapp });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const updatePayment = async (req, res) => {
  try {
    const payment = await Payment.findOne(ownerScope(req, { _id: req.params.id }));
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    const tenant = await ownedTenant(req, payment.tenant);
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });
    const amountPaid = req.body.amountPaid === undefined && req.body.amount === undefined ? money(payment.amountPaid) : money(req.body.amountPaid ?? req.body.amount);
    if (!Number.isFinite(Number(req.body.amountPaid ?? req.body.amount ?? payment.amountPaid)) || amountPaid < 0) return res.status(400).json({ success: false, message: 'Enter a valid payment amount.' });
    const previousBalance = money(req.body.previousBalance) || money(payment.previousBalance) || money(payment.amount);
    const enabledMethods = await getEnabledPaymentMethods(req);
    const method = normalizePaymentMethod(req.body.paymentMethod || payment.paymentMethod || 'cash', 'cash');
    if (!PAYMENT_METHODS.has(method)) return res.status(400).json({ success: false, message: 'Choose a valid payment method.' });
    if (enabledMethods && !enabledMethods.has(method) && method !== 'mobile_money') {
      return res.status(400).json({ success: false, message: 'Selected payment method is disabled in settings.' });
    }
    const previousStatus = payment.status;
    const oldApplied = isAppliedPayment(payment) ? money(payment.amountPaid) : 0;
    const status = paymentStatus(amountPaid, previousBalance, req.body.status || payment.status);
    const newApplied = ['paid', 'partial'].includes(status) ? amountPaid : 0;
    payment.amountPaid = amountPaid;
    payment.monthlyRent = money(req.body.monthlyRent) || money(payment.monthlyRent);
    payment.previousBalance = previousBalance;
    payment.remainingBalance = Math.max(0, previousBalance - newApplied);
    payment.amount = previousBalance;
    payment.status = status;
    payment.paymentDate = safeDate(req.body.paymentDate || payment.paymentDate || payment.paidDate);
    payment.paidDate = newApplied > 0 ? payment.paymentDate : undefined;
    payment.paymentMethod = method;
    payment.paymentFor = String(req.body.paymentFor ?? payment.paymentFor ?? '').slice(0, 60);
    payment.paymentReference = String(req.body.paymentReference ?? payment.paymentReference ?? '').trim().slice(0, 120);
    payment.transactionId = payment.paymentReference;
    payment.notes = String(req.body.notes ?? payment.notes ?? '').trim().slice(0, 500);
    if (req.body.proofOfPayment) payment.proofOfPayment = normalizeProof(req.body.proofOfPayment);
    if (req.body.removeProof) payment.proofOfPayment = undefined;
    tenant.outstandingBalance = Math.max(0, money(tenant.outstandingBalance) + oldApplied - newApplied);
    tenant.totalPaidAmount = Math.max(0, money(tenant.totalPaidAmount) - oldApplied + newApplied);
    await Promise.all([payment.save(), tenant.save()]);
    await payment.populate(RECEIPT_POPULATE);
    const whatsapp = await sendClearedRentWhatsappReceipt(req, payment, previousStatus);
    res.json({ success: true, payment, whatsapp });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findOne(ownerScope(req, { _id: req.params.id }));
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' });
    const tenant = await ownedTenant(req, payment.tenant);
    if (tenant && isAppliedPayment(payment)) {
      tenant.outstandingBalance = money(tenant.outstandingBalance) + money(payment.amountPaid);
      tenant.totalPaidAmount = Math.max(0, money(tenant.totalPaidAmount) - money(payment.amountPaid));
      await tenant.save();
    }
    payment.deletedAt = new Date();
    await payment.save();
    res.json({ success: true });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const getReceipt = async (req, res) => getPaymentById(req, res);

// QR links may be opened by a tenant, so this returns only non-sensitive
// validation information. All management endpoints remain owner-protected.
const verifyReceipt = async (req, res) => {
  try {
    const receiptNumber = String(req.params.receiptNumber || '').toUpperCase();
    const payment = await Payment.findOne({ receiptNumber, deletedAt: null }).select('receiptNumber status paymentDate amountPaid remainingBalance');
    if (!payment) return res.status(404).json({ valid: false, message: 'Receipt not found.' });
    res.json({ valid: true, receiptNumber: payment.receiptNumber, status: payment.status, paymentDate: payment.paymentDate, amountPaid: money(payment.amountPaid), remainingBalance: money(payment.remainingBalance) });
  } catch (error) { res.status(400).json({ valid: false, message: 'Unable to verify this receipt.' }); }
};

const createInvoice = async (req, res) => {
  try {
    const tenant = await ownedTenant(req, req.body.tenantId);
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });
    
    // Validate required fields
    if (!req.body.dueDate) return res.status(400).json({ success: false, message: 'Due date is required' });
    if (!req.body.amount || money(req.body.amount) <= 0) return res.status(400).json({ success: false, message: 'Invoice amount must be greater than 0' });
    
    const rentAmount = money(req.body.rentAmount) || money(req.body.amount);
    const previousBalance = money(req.body.previousBalance) || 0;
    const penalties = money(req.body.penalties) || 0;
    const discount = money(req.body.discount) || 0;
    const totalAmount = rentAmount + previousBalance + penalties - discount;
    
    // Check for duplicate invoice (same tenant, unit, and billing month)
    if (req.body.billingMonth) {
      const [monthStart, monthEnd] = [
        new Date(req.body.billingMonth + '-01'),
        new Date(new Date(req.body.billingMonth + '-01').getFullYear(), new Date(req.body.billingMonth + '-01').getMonth() + 1, 0)
      ];
      const existingInvoice = await Payment.findOne({
        ...ownerScope(req),
        tenant: tenant._id,
        unit: tenant.unit,
        property: tenant.property,
        createdAt: { $gte: monthStart, $lte: monthEnd },
        status: { $ne: 'cancelled' }
      });
      if (existingInvoice) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invoice already exists for this tenant, unit, and billing month. Please update the existing invoice instead.' 
        });
      }
    }
    
    const enabledMethods = await getEnabledPaymentMethods(req);
    const defaultMethod = await getDefaultPaymentMethod(req, 'mobile_money');
    const invoiceMethod = normalizePaymentMethod(req.body.paymentMethod || defaultMethod, defaultMethod);
    if (enabledMethods && !enabledMethods.has(invoiceMethod) && invoiceMethod !== 'mobile_money') {
      return res.status(400).json({ success: false, message: 'Selected payment method is disabled in settings.' });
    }

    const invoice = await Payment.create({
      ...ownerScope(req),
      tenant: tenant._id,
      property: tenant.property,
      unit: tenant.unit,
      amount: totalAmount,
      monthlyRent: rentAmount,
      previousBalance,
      penalties,
      discount,
      dueDate: safeDate(req.body.dueDate),
      paymentMethod: invoiceMethod,
      status: 'pending',
      notes: String(req.body.notes || '').trim().slice(0, 500),
      recordedBy: req.user._id,
      paymentPeriod: paymentPeriodFromBillingMonth(req.body.billingMonth, req.body.dueDate),
      paymentFor: paymentForLabel(paymentPeriodFromBillingMonth(req.body.billingMonth, req.body.dueDate))
    });
    
    // Update tenant's outstanding balance
    tenant.outstandingBalance = money(tenant.outstandingBalance) + totalAmount;
    await tenant.save();
    
    await invoice.populate(RECEIPT_POPULATE);
    res.status(201).json({ success: true, invoice });
  } catch (error) { 
    res.status(400).json({ success: false, message: error.message }); 
  }
};

const generateMonthlyInvoices = async (req, res) => {
  try {
    const { billingMonth, dueDate, propertyFilter, includePreviousBalance, addLateFee, lateFeeAmount, notes } = req.body;
    const defaultMethod = await getDefaultPaymentMethod(req, 'mobile_money');
    
    // Validate inputs
    if (!billingMonth) return res.status(400).json({ success: false, message: 'Billing month is required' });
    if (!dueDate) return res.status(400).json({ success: false, message: 'Due date is required' });
    
    // Get active tenants
    let tenantFilter = ownerScope(req, { status: 'active' });
    if (propertyFilter) {
      tenantFilter.property = propertyFilter;
    }
    
    const tenants = await Tenant.find(tenantFilter).select('_id fullName property unit rentAmount outstandingBalance').populate('property', 'name').populate('unit', 'unitNumber');
    
    if (tenants.length === 0) {
      return res.json({ 
        success: true, 
        message: 'No active tenants found',
        invoices: [],
        summary: { totalTenants: 0, alreadyInvoiced: 0, newInvoices: 0, totalExpectedRent: 0 }
      });
    }
    
    // Check for existing invoices in the billing month
    const [monthStart, monthEnd] = [
      new Date(billingMonth + '-01'),
      new Date(new Date(billingMonth + '-01').getFullYear(), new Date(billingMonth + '-01').getMonth() + 1, 0)
    ];
    
    const existingInvoices = await Payment.find({
      ...ownerScope(req),
      tenant: { $in: tenants.map(t => t._id) },
      createdAt: { $gte: monthStart, $lte: monthEnd },
      status: { $ne: 'cancelled' }
    }).select('tenant');
    const paymentPeriod = paymentPeriodFromBillingMonth(billingMonth, dueDate);
    const paymentFor = paymentForLabel(paymentPeriod);
    const invoicedTenantIds = new Set(existingInvoices.map((invoice) => String(invoice.tenant)));
    
    // Create invoices for tenants without existing invoices
    const invoices = [];
    let totalExpectedRent = 0;
    
    for (const tenant of tenants) {
      if (invoicedTenantIds.has(String(tenant._id))) {
        continue; // Skip if already invoiced
      }
      
      if (!includePreviousBalance && money(tenant.outstandingBalance) > 0) {
        continue; // Skip if has previous balance and includePreviousBalance is false
      }
      
      const rentAmount = money(tenant.rentAmount) || 0;
      const previousBalance = includePreviousBalance ? money(tenant.outstandingBalance) : 0;
      const penalties = addLateFee ? money(lateFeeAmount) : 0;
      const totalAmount = rentAmount + previousBalance + penalties;
      
      if (totalAmount <= 0) continue;
      
      try {
        const invoice = await Payment.create({
          ...ownerScope(req),
          tenant: tenant._id,
          property: tenant.property._id,
          unit: tenant.unit?._id,
          amount: totalAmount,
          monthlyRent: rentAmount,
          previousBalance,
          penalties,
          discount: 0,
          dueDate: safeDate(dueDate),
          paymentMethod: defaultMethod,
          status: 'pending',
          notes: String(notes || '').trim().slice(0, 500),
          recordedBy: req.user._id,
          paymentPeriod,
          paymentFor
        });
        
        invoices.push(invoice);
        totalExpectedRent += totalAmount;

        if (await shouldGenerateDocument(req, 'autoGenerateMonthlyAssessmentReports', true)) {
          queueDocumentTask(() => generateMonthlyAssessmentDocument({
            ownerContext: documentOwnerContext(req),
            tenant,
            property: tenant.property,
            unit: tenant.unit,
            billingMonth,
            dueDate,
            invoice
          }));
        }
        
        // Update tenant's outstanding balance
        tenant.outstandingBalance = money(tenant.outstandingBalance) + totalAmount;
        await tenant.save();
      } catch (error) {
        // Continue with next tenant if invoice creation fails
        console.error(`Failed to create invoice for tenant ${tenant._id}:`, error);
      }
    }
    
    res.status(201).json({
      success: true,
      message: `Successfully generated ${invoices.length} invoices`,
      invoices,
      summary: {
        totalTenants: tenants.length,
        alreadyInvoiced: invoicedTenantIds.size,
        newInvoices: invoices.length,
        totalExpectedRent
      }
    });
  } catch (error) { 
    res.status(400).json({ success: false, message: error.message }); 
  }
};

const recordPaymentOnInvoice = async (req, res) => {
  try {
    const invoice = await Payment.findOne(ownerScope(req, { _id: req.params.id }));
    if (!invoice) return res.status(404).json({ success: false, message: 'Invoice not found' });
    
    const amountToRecord = money(req.body.amount);
    if (amountToRecord <= 0) return res.status(400).json({ success: false, message: 'Payment amount must be greater than 0' });
    
    const balance = money(invoice.amount) - money(invoice.amountPaid);
    if (amountToRecord > balance) {
      return res.status(400).json({ success: false, message: `Payment amount cannot exceed balance of ${balance}` });
    }
    
    const tenant = await ownedTenant(req, invoice.tenant);
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });
    
    // Update invoice
    const previousStatus = invoice.status;
    const newAmountPaid = money(invoice.amountPaid) + amountToRecord;
    const newStatus = newAmountPaid >= money(invoice.amount) ? 'paid' : 'partial';
    
    invoice.amountPaid = newAmountPaid;
    invoice.status = newStatus;
    invoice.paidDate = new Date();
    invoice.recordedBy = req.user._id;
    await invoice.save();
    
    // Update tenant's outstanding balance
    tenant.outstandingBalance = Math.max(0, money(tenant.outstandingBalance) - amountToRecord);
    tenant.totalPaidAmount = money(tenant.totalPaidAmount) + amountToRecord;
    await tenant.save();
    
    await invoice.populate(RECEIPT_POPULATE);
    const whatsapp = await sendClearedRentWhatsappReceipt(req, invoice, previousStatus);
    res.json({ success: true, invoice, whatsapp });
  } catch (error) { 
    res.status(400).json({ success: false, message: error.message }); 
  }
};

const getMaintenanceRequests = async (req, res) => {
  try {
    const scope = ownerScope(req);
    const extra = {};

    // Apply filters
    if (req.query.status) extra.status = req.query.status;
    if (req.query.priority) extra.priority = req.query.priority;
    if (req.query.property) extra.property = req.query.property;
    if (req.query.unit) extra.unit = req.query.unit;
    if (req.query.source) extra.source = req.query.source;

    // Apply search
    const searchFilter = {};
    if (req.query.search) {
      const searchRegex = { $regex: req.query.search, $options: 'i' };
      searchFilter.$or = [
        { issue: searchRegex },
        { description: searchRegex },
        { requestId: searchRegex }
      ];
    }

    const result = await paged(
      Maintenance,
      { ...scope, ...extra, ...searchFilter },
      req.query,
      [
        { path: 'tenant', select: 'fullName phone email photo' },
        { path: 'property', select: 'name' },
        { path: 'unit', select: 'unitNumber' }
      ]
    );

    // Calculate summary
    const allRequests = await Maintenance.find({ ...scope, deletedAt: null });
    const summary = {
      totalRequests: allRequests.length,
      pendingRequests: allRequests.filter(r => r.status === 'pending').length,
      inProgressRequests: allRequests.filter(r => r.status === 'in_progress').length,
      completedRequests: allRequests.filter(r => r.status === 'completed').length,
      urgentRequests: allRequests.filter(r => r.priority === 'urgent').length,
      costThisMonth: allRequests
        .filter(r => r.actualCost && new Date(r.createdAt).getMonth() === new Date().getMonth())
        .reduce((sum, r) => sum + (Number(r.actualCost) || 0), 0)
    };

    res.json({ success: true, requests: result.items, pagination: result.pagination, summary });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const createMaintenance = async (req, res) => {
  try {
    const scope = ownerScope(req);
    const { property, unit, issueType, priority, description, ownerNotes, issueImages } = req.body;

    // Validate required fields
    if (!property || !unit || !issueType || !description) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Verify property and unit belong to this owner
    const propDoc = await Property.findOne({ ...scope, _id: property });
    if (!propDoc) {
      return res.status(403).json({ success: false, message: 'Property not found or unauthorized' });
    }

    const unitDoc = await Unit.findOne({ ...scope, _id: unit });
    if (!unitDoc) {
      return res.status(403).json({ success: false, message: 'Unit not found or unauthorized' });
    }

    if (!unitDoc.currentTenant) {
      return res.status(400).json({ success: false, message: 'This unit has no assigned tenant for a maintenance request.' });
    }

    const maintenance = new Maintenance({
      ...scope,
      tenant: unitDoc.currentTenant,
      property,
      unit,
      issueType,
      issue: description,
      priority: priority || 'medium',
      description,
      ownerNotes,
      issueImages: issueImages || [],
      source: 'self_owner',
      status: 'pending'
    });

    await maintenance.save();
    await maintenance.populate([
      { path: 'tenant', select: 'fullName phone email photo' },
      { path: 'property', select: 'name' },
      { path: 'unit', select: 'unitNumber' }
    ]);

    const tenantDoc = await Tenant.findById(maintenance.tenant).select('user fullName');
    if (tenantDoc?.user) {
      await createInAppNotification({
        company: maintenance.company,
        user: tenantDoc.user,
        title: 'New maintenance request opened',
        message: `A maintenance request was opened for your unit by your landlord.` ,
        type: 'maintenance_request',
        relatedEntity: { entityType: 'maintenance', entityId: maintenance._id },
        actionUrl: '/tenant/maintenance',
        priority: maintenance.priority === 'urgent' ? 'high' : 'medium'
      });
    }

    res.status(201).json({ success: true, request: maintenance });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const getMaintenanceById = async (req, res) => {
  try {
    const maintenanceId = req.params.id || req.params.maintenanceId;
    const request = await Maintenance.findOne(ownerScope(req, { _id: maintenanceId }))
      .populate('tenant', 'fullName phone email photo')
      .populate('property', 'name')
      .populate('unit', 'unitNumber')
      .populate('comments.author', 'name fullName email');

    if (!request) return res.status(404).json({ success: false, message: 'Maintenance request not found' });
    res.json({ success: true, request });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const updateMaintenance = async (req, res) => {
  try {
    const request = await Maintenance.findOne(ownerScope(req, { _id: req.params.id }));
    if (!request) return res.status(404).json({ success: false, message: 'Maintenance request not found' });

    const {
      status,
      priority,
      assignedTo,
      resolutionNotes,
      estimatedCost,
      actualCost,
      ownerNotes,
      technicianName,
      technicianPhone,
      technicianService,
      technicianAddress
    } = req.body;

    // Update allowed fields
    if (status !== undefined) request.status = status;
    if (priority !== undefined) request.priority = priority;
    if (assignedTo !== undefined) request.assignedTo = assignedTo;
    if (resolutionNotes !== undefined) request.resolutionNotes = resolutionNotes;
    if (estimatedCost !== undefined) request.estimatedCost = estimatedCost;
    if (actualCost !== undefined) request.actualCost = actualCost;
    if (ownerNotes !== undefined) request.ownerNotes = ownerNotes;
    if (technicianName !== undefined) request.technicianName = technicianName;
    if (technicianPhone !== undefined) request.technicianPhone = technicianPhone;
    if (technicianService !== undefined) request.technicianService = technicianService;
    if (technicianAddress !== undefined) request.technicianAddress = technicianAddress;

    // Set timestamps based on status changes
    if (status === 'approved') request.approvedAt = new Date();
    if (status === 'in_progress') request.startedAt = new Date();
    if (status === 'completed') request.completedAt = new Date();

    await request.save();

    if (status === 'approved' || status === 'completed') {
      queueDocumentTask(async () => {
        const allowApproval = await shouldGenerateDocument(req, 'autoGenerateMaintenanceApprovalDocuments', true);
        const allowCompletion = await shouldGenerateDocument(req, 'autoGenerateMaintenanceCompletionDocuments', true);
        const [tenant, property, unit] = await Promise.all([
          Tenant.findById(request.tenant).select('fullName'),
          Property.findById(request.property).select('name'),
          Unit.findById(request.unit).select('unitNumber')
        ]);

        if (status === 'approved' && allowApproval) {
          await generateMaintenanceApprovalDocument({ ownerContext: documentOwnerContext(req), maintenance: request, tenant, property, unit });
        }
        if (status === 'completed' && allowCompletion) {
          await generateMaintenanceCompletionDocument({ ownerContext: documentOwnerContext(req), maintenance: request, tenant, property, unit });
        }
      });
    }

    res.json({ success: true, request });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const updateMaintenanceStatus = async (req, res) => {
  try {
    const request = await Maintenance.findOne(ownerScope(req, { _id: req.params.id }));
    if (!request) return res.status(404).json({ success: false, message: 'Maintenance request not found' });

    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, message: 'Status is required' });

    request.status = status;

    // Set timestamps based on status
    if (status === 'approved') request.approvedAt = new Date();
    if (status === 'in_progress') request.startedAt = new Date();
    if (status === 'completed') request.completedAt = new Date();

    await request.save();

    if (status === 'approved' || status === 'completed') {
      queueDocumentTask(async () => {
        const allowApproval = await shouldGenerateDocument(req, 'autoGenerateMaintenanceApprovalDocuments', true);
        const allowCompletion = await shouldGenerateDocument(req, 'autoGenerateMaintenanceCompletionDocuments', true);
        const [tenant, property, unit] = await Promise.all([
          Tenant.findById(request.tenant).select('fullName'),
          Property.findById(request.property).select('name'),
          Unit.findById(request.unit).select('unitNumber')
        ]);

        if (status === 'approved' && allowApproval) {
          await generateMaintenanceApprovalDocument({ ownerContext: documentOwnerContext(req), maintenance: request, tenant, property, unit });
        }
        if (status === 'completed' && allowCompletion) {
          await generateMaintenanceCompletionDocument({ ownerContext: documentOwnerContext(req), maintenance: request, tenant, property, unit });
        }
      });
    }

    const tenantDoc = await Tenant.findById(request.tenant).select('user');
    if (tenantDoc?.user) {
      const statusLabel = status.replace('_', ' ');
      await createInAppNotification({
        company: request.company,
        user: tenantDoc.user,
        title: 'Maintenance request updated',
        message: `Your maintenance request ${request.requestId} is now ${statusLabel}.`,
        type: status === 'completed' ? 'maintenance_completed' : 'maintenance_update',
        relatedEntity: { entityType: 'maintenance', entityId: request._id },
        actionUrl: '/tenant/maintenance',
        priority: status === 'rejected' ? 'high' : 'medium'
      });
    }

    res.json({ success: true, request });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const addMaintenanceComment = async (req, res) => {
  try {
    const maintenanceId = req.params.id || req.params.maintenanceId;
    const request = await Maintenance.findOne(ownerScope(req, { _id: maintenanceId }));
    if (!request) return res.status(404).json({ success: false, message: 'Maintenance request not found' });

    const comment = String(req.body.comment || '').trim();
    if (!comment) return res.status(400).json({ success: false, message: 'Comment is required' });

    request.comments.push({
      author: req.user._id,
      comment
    });
    await request.save();

    const tenantDoc = await Tenant.findById(request.tenant).select('user');
    if (tenantDoc?.user) {
      await createInAppNotification({
        company: request.company,
        user: tenantDoc.user,
        title: 'New landlord comment',
        message: `Your landlord commented on maintenance request ${request.requestId}.`,
        type: 'maintenance_update',
        relatedEntity: { entityType: 'maintenance', entityId: request._id },
        actionUrl: '/tenant/maintenance',
        priority: 'medium'
      });
    }

    const updated = await Maintenance.findById(request._id)
      .populate('tenant', 'fullName phone email photo')
      .populate('property', 'name')
      .populate('unit', 'unitNumber')
      .populate('comments.author', 'name fullName email');

    res.json({ success: true, request: updated });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const deleteMaintenance = async (req, res) => {
  try {
    const request = await Maintenance.findOne(ownerScope(req, { _id: req.params.id }));
    if (!request) return res.status(404).json({ success: false, message: 'Maintenance request not found' });

    // Soft delete
    request.deletedAt = new Date();
    await request.save();

    res.json({ success: true, message: 'Maintenance request deleted' });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const getDocuments = async (req, res) => {
  try {
    const query = buildDocumentQuery(req);
    const result = await listOwnerDocuments({
      ownerContext: documentOwnerContext(req),
      filters: {
        category: query.category,
        status: query.status,
        sourceModule: query.sourceModule,
        documentType: query.documentType,
        tenant: query.tenant,
        property: query.property,
        unit: query.unit,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        search: req.query.search
      },
      page: req.query.page,
      limit: req.query.limit
    });
    res.json({ success: true, documents: result.items, pagination: result.pagination });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const getDocumentSummary = async (req, res) => {
  try {
    const query = buildDocumentQuery(req);
    const now = new Date();
    const expiringDate = new Date();
    expiringDate.setDate(expiringDate.getDate() + 30);

    const [totalDocuments, categoryCounts, expiringSoon] = await Promise.all([
      Document.countDocuments(query),
      Document.aggregate([
        { $match: query },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      Document.countDocuments({
        ...query,
        expiryDate: { $gte: now, $lte: expiringDate },
        status: { $nin: ['Expired', 'Rejected'] }
      })
    ]);

    const categories = categoryCounts.reduce((acc, item) => {
      acc[item._id || 'System Generated'] = item.count;
      return acc;
    }, {});

    res.json({
      success: true,
      summary: {
        totalDocuments,
        tenantDocuments: categories['Tenant Documents'] || 0,
        propertyDocuments: categories['Property Documents'] || 0,
        unitDocuments: categories['Unit Documents'] || 0,
        leaseAgreements: categories['Lease Agreements'] || 0,
        paymentReceipts: categories['Payment Receipts'] || 0,
        maintenanceDocuments: categories['Maintenance Documents'] || 0,
        expiringSoon,
        categories
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createDocument = async (req, res) => {
  try {
    if (req.file && !allowedDocumentMimeTypes.has(req.file.mimetype)) {
      return res.status(400).json({ success: false, message: 'Unsupported file type.' });
    }

    const { property, tenant, unit } = await resolveDocumentRelations(req, req.body);

    const isMultipartUpload = Boolean(req.file);
    const inferredType = isMultipartUpload
      ? (req.file.mimetype.startsWith('image/') ? 'image' : req.file.mimetype === 'application/pdf' ? 'pdf' : 'attachment')
      : (req.body.documentType || 'attachment');

    const document = await createDocumentRecord({
      ownerContext: documentOwnerContext(req),
      title: cleanString(req.body.title, 160) || 'Untitled Document',
      category: req.body.category || 'System Generated',
      documentType: inferredType,
      sourceModule: req.body.sourceModule || 'manual_upload',
      sourceAction: req.body.sourceAction || (isMultipartUpload ? 'manual_uploaded' : 'manual_created'),
      description: cleanString(req.body.description, 600),
      status: req.body.status || 'Active',
      accessLevel: req.body.accessLevel || 'private',
      visibleToTenant: parseBool(req.body.visibleToTenant),
      related: {
        tenant: tenant?._id,
        property: property?._id || tenant?.property || unit?.property,
        unit: unit?._id || tenant?.unit,
        payment: req.body.payment,
        invoice: req.body.invoice,
        maintenance: req.body.maintenance,
        reportId: req.body.reportId
      },
      file: {
        base64: req.file ? req.file.buffer.toString('base64') : req.body.fileBase64,
        buffer: req.file?.buffer || req.body.fileData,
        fileUrl: req.body.fileUrl,
        fileName: req.file?.originalname || req.body.fileName,
        originalName: req.file?.originalname || req.body.originalName,
        mimeType: req.file?.mimetype || req.body.mimeType,
        size: req.file?.size || req.body.size
      },
      notes: cleanString(req.body.notes, 1000)
    });

    const expiryDate = parseDate(req.body.expiryDate);
    if (expiryDate) {
      document.expiryDate = expiryDate;
      await document.save();
    }

    const isNotice = inferredType === 'notice' || String(req.body.documentType || '').toLowerCase() === 'notice';
    let noticeRecipientCount = 0;
    if (isNotice) {
      const title = cleanString(req.body.title, 160) || 'General Notice';
      const message = cleanString(req.body.description, 600) || cleanString(req.body.notes, 600) || 'A new notice has been posted by your landlord.';
      const tenantFilter = ownerScope(req, { user: { $ne: null } });
      if (tenant?._id) tenantFilter._id = tenant._id;
      if (property?._id) tenantFilter.property = property._id;
      if (unit?._id) tenantFilter.unit = unit._id;
      const targetTenants = await Tenant.find(tenantFilter).select('user property unit');
      const uniqueUsers = new Set();
      const notifications = targetTenants
        .map((target) => {
          const userId = String(target.user || '');
          if (!userId || uniqueUsers.has(userId)) return null;
          uniqueUsers.add(userId);
          return ({
          company: getCompanyId(req),
          user: target.user,
          title,
          message,
          type: 'announcement',
          priority: 'high',
          relatedEntity: { entityType: 'system', entityId: document._id },
          actionUrl: '/tenant/notices',
          actionButton: { label: 'View Notice', url: '/tenant/notices' },
          metadata: {
            ownerId: String(req.user._id),
            tenant: target._id,
            tenantId: String(target._id),
            property: target.property || null,
            propertyId: target.property ? String(target.property) : '',
            unit: target.unit || null,
            unitId: target.unit ? String(target.unit) : '',
            audience: tenant?._id || property?._id || unit?._id ? 'targeted_tenants' : 'all_tenants',
            source: 'self_owner_notice',
            documentId: String(document._id)
          }
        });
        })
        .filter(Boolean);
      if (notifications.length) {
        await Notification.insertMany(notifications, { ordered: false });
        noticeRecipientCount = notifications.length;
      }
    }

    res.status(201).json({ success: true, document, noticeRecipientCount });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const uploadDocument = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'File is required.' });
    if (!allowedDocumentMimeTypes.has(req.file.mimetype)) return res.status(400).json({ success: false, message: 'Unsupported file type.' });

    const { property, tenant, unit } = await resolveDocumentRelations(req, req.body);
    const documentType = req.file.mimetype.startsWith('image/') ? 'image' : req.file.mimetype === 'application/pdf' ? 'pdf' : 'attachment';
    const generatedCategory = documentType === 'image' ? 'Property Documents' : 'System Generated';

    const document = await createDocumentRecord({
      ownerContext: documentOwnerContext(req),
      title: cleanString(req.body.title, 160) || cleanString(req.file.originalname, 160) || 'Uploaded Document',
      category: req.body.category || generatedCategory,
      documentType: req.body.documentType || documentType,
      sourceModule: req.body.sourceModule || 'manual_upload',
      sourceAction: req.body.sourceAction || 'manual_uploaded',
      description: cleanString(req.body.description, 600),
      status: req.body.status || 'Pending Review',
      accessLevel: req.body.accessLevel || 'private',
      visibleToTenant: parseBool(req.body.visibleToTenant),
      related: {
        tenant: tenant?._id,
        property: property?._id || tenant?.property || unit?.property,
        unit: unit?._id || tenant?.unit,
        payment: req.body.payment,
        invoice: req.body.invoice,
        maintenance: req.body.maintenance,
        reportId: req.body.reportId
      },
      file: {
        buffer: req.file.buffer,
        base64: req.file.buffer.toString('base64'),
        fileName: req.file.originalname,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size
      },
      notes: cleanString(req.body.notes, 1000)
    });

    const expiryDate = parseDate(req.body.expiryDate);
    if (expiryDate) {
      document.expiryDate = expiryDate;
      await document.save();
    }

    res.status(201).json({ success: true, document });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const updateDocument = async (req, res) => {
  try {
    const document = await getOwnerDocumentById({ ownerContext: documentOwnerContext(req), documentId: req.params.id, includeContent: true });
    if (!document) return res.status(404).json({ success: false, message: 'Document not found' });

    const { property, tenant, unit } = await resolveDocumentRelations(req, req.body);

    if (req.body.title !== undefined) document.title = cleanString(req.body.title, 160) || document.title;
    if (req.body.category !== undefined) document.category = req.body.category || document.category;
    if (req.body.documentType !== undefined) document.documentType = req.body.documentType || document.documentType;
    if (req.body.status !== undefined) document.status = req.body.status || document.status;
    if (req.body.description !== undefined) document.description = cleanString(req.body.description, 600);
    if (req.body.sourceModule !== undefined) document.sourceModule = req.body.sourceModule || document.sourceModule;
    if (req.body.sourceAction !== undefined) document.sourceAction = req.body.sourceAction || document.sourceAction;
    if (req.body.accessLevel !== undefined) document.accessLevel = req.body.accessLevel || document.accessLevel;
    if (req.body.visibleToTenant !== undefined) document.visibleToTenant = parseBool(req.body.visibleToTenant, document.visibleToTenant);
    if (req.body.notes !== undefined) document.notes = cleanString(req.body.notes, 1000);

    document.property = property?._id || tenant?.property || unit?.property || document.property;
    document.tenant = tenant?._id || document.tenant;
    document.unit = unit?._id || tenant?.unit || document.unit;

    const expiryDate = parseDate(req.body.expiryDate);
    if (req.body.expiryDate !== undefined) document.expiryDate = expiryDate;

    if (req.file) {
      if (!allowedDocumentMimeTypes.has(req.file.mimetype)) return res.status(400).json({ success: false, message: 'Unsupported file type.' });

      document.previousVersions.push({ fileUrl: document.fileUrl || '', uploadedAt: new Date(), uploadedBy: req.user._id });
      document.version = (document.version || 1) + 1;
      document.fileData = req.file.buffer;
      document.fileBase64 = req.file.buffer.toString('base64');
      document.fileName = req.file.originalname;
      document.originalName = req.file.originalname;
      document.mimeType = req.file.mimetype;
      document.size = req.file.size;
      document.fileType = DOC_MIME_TO_FILE_TYPE[req.file.mimetype] || 'other';
      document.fileUrl = '';
      document.sourceModule = req.body.sourceModule || 'manual_upload';
      document.sourceAction = req.body.sourceAction || 'manual_replaced';
      document.generatedBy = req.user._id;
      document.generatedAt = new Date();
    }

    await document.save();
    res.json({ success: true, document });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getDocumentById = async (req, res) => {
  try {
    const document = await getOwnerDocumentById({ ownerContext: documentOwnerContext(req), documentId: req.params.id, includeContent: false });
    if (!document) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, document });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const downloadDocument = async (req, res) => {
  try {
    const document = await getOwnerDocumentById({ ownerContext: documentOwnerContext(req), documentId: req.params.id, includeContent: true });
    if (!document) return res.status(404).json({ success: false, message: 'Document not found' });

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

    if (document.fileUrl) {
      return res.json({ success: true, fileUrl: document.fileUrl, message: 'Document is stored by URL.' });
    }

    return res.status(404).json({ success: false, message: 'Document content not found' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const deleteDocument = async (req, res) => {
  try {
    const result = await softDeleteOwnerDocument({ ownerContext: documentOwnerContext(req), documentId: req.params.id });
    if (!result.modifiedCount) return res.status(404).json({ success: false, message: 'Document not found' });
    res.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

const getNotices = async (req, res) => {
  try {
    const noticePopulate = [
      { path: 'tenant', select: 'fullName email phone' },
      { path: 'property', select: 'name location' },
      { path: 'unit', select: 'unitNumber' },
      { path: 'uploadedBy', select: 'name email' }
    ];
    const query = {
      company: getCompanyId(req),
      deletedAt: null,
      $and: [{
        $or: [
          { documentType: 'notice' },
          { category: 'Notices' },
          { sourceModule: 'notice' },
          { sourceAction: 'general_notice' }
        ]
      }]
    };

    // Backward-compatible access for notices created before owner tagging was fully enforced.
    if (req.user.role === 'self_owner') {
      query.$and.push({
        $or: [
          { owner: req.user._id },
          { uploadedBy: req.user._id }
        ]
      });
    }

    const search = cleanString(req.query.search || '', 120);
    if (search) {
      const pattern = new RegExp(escapeRegexQuery(search), 'i');
      query.$and.push({ $or: [{ title: pattern }, { description: pattern }, { notes: pattern }] });
    }
    const result = await paged(Document, query, req.query, noticePopulate, { createdAt: -1 });
    return res.json({ success: true, documents: result.items, pagination: result.pagination });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createNotice = async (req, res) => {
  req.body.documentType = 'notice';
  req.body.fileUrl = req.body.fileUrl || 'notice://internal';
  req.body.fileType = req.body.fileType || 'txt';
  req.body.accessLevel = req.body.accessLevel || 'tenant';
  return createDocument(req, res);
};

const deleteNotice = async (req, res) => {
  try {
    if (!req.params.id) return res.status(400).json({ success: false, message: 'Notice ID is required.' });
    const query = {
      _id: req.params.id,
      company: getCompanyId(req),
      deletedAt: null,
      documentType: 'notice'
    };
    if (req.user.role === 'self_owner') {
      query.$or = [{ owner: req.user._id }, { uploadedBy: req.user._id }];
    }
    const notice = await Document.findOne(query);
    if (!notice) return res.status(404).json({ success: false, message: 'Notice not found.' });

    notice.deletedAt = new Date();
    await notice.save();

    await Notification.updateMany(
      {
        company: getCompanyId(req),
        deletedAt: null,
        $or: [
          { 'metadata.documentId': String(notice._id) },
          { 'relatedEntity.entityId': notice._id }
        ]
      },
      { $set: { deletedAt: new Date() } }
    );

    return res.json({ success: true, message: 'Notice deleted.' });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const generateReport = async (req, res) => {
  try {
    const scope = ownerScope(req);
    const startDate = new Date(req.query.startDate || new Date(Date.now() - 365 * 86400000));
    const endDate = new Date(req.query.endDate || new Date());
    const [properties, units, tenants, payments, maintenance] = await Promise.all([
      Property.find(scope), Unit.find(scope), Tenant.find(scope),
      Payment.find({ ...scope, paidDate: { $gte: startDate, $lte: endDate } }),
      Maintenance.find({ ...scope, submittedDate: { $gte: startDate, $lte: endDate } })
    ]);
    const paid = payments.filter((payment) => payment.status === 'paid');
    const totalRevenue = paid.reduce((sum, payment) => sum + (payment.amountPaid || payment.amount || 0), 0);
    const report = {
      period: `${startDate.toISOString().slice(0, 10)} to ${endDate.toISOString().slice(0, 10)}`,
      totalRevenue, paymentCount: paid.length, totalProperties: properties.length, totalUnits: units.length,
      occupiedUnits: units.filter((unit) => unit.status === 'occupied').length,
      occupancyRate: units.length ? Math.round((units.filter((unit) => unit.status === 'occupied').length / units.length) * 100) : 0,
      activeTenants: tenants.filter((tenant) => tenant.status === 'active').length,
      totalRequests: maintenance.length,
      completedRequests: maintenance.filter((item) => item.status === 'completed').length,
      pendingRequests: maintenance.filter((item) => item.status !== 'completed').length,
      totalCost: maintenance.reduce((sum, item) => sum + (item.cost || 0), 0)
    };

    if (await shouldGenerateDocument(req, 'autoGenerateMonthlyAssessmentReports', true)) {
      queueDocumentTask(() => generateReportExportDocument({ ownerContext: documentOwnerContext(req), reportType: req.params.reportType, report }));
    }

    res.json({ success: true, reportType: req.params.reportType, report });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

module.exports = { getDashboard, getProperties, createProperty, updateProperty, deleteProperty, getUnits, createUnit, updateUnit, deleteUnit, getPropertyUnits, getTenants, createTenant, updateTenant, deleteTenant, getPayments, getPaymentSummary, getPaymentById, recordPayment, updatePayment, deletePayment, getReceipt, verifyReceipt, createInvoice, generateMonthlyInvoices, recordPaymentOnInvoice, getMaintenanceRequests, getMaintenanceById, createMaintenance, updateMaintenance, updateMaintenanceStatus, addMaintenanceComment, deleteMaintenance, getDocuments, getDocumentSummary, getDocumentById, downloadDocument, createDocument, uploadDocument, updateDocument, deleteDocument, getNotices, createNotice, deleteNotice, generateReport };
