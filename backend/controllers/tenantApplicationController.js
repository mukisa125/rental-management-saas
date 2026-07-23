const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const TenantApplication = require('../models/TenantApplication');
const Tenant = require('../models/Tenant');
const Unit = require('../models/Unit');
const Property = require('../models/Property');
const User = require('../models/User');
const Notification = require('../models/Notification');

const allowedAttachmentTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const getCompanyId = (req) => req.company?._id || req.user.company;
const ownerScope = (req, extra = {}) => ({ company: getCompanyId(req), owner: req.user._id, ...extra });

const normalizeAttachment = (attachment, documentType) => {
  if (!attachment) return undefined;
  if (!attachment.base64 || attachment.base64.length > 420000 || !allowedAttachmentTypes.includes(attachment.contentType)) {
    throw new Error('Attachments must be JPG, PNG, WEBP, or PDF files under 300KB.');
  }
  return {
    base64: attachment.base64,
    contentType: attachment.contentType,
    originalName: attachment.originalName || documentType,
    size: Number(attachment.size) || 0,
    documentType,
    uploadedAt: new Date()
  };
};

const findPublicApplication = async (token) => {
  const application = await TenantApplication.findOne({ token }).populate('property', 'name location').populate('unit', 'unitNumber rentAmount depositAmount bedrooms bathrooms status');
  if (application?.status === 'open' && application.expiresAt <= new Date()) {
    application.status = 'expired';
    await application.save();
  }
  return application;
};

const validateSubmission = (body) => {
  const required = ['fullName', 'phone', 'idNumber', 'leaseStart', 'leaseEnd', 'rentAmount'];
  if (required.some((field) => !body[field])) return 'Complete all required tenant and lease fields.';
  if (new Date(body.leaseEnd) <= new Date(body.leaseStart)) return 'Lease end date must be after the start date.';
  if (body.createAccount && (!body.accountEmail || !body.accountPassword || body.accountPassword.length < 6)) return 'Tenant account email and a password of at least six characters are required.';
  return '';
};

const notifyOwner = async (application, payload) => {
  try {
    await Notification.create({
      company: application.company,
      user: application.owner,
      priority: 'high',
      channels: { inApp: true },
      ...payload
    });
  } catch (error) {
    // A notification failure must never prevent a tenant application or approval.
    console.error('Unable to create tenant application notification:', error.message);
  }
};

