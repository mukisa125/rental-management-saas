const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
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
  amount: {
    type: Number,
    required: true
  },
  amountPaid: {
    type: Number,
    default: 0
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidDate: {
    type: Date
  },
  status: {
    type: String,
    enum: ['paid', 'pending', 'overdue', 'partial', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'mobile_money', 'card', 'check', 'online', 'other'],
    default: 'cash'
  },
  paymentPeriod: {
    month: Number,
    year: Number
  },
  transactionId: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  receiptNumber: {
    type: String
  },
  receiptUrl: {
    type: String,
    trim: true
  },
  penalties: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  gracePeriodUsed: {
    type: Boolean,
    default: false
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
    { tenant: 1, createdAt: -1 },
    { owner: 1 },
    { dueDate: 1 },
    { receiptNumber: 1 }
  ]
});

// Generate receipt number before saving
paymentSchema.pre('save', async function() {
  if (!this.receiptNumber) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.receiptNumber = `RCP-${timestamp}-${random}`;
  }
});

// Soft delete support
paymentSchema.query.active = function() {
  return this.where({ deletedAt: null });
};

module.exports = mongoose.model('Payment', paymentSchema);
