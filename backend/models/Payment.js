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
    enum: ['paid', 'pending', 'overdue', 'partial', 'failed', 'reversed', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'mobile_money', 'mtn_mobile_money', 'airtel_money', 'card', 'check', 'online', 'other'],
    default: 'cash'
  },
  paymentFor: {
    type: String,
    trim: true,
    default: ''
  },
  monthlyRent: {
    type: Number,
    default: 0,
    min: 0
  },
  previousBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  remainingBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  paymentReference: {
    type: String,
    trim: true,
    default: ''
  },
  paymentDate: {
    type: Date
  },
  proofOfPayment: {
    base64: { type: String, default: '' },
    contentType: { type: String, default: '' },
    originalName: { type: String, default: '' },
    size: { type: Number, default: 0 },
    uploadedAt: { type: Date }
  },
  paymentPeriod: {
    month: Number,
    year: Number
  },
  // YYYY-MM string representation of the billing month, e.g. "2026-01"
  paymentPeriodStr: {
    type: String,
    trim: true
  },
  paymentYear: {
    type: Number
  },
  paymentMonth: {
    type: Number,
    min: 1,
    max: 12
  },
  // Running balance (amount - amountPaid); updated whenever a payment is recorded
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  // Indicates the document was auto-generated during tenant allocation
  isGenerated: {
    type: Boolean,
    default: false
  },
  generatedFrom: {
    type: String,
    enum: ['tenant_allocation', 'manual', 'system', ''],
    default: ''
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
  receivedBy: {
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

// Generate a readable receipt number scoped to the owner and calendar year.
// The unique compound index below also protects against a duplicate if two
// payments are recorded at the same instant.
paymentSchema.pre('save', async function() {
  if (!this.receiptNumber) {
    const year = (this.paymentDate || this.paidDate || new Date()).getFullYear();
    const prefix = `RCPT-${year}-`;
    const latest = await this.constructor
      .findOne({ owner: this.owner, receiptNumber: new RegExp(`^${prefix}\\d{4}$`) })
      .sort({ receiptNumber: -1 })
      .select('receiptNumber')
      .lean();
    const currentSequence = Number.parseInt(latest?.receiptNumber?.slice(prefix.length), 10) || 0;
    this.receiptNumber = `${prefix}${String(currentSequence + 1).padStart(4, '0')}`;
  }
});

paymentSchema.index({ owner: 1, receiptNumber: 1 }, { unique: true, sparse: true });

// Soft delete support
paymentSchema.query.active = function() {
  return this.where({ deletedAt: null });
};

module.exports = mongoose.model('Payment', paymentSchema);
