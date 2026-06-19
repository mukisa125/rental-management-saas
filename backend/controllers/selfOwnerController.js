const Property = require('../models/Property');
const Unit = require('../models/Unit');
const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');
const Maintenance = require('../models/Maintenance');
const Document = require('../models/Document');

const getCompanyId = (req) => req.company?._id || req.user.company;
const ownerScope = (req, extra = {}) => ({
  company: getCompanyId(req),
  owner: req.user._id,
  deletedAt: null,
  ...extra
});

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
    res.json({ success: true, properties: result.items, pagination: result.pagination });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const createProperty = async (req, res) => {
  try {
    const { name, location, address, propertyType, description, amenities } = req.body;
    const property = await Property.create({ ...ownerScope(req), name, location, address, propertyType, description, amenities, totalUnits: 0, occupiedUnits: 0 });
    res.status(201).json({ success: true, property });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const updateProperty = async (req, res) => {
  try {
    const property = await ownedProperty(req, req.params.id);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
    ['name', 'location', 'address', 'propertyType', 'status', 'description', 'amenities'].forEach((field) => {
      if (req.body[field] !== undefined) property[field] = req.body[field];
    });
    await property.save();
    res.json({ success: true, property });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const deleteProperty = async (req, res) => {
  try {
    const property = await ownedProperty(req, req.params.id);
    if (!property) return res.status(404).json({ success: false, message: 'Property not found' });
    const occupied = await Unit.countDocuments(ownerScope(req, { property: property._id, status: 'occupied' }));
    if (occupied) return res.status(409).json({ success: false, message: 'Move tenants before removing this property' });
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
    const unit = await Unit.create({ ...ownerScope(req), property: property._id, unitNumber: req.body.unitNumber, rentAmount: req.body.rentAmount, depositAmount: req.body.depositAmount || 0, bedrooms: req.body.bedrooms || 1, bathrooms: req.body.bathrooms || 1, area: req.body.area, status: req.body.status || 'vacant' });
    property.totalUnits += 1;
    await property.save();
    res.status(201).json({ success: true, unit });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const updateUnit = async (req, res) => {
  try {
    const unit = await Unit.findOne(ownerScope(req, { _id: req.params.id }));
    if (!unit) return res.status(404).json({ success: false, message: 'Unit not found' });
    ['unitNumber', 'rentAmount', 'depositAmount', 'bedrooms', 'bathrooms', 'area', 'status'].forEach((field) => { if (req.body[field] !== undefined) unit[field] = req.body[field]; });
    await unit.save();
    res.json({ success: true, unit });
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
    const result = await paged(Tenant, ownerScope(req, extra), req.query, [{ path: 'property', select: 'name' }, { path: 'unit', select: 'unitNumber rentAmount' }]);
    res.json({ success: true, tenants: result.items, pagination: result.pagination });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const createTenant = async (req, res) => {
  try {
    const property = await ownedProperty(req, req.body.property);
    const unit = await Unit.findOne(ownerScope(req, { _id: req.body.unit, property: req.body.property }));
    if (!property || !unit) return res.status(404).json({ success: false, message: 'Property or unit not found' });
    if (unit.status === 'occupied') return res.status(409).json({ success: false, message: 'Unit is already occupied' });
    const tenant = await Tenant.create({ ...ownerScope(req), fullName: req.body.fullName, email: req.body.email, phone: req.body.phone, property: property._id, unit: unit._id, leaseStart: req.body.leaseStart, leaseEnd: req.body.leaseEnd, rentAmount: req.body.rentAmount || unit.rentAmount, securityDeposit: req.body.securityDeposit || 0, status: 'active' });
    unit.status = 'occupied'; unit.currentTenant = tenant._id; unit.leaseStartDate = tenant.leaseStart; unit.leaseEndDate = tenant.leaseEnd;
    property.occupiedUnits += 1;
    await Promise.all([unit.save(), property.save()]);
    res.status(201).json({ success: true, tenant });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const updateTenant = async (req, res) => {
  try {
    const tenant = await ownedTenant(req, req.params.id);
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });
    ['fullName', 'email', 'phone', 'leaseStart', 'leaseEnd', 'rentAmount', 'securityDeposit', 'status', 'notes'].forEach((field) => { if (req.body[field] !== undefined) tenant[field] = req.body[field]; });
    await tenant.save();
    res.json({ success: true, tenant });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const getPayments = async (req, res) => {
  try {
    const extra = req.query.status ? { status: req.query.status } : {};
    const result = await paged(Payment, ownerScope(req, extra), req.query, [{ path: 'tenant', select: 'fullName email' }, { path: 'property', select: 'name' }, { path: 'unit', select: 'unitNumber' }]);
    res.json({ success: true, payments: result.items, pagination: result.pagination });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const recordPayment = async (req, res) => {
  try {
    const tenant = await ownedTenant(req, req.body.tenantId);
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ success: false, message: 'Enter a valid payment amount' });
    const payment = await Payment.create({ ...ownerScope(req), tenant: tenant._id, property: tenant.property, unit: tenant.unit, amount, amountPaid: amount, dueDate: req.body.dueDate || new Date(), paidDate: new Date(), paymentMethod: req.body.paymentMethod || 'mobile_money', status: 'paid', notes: req.body.notes, recordedBy: req.user._id });
    tenant.outstandingBalance = Math.max(0, (tenant.outstandingBalance || 0) - amount);
    tenant.totalPaidAmount = (tenant.totalPaidAmount || 0) + amount;
    await tenant.save();
    res.status(201).json({ success: true, payment });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const createInvoice = async (req, res) => {
  try {
    const tenant = await ownedTenant(req, req.body.tenantId);
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });
    const amount = Number(req.body.amount || tenant.rentAmount);
    const payment = await Payment.create({ ...ownerScope(req), tenant: tenant._id, property: tenant.property, unit: tenant.unit, amount, dueDate: req.body.dueDate, paymentMethod: req.body.paymentMethod || 'mobile_money', status: 'pending', notes: req.body.notes, recordedBy: req.user._id });
    tenant.outstandingBalance = (tenant.outstandingBalance || 0) + amount;
    await tenant.save();
    res.status(201).json({ success: true, invoice: payment });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const getMaintenanceRequests = async (req, res) => {
  try {
    const extra = {};
    if (req.query.status) extra.status = req.query.status;
    if (req.query.priority) extra.priority = req.query.priority;
    const result = await paged(Maintenance, ownerScope(req, extra), req.query, [{ path: 'tenant', select: 'fullName' }, { path: 'property', select: 'name' }, { path: 'unit', select: 'unitNumber' }]);
    res.json({ success: true, requests: result.items, pagination: result.pagination });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const updateMaintenance = async (req, res) => {
  try {
    const request = await Maintenance.findOne(ownerScope(req, { _id: req.params.id }));
    if (!request) return res.status(404).json({ success: false, message: 'Maintenance request not found' });
    ['status', 'priority', 'assignedTo', 'resolutionNotes', 'estimatedCost', 'cost'].forEach((field) => { if (req.body[field] !== undefined) request[field] = req.body[field]; });
    if (req.body.status === 'completed') request.resolvedDate = new Date();
    await request.save();
    res.json({ success: true, request });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const getDocuments = async (req, res) => {
  try {
    const extra = req.query.type ? { documentType: req.query.type } : {};
    const result = await paged(Document, ownerScope(req, extra), req.query, [{ path: 'tenant', select: 'fullName' }, { path: 'property', select: 'name' }, { path: 'uploadedBy', select: 'name' }]);
    res.json({ success: true, documents: result.items, pagination: result.pagination });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const createDocument = async (req, res) => {
  try {
    const property = req.body.property ? await ownedProperty(req, req.body.property) : null;
    const tenant = req.body.tenant ? await ownedTenant(req, req.body.tenant) : null;
    if (req.body.property && !property) return res.status(404).json({ success: false, message: 'Property not found' });
    if (req.body.tenant && !tenant) return res.status(404).json({ success: false, message: 'Tenant not found' });
    const document = await Document.create({ ...ownerScope(req), title: req.body.title, documentType: req.body.documentType || 'attachment', fileUrl: req.body.fileUrl, fileName: req.body.fileName, fileType: req.body.fileType || 'pdf', description: req.body.description, property: property?._id || tenant?.property, tenant: tenant?._id, unit: tenant?.unit, uploadedBy: req.user._id, accessLevel: req.body.accessLevel || 'private' });
    res.status(201).json({ success: true, document });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const getNotices = async (req, res) => {
  req.query.type = 'notice';
  return getDocuments(req, res);
};

const createNotice = async (req, res) => {
  req.body.documentType = 'notice';
  req.body.fileUrl = req.body.fileUrl || 'notice://internal';
  req.body.fileType = req.body.fileType || 'txt';
  req.body.accessLevel = req.body.accessLevel || 'tenant';
  return createDocument(req, res);
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
    res.json({ success: true, reportType: req.params.reportType, report });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

module.exports = { getDashboard, getProperties, createProperty, updateProperty, deleteProperty, getUnits, createUnit, updateUnit, getPropertyUnits, getTenants, createTenant, updateTenant, getPayments, recordPayment, createInvoice, getMaintenanceRequests, updateMaintenance, getDocuments, createDocument, getNotices, createNotice, generateReport };
