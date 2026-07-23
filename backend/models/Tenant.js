const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: false,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: true
  },
  leaseStart: {
    type: Date,
    required: true
  },
  leaseEnd: {
    type: Date,
    required: true
  },
  rentAmount: {
    type: Number,
    required: true
  },
  securityDeposit: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending', 'terminated', 'renewed'],
    default: 'active'
  },
  emergencyContact: {
    name: String,
    phone: String,
    relationship: String,
    email: String
  },
  idNumber: {
    type: String,
    trim: true
  },
  idType: {
    type: String,
    enum: ['national_id', 'passport', 'driver_license', 'other'],
    default: 'national_id'
  },
  gender: { type: String, enum: ['male', 'female', 'other', 'prefer_not_to_say'] },
  dateOfBirth: Date,
  occupation: { type: String, trim: true },
  photo: {
    base64: String, contentType: String, originalName: String, size: Number, uploadedAt: Date
  },
  identityAttachments: [{
    base64: String, contentType: String, originalName: String, size: Number,
    documentType: { type: String, enum: ['national_id_front', 'national_id_back', 'lc_letter'] },
    uploadedAt: { type: Date, default: Date.now }
  }],
  documents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],
  leaseDocuments: [{
    url: String,
    name: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  occupationInfo: {
    employer: String,
    designation: String,
    salary: Number
  },
  referenceContact: {
    name: String,
    phone: String,
    relationship: String
  },
  outstandingBalance: {
    type: Number,
    default: 0
  },
  totalPaidAmount: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    trim: true
  },
  renewalHistory: [{
    renewalDate: Date,
    newLeaseEnd: Date,
    renewalAmount: Number
  }],
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  indexes: [
    { company: 1, owner: 1 },
    { company: 1, status: 1 },
    { property: 1, unit: 1 },
    { email: 1 },
    { createdAt: -1 }
  ]
});

// Soft delete support
tenantSchema.query.active = function() {
  return this.where({ deletedAt: null });
};

module.exports = mongoose.model('Tenant', tenantSchema);
