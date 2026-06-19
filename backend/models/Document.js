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
  title: {
    type: String,
    required: true,
    trim: true
  },
  documentType: {
    type: String,
    enum: ['lease', 'invoice', 'receipt', 'notice', 'property_doc', 'tenant_doc', 'contract', 'attachment', 'report'],
    default: 'attachment'
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileName: {
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
  description: {
    type: String,
    trim: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
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
