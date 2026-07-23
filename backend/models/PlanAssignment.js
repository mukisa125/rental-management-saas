const mongoose = require('mongoose');

const planAssignmentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null
  },
  userType: {
    type: String,
    enum: ['landlord', 'property_seeker'],
    required: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'trial', 'expired', 'past_due', 'cancelled'],
    default: 'trial'
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'annual', 'pay_per_use', 'credit_bundle'],
    default: 'monthly'
  },
  startDate: {
    type: Date,
    required: true
  },
  expiryDate: {
    type: Date,
    default: null
  },
  renewalDate: {
    type: Date,
    default: null
  },
  subscribedMonths: {
    type: Number,
    default: 1,
    min: 1
  },
  amount: {
    type: Number,
    default: 0,
    min: 0
  },
  assignmentType: {
    type: String,
    enum: ['manual', 'automatic'],
    default: 'manual'
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

planAssignmentSchema.index({ userId: 1, status: 1, deletedAt: 1 });
planAssignmentSchema.index({ planId: 1, userType: 1, deletedAt: 1 });

module.exports = mongoose.model('PlanAssignment', planAssignmentSchema);
