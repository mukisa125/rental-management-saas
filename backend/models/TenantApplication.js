const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  base64: String,
  contentType: String,
  originalName: String,
  size: Number,
  documentType: String,
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const tenantApplicationSchema = new mongoose.Schema({
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  unit: { type: mongoose.Schema.Types.ObjectId, ref: 'Unit', required: true },
  token: { type: String, required: true, unique: true, index: true },
  status: { type: String, enum: ['open', 'pending', 'approved', 'rejected', 'expired'], default: 'open', index: true },
  expiresAt: { type: Date, required: true },
  submittedAt: Date,
  approvedAt: Date,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectedAt: Date,
  rejectionReason: { type: String, trim: true },

  fullName: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phone: { type: String, trim: true },
  idNumber: { type: String, trim: true },
  gender: String,
  dateOfBirth: Date,
  occupation: { type: String, trim: true },
  emergencyContact: { name: String, phone: String },
  leaseStart: Date,
  leaseEnd: Date,
  rentAmount: Number,
  securityDeposit: { type: Number, default: 0 },
  notes: { type: String, trim: true },
  photo: attachmentSchema,
  identityAttachments: [attachmentSchema],
  createAccount: { type: Boolean, default: false },
  accountEmail: { type: String, lowercase: true, trim: true },
  accountPasswordHash: { type: String, select: false }
}, { timestamps: true });

tenantApplicationSchema.index({ company: 1, owner: 1, unit: 1, status: 1 });

module.exports = mongoose.model('TenantApplication', tenantApplicationSchema);
