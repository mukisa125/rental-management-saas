const mongoose = require('mongoose');

const subscriptionTransactionSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  subscriptionPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'annual'],
    required: true
  },
  transactionType: {
    type: String,
    enum: ['subscription', 'upgrade', 'downgrade', 'refund', 'credit', 'adjustment'],
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'paypal', 'flutterwave', 'mobile_money', 'manual', 'credit_card'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  paymentId: {
    type: String,
    trim: true
  },
  invoiceId: {
    type: String,
    trim: true
  },
  invoiceUrl: {
    type: String,
    trim: true
  },
  receiptUrl: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  processedDate: {
    type: Date
  },
  failureReason: {
    type: String,
    trim: true
  },
  retryCount: {
    type: Number,
    default: 0
  },
  maxRetries: {
    type: Number,
    default: 3
  },
  nextRetryDate: {
    type: Date
  },
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true,
  indexes: [
    { company: 1, createdAt: -1 },
    { status: 1, createdAt: -1 },
    { paymentMethod: 1 },
    { invoiceId: 1 }
  ]
});

module.exports = mongoose.model('SubscriptionTransaction', subscriptionTransactionSchema);
