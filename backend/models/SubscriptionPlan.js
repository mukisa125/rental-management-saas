const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    enum: ['Trial', 'Starter', 'Professional', 'Business', 'Enterprise']
  },
  description: {
    type: String,
    trim: true
  },
  monthlyPrice: {
    type: Number,
    required: true,
    min: 0
  },
  annualPrice: {
    type: Number,
    required: true,
    min: 0
  },
  trialDays: {
    type: Number,
    default: 0
  },
  maxProperties: {
    type: Number,
    default: null // null means unlimited
  },
  maxUnits: {
    type: Number,
    default: null
  },
  maxManagers: {
    type: Number,
    default: null
  },
  maxOwners: {
    type: Number,
    default: null
  },
  maxTenants: {
    type: Number,
    default: null
  },
  features: [{
    name: {
      type: String,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    enabled: {
      type: Boolean,
      default: true
    }
  }],
  customBranding: {
    type: Boolean,
    default: false
  },
  apiAccess: {
    type: Boolean,
    default: false
  },
  advancedReporting: {
    type: Boolean,
    default: false
  },
  automationWorkflows: {
    type: Boolean,
    default: false
  },
  prioritySupport: {
    type: Boolean,
    default: false
  },
  customIntegrations: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  targetUserType: {
    type: String,
    enum: ['manager', 'owner', 'self_owner', 'all'],
    default: 'all'
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  indexes: [
    { name: 1 },
    { status: 1 },
    { isActive: 1 }
  ]
});

// Query helper for active plans
subscriptionPlanSchema.query.active = function() {
  return this.where({ isActive: true, deletedAt: null });
};

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