const generateApplicationLink = async (req, res) => {
  try {
    const unit = await Unit.findOne(ownerScope(req, { _id: req.params.unitId })).populate('property', 'name');
    if (!unit) return res.status(404).json({ success: false, message: 'Unit not found.' });
    if (unit.status !== 'vacant' || unit.currentTenant) return res.status(409).json({ success: false, message: 'An application link can only be created for a vacant unit.' });

    const now = new Date();
    let application = await TenantApplication.findOne(ownerScope(req, { unit: unit._id, status: 'open', expiresAt: { $gt: now } })).sort({ createdAt: -1 });
    if (!application) {
      application = await TenantApplication.create({
        ...ownerScope(req),
        property: unit.property._id || unit.property,
        unit: unit._id,
        token: crypto.randomBytes(32).toString('hex'),
        expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      });
    }
    res.status(201).json({ success: true, application: { _id: application._id, token: application.token, status: application.status, expiresAt: application.expiresAt } });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const getPublicApplication = async (req, res) => {
  try {
    const application = await findPublicApplication(req.params.token);
    if (!application || application.status !== 'open') return res.status(404).json({ success: false, message: 'This tenant application link is unavailable or has expired.' });
    if (!application.unit || application.unit.status !== 'vacant' || application.unit.currentTenant) return res.status(409).json({ success: false, message: 'This unit is no longer available.' });
    res.json({ success: true, application: { property: application.property, unit: application.unit, expiresAt: application.expiresAt } });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const submitPublicApplication = async (req, res) => {
  try {
    const application = await findPublicApplication(req.params.token);
    if (!application || application.status !== 'open') return res.status(409).json({ success: false, message: 'This application has already been submitted, closed, or expired.' });
    if (!application.unit || application.unit.status !== 'vacant' || application.unit.currentTenant) return res.status(409).json({ success: false, message: 'This unit is no longer available.' });
    const validationMessage = validateSubmission(req.body);
    if (validationMessage) return res.status(400).json({ success: false, message: validationMessage });

    const photo = normalizeAttachment(req.body.photo, 'photo');
    const identityAttachments = [
      normalizeAttachment(req.body.attachments?.national_id_front, 'national_id_front'),
      normalizeAttachment(req.body.attachments?.national_id_back, 'national_id_back'),
      normalizeAttachment(req.body.attachments?.lc_letter, 'lc_letter')
    ].filter(Boolean);
    const createAccount = Boolean(req.body.createAccount);
    const accountEmail = createAccount ? String(req.body.accountEmail).trim().toLowerCase() : undefined;
    if (createAccount && await User.findOne({ email: accountEmail, deletedAt: null })) return res.status(409).json({ success: false, message: 'An account already exists with this email address.' });

    Object.assign(application, {
      fullName: req.body.fullName,
      email: req.body.email || accountEmail,
      phone: req.body.phone,
      idNumber: req.body.idNumber,
      gender: req.body.gender,
      dateOfBirth: req.body.dateOfBirth || undefined,
      occupation: req.body.occupation,
      emergencyContact: { name: req.body.emergencyContactName, phone: req.body.emergencyContactPhone },
      leaseStart: req.body.leaseStart,
      leaseEnd: req.body.leaseEnd,
      rentAmount: req.body.rentAmount,
      securityDeposit: req.body.securityDeposit || 0,
      notes: req.body.notes,
      photo,
      identityAttachments,
      createAccount,
      accountEmail,
      accountPasswordHash: createAccount ? await bcrypt.hash(req.body.accountPassword, 10) : undefined,
      status: 'pending',
      submittedAt: new Date()
    });
    await application.save();
    await notifyOwner(application, {
      title: 'New tenant application',
      message: `${application.fullName} applied for Unit ${application.unit.unitNumber}. Review the application to approve or delete it.`,
      type: 'tenant_application',
      relatedEntity: { entityType: 'tenant_application', entityId: application._id },
      actionUrl: `/self-owner/units?application=${application._id}&unit=${application.unit._id}`,
      actionButton: { label: 'Review application', url: `/self-owner/units?application=${application._id}&unit=${application.unit._id}` },
      metadata: { applicationId: application._id, unitId: application.unit._id, propertyId: application.property._id, status: 'pending' }
    });
    res.status(201).json({ success: true, message: 'Your application has been submitted for the owner to review.' });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

const getOwnerApplications = async (req, res) => {
  try {
    const filter = ownerScope(req, req.query.unit ? { unit: req.query.unit } : {});
    const applications = await TenantApplication.find(filter)
      .populate('property', 'name')
      .populate('unit', 'unitNumber rentAmount')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, applications });
  } catch (error) { res.status(500).json({ success: false, message: error.message }); }
};

const approveApplication = async (req, res) => {
  let account;
  let tenant;
  let allocatedUnit;
  try {
    const application = await TenantApplication.findOne(ownerScope(req, { _id: req.params.id, status: 'pending' })).select('+accountPasswordHash');
    if (!application) return res.status(404).json({ success: false, message: 'Pending tenant application not found.' });
    const [property, unit] = await Promise.all([
      Property.findOne(ownerScope(req, { _id: application.property })),
      Unit.findOne(ownerScope(req, { _id: application.unit }))
    ]);
    if (!property || !unit) return res.status(404).json({ success: false, message: 'The property or unit is no longer available.' });
    if (unit.status !== 'vacant' || unit.currentTenant) return res.status(409).json({ success: false, message: 'This unit is no longer available for allocation.' });

    if (application.createAccount) {
      if (await User.findOne({ email: application.accountEmail, deletedAt: null })) return res.status(409).json({ success: false, message: 'An account already exists with this email address.' });
      account = await User.create({ name: application.fullName, email: application.accountEmail, password: crypto.randomBytes(24).toString('hex'), role: 'tenant', company: getCompanyId(req), isActive: true });
      await User.updateOne({ _id: account._id }, { $set: { password: application.accountPasswordHash } });
    }

    tenant = await Tenant.create({
      company: getCompanyId(req), owner: req.user._id, user: account?._id,
      fullName: application.fullName, email: application.email, phone: application.phone, idNumber: application.idNumber,
      gender: application.gender, dateOfBirth: application.dateOfBirth, occupation: application.occupation,
      emergencyContact: application.emergencyContact, notes: application.notes, photo: application.photo,
      identityAttachments: application.identityAttachments, property: property._id, unit: unit._id,
      leaseStart: application.leaseStart, leaseEnd: application.leaseEnd, rentAmount: application.rentAmount,
      securityDeposit: application.securityDeposit || 0, status: 'active'
    });
    allocatedUnit = await Unit.findOneAndUpdate(
      ownerScope(req, { _id: unit._id, status: 'vacant', currentTenant: null }),
      { $set: { status: 'occupied', currentTenant: tenant._id, leaseStartDate: tenant.leaseStart, leaseEndDate: tenant.leaseEnd } },
      { new: true }
    );
    if (!allocatedUnit) throw new Error('This unit has just been assigned to another tenant.');
    property.occupiedUnits = (property.occupiedUnits || 0) + 1;
    await property.save();
    application.status = 'approved';
    application.approvedAt = new Date();
    application.approvedBy = req.user._id;
    await application.save();
    await notifyOwner(application, {
      title: 'Tenant approved',
      message: `${tenant.fullName} was approved for Unit ${allocatedUnit.unitNumber}. The unit is now occupied.`,
      type: 'tenant_approved',
      relatedEntity: { entityType: 'tenant', entityId: tenant._id },
      actionUrl: `/self-owner/tenants?tenant=${tenant._id}`,
      actionButton: { label: 'View tenant', url: `/self-owner/tenants?tenant=${tenant._id}` },
      metadata: { applicationId: application._id, tenantId: tenant._id, unitId: allocatedUnit._id, status: 'approved' }
    });
    res.json({ success: true, message: 'Application approved and tenant allocated.', tenant });
  } catch (error) {
    if (allocatedUnit && tenant) await Unit.updateOne(ownerScope(req, { _id: allocatedUnit._id, currentTenant: tenant._id }), { $set: { status: 'vacant' }, $unset: { currentTenant: 1, leaseStartDate: 1, leaseEndDate: 1 } });
    if (tenant) await Tenant.deleteOne({ _id: tenant._id });
    if (account) await User.deleteOne({ _id: account._id });
    res.status(400).json({ success: false, message: error.message });
  }
};

const rejectApplication = async (req, res) => {
  try {
    const application = await TenantApplication.findOne(ownerScope(req, { _id: req.params.id, status: 'pending' }));
    if (!application) return res.status(404).json({ success: false, message: 'Pending tenant application not found.' });
    application.status = 'rejected';
    application.rejectedAt = new Date();
    application.rejectionReason = String(req.body.reason || '').trim();
    await application.save();
    res.json({ success: true });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

module.exports = { generateApplicationLink, getPublicApplication, submitPublicApplication, getOwnerApplications, approveApplication, rejectApplication };
