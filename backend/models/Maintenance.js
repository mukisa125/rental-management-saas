const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  comment: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

// Issue image schema with compression support
const issueImageSchema = new mongoose.Schema({
  base64: {
    type: String,
    trim: true
  },
  data: {
    type: Buffer
  },
  contentType: {
    type: String,
    default: 'image/jpeg'
  },
  originalName: {
    type: String,
    trim: true
  },
  size: {
    type: Number,
    default: 0
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const maintenanceSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  requestId: {
    type: String,
    unique: true
  },
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  issueType: {
    type: String,
    enum: ['plumbing', 'electrical', 'door_window', 'roofing', 'painting', 'security', 'cleaning', 'appliance', 'internet', 'other'],
    required: true
  },
  category: {
    type: String,
    enum: ['plumbing', 'electrical', 'hvac', 'structural', 'appliances', 'painting', 'cleaning', 'other']
  },
  issue: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'in_progress', 'completed', 'rejected', 'cancelled', 'submitted', 'assigned', 'on_hold'],
    default: 'pending'
  },
  source: {
    type: String,
    enum: ['tenant_portal', 'self_owner', 'manager'],
    default: 'tenant_portal'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  submittedDate: {
    type: Date,
    default: Date.now
  },
  reportedAt: {
    type: Date,
    default: Date.now
  },
  assignedDate: {
    type: Date
  },
  approvedAt: {
    type: Date
  },
  startDate: {
    type: Date
  },
  startedAt: {
    type: Date
  },
  resolvedDate: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  expectedCompletionDate: {
    type: Date
  },
  resolutionNotes: {
    type: String,
    trim: true
  },
  ownerNotes: {
    type: String,
    trim: true
  },
  tenantNotes: {
    type: String,
    trim: true
  },
  rejectionReason: {
    type: String,
    trim: true
  },
  issueImages: [issueImageSchema],
  images: [{
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  comments: [commentSchema],
  actualCost: {
    type: Number,
    default: 0
  },
  cost: {
    type: Number,
    default: 0
  },
  estimatedCost: {
    type: Number,
    default: 0
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'mobile_money', 'card', 'other']
  },
  technicianName: {
    type: String,
    trim: true
  },
  technicianPhone: {
    type: String,
    trim: true
  },
  technicianService: {
    type: String,
    trim: true
  },
  technicianAddress: {
    type: String,
    trim: true
  },
  vendor: {
    name: String,
    email: String,
    phone: String
  },
  invoiceUrl: {
    type: String,
    trim: true
  },
  contactPhone: {
    type: String,
    trim: true
  },
  availableTime: {
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
    { company: 1, status: 1 },
    { property: 1, unit: 1 },
    { owner: 1 },
    { tenant: 1 },
    { priority: 1 },
    { source: 1 }
  ]
});

// Soft delete support
maintenanceSchema.query.active = function() {
  return this.where({ deletedAt: null });
};

// Generate request ID before saving
maintenanceSchema.pre('save', async function() {
  if (!this.requestId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.requestId = `MTN-${timestamp}-${random}`;
  }
});

module.exports = mongoose.model('Maintenance', maintenanceSchema);
