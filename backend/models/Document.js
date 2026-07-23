const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant'
  },
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property'
  },
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  maintenance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Maintenance'
  },
  reportId: {
    type: String,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  documentName: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: [
      'Tenant Documents',
      'Property Documents',
      'Unit Documents',
      'Lease Agreements',
      'Payment Receipts',
      'Maintenance Documents',
      'Monthly Assessments',
      'Reports',
      'Legal / Ownership',
      'System Generated'
    ],
    default: 'System Generated'
  },
  documentType: {
    type: String,
    enum: ['lease', 'invoice', 'receipt', 'notice', 'property_doc', 'tenant_doc', 'contract', 'attachment', 'report', 'pdf', 'image', 'other'],
    default: 'attachment'
  },
  sourceModule: {
    type: String,
    enum: ['tenant_profile', 'property_creation', 'unit_creation', 'payment', 'maintenance', 'monthly_assessment', 'report_export', 'manual_upload', 'system'],
    default: 'system'
  },
  sourceAction: {
    type: String,
    trim: true,
    default: 'generated'
  },
  fileUrl: {
    type: String,
    default: ''
  },
  fileData: {
    type: Buffer
  },
  fileBase64: {
    type: String,
    trim: true,
    default: ''
  },
  fileName: {
    type: String,
    trim: true
  },
  originalName: {
    type: String,
    trim: true
  },
  fileType: {
    type: String,
    enum: ['pdf', 'docx', 'xlsx', 'jpg', 'png', 'doc', 'xls', 'txt', 'other'],
    default: 'pdf'
  },
  mimeType: {
    type: String,
    trim: true
  },
  size: {
    type: Number
  },
  status: {
    type: String,
    enum: ['Active', 'Pending Review', 'Verified', 'Rejected', 'Expiring Soon', 'Expired'],
    default: 'Active'
  },
  visibleToTenant: {
    type: Boolean,
    default: false
  },
  description: {
    type: String,
    trim: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isVisible: {
    type: Boolean,
    default: true
  },
  accessLevel: {
    type: String,
    enum: ['private', 'owner', 'manager', 'tenant', 'public'],
    default: 'private'
  },
  tags: [String],
  version: {
    type: Number,
    default: 1
  },
  previousVersions: [{
    fileUrl: String,
    uploadedAt: Date,
    uploadedBy: mongoose.Schema.Types.ObjectId
  }],
  expiryDate: Date,
  generatedAt: {
    type: Date
  },
  notes: {
    type: String,
    trim: true
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  indexes: [
    { company: 1, createdAt: -1 },
    { tenant: 1 },
    { property: 1 },
    { owner: 1 },
    { documentType: 1 }
  ]
});

// Soft delete support
documentSchema.query.active = function() {
  return this.where({ deletedAt: null });
};

module.exports = mongoose.model('Document', documentSchema);
