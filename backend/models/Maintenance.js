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
  category: {
    type: String,
    enum: ['plumbing', 'electrical', 'hvac', 'structural', 'appliances', 'painting', 'cleaning', 'other'],
    required: true
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
    enum: ['submitted', 'assigned', 'in_progress', 'on_hold', 'completed', 'cancelled'],
    default: 'submitted'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  submittedDate: {
    type: Date,
    default: Date.now
  },
  assignedDate: {
    type: Date
  },
  startDate: {
    type: Date
  },
  resolvedDate: {
    type: Date
  },
  expectedCompletionDate: {
    type: Date
  },
  resolutionNotes: {
    type: String,
    trim: true
  },
  images: [{
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  comments: [commentSchema],
  cost: {
    type: Number,
    default: 0
  },
  estimatedCost: {
    type: Number,
    default: 0
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
    { priority: 1 }
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
