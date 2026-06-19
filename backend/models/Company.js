const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  ownerName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  logo: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  superAdmin: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subscriptionPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true
  },
  subscriptionStatus: {
    type: String,
    enum: ['trial', 'active', 'expired', 'suspended', 'cancelled'],
    default: 'trial'
  },
  trialEndsAt: {
    type: Date
  },
  subscriptionStartDate: {
    type: Date
  },
  subscriptionEndDate: {
    type: Date
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'annual'],
    default: 'monthly'
  },
  autoRenewal: {
    type: Boolean,
    default: true
  },
  gracePeriodDays: {
    type: Number,
    default: 7
  },
  totalProperties: {
    type: Number,
    default: 0
  },
  totalUnits: {
    type: Number,
    default: 0
  },
  totalManagers: {
    type: Number,
    default: 0
  },
  totalOwners: {
    type: Number,
    default: 0
  },
  totalTenants: {
    type: Number,
    default: 0
  },
  monthlyRevenue: {
    type: Number,
    default: 0
  },
  annualRevenue: {
    type: Number,
    default: 0
  },
  paymentMethodId: {
    type: String,
    trim: true
  },
  paymentProvider: {
    type: String,
    enum: ['stripe', 'paypal', 'flutterwave', 'mobile_money', 'manual'],
    default: 'manual'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastPaymentDate: {
    type: Date
  },
  nextPaymentDueDate: {
    type: Date
  },
  metadata: mongoose.Schema.Types.Mixed,
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  indexes: [
    { companyName: 1 },
    { email: 1 },
    { superAdmin: 1 },
    { subscriptionStatus: 1 },
    { isActive: 1 },
    { createdAt: -1 }
  ]
});

// Soft delete support
companySchema.query.active = function() {
  return this.where({ deletedAt: null });
};

module.exports = mongoose.model('Company', companySchema);
