const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['super_admin', 'manager', 'owner', 'self_owner', 'tenant', 'property_seeker'],
    default: 'manager'
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalDate: {
    type: Date
  },
  rejectionReason: {
    type: String
  },
  avatar: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  whatsAppNumber: {
    type: String,
    trim: true
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company'
  },
  companyName: {
    type: String,
    trim: true
  },
  permissions: [{
    type: String,
    trim: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  passwordChangedAt: {
    type: Date
  },
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
  },
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: {
    type: String
  },
  notificationPreferences: {
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    pushNotifications: { type: Boolean, default: true },
    inAppNotifications: { type: Boolean, default: true }
  },
  tenantSettings: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'light'
    },
    language: {
      type: String,
      default: 'English'
    },
    paymentReminders: {
      enabled: { type: Boolean, default: true },
      timing: { type: String, default: '3_days' },
      channels: {
        email: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
        whatsapp: { type: Boolean, default: false }
      }
    }
  },
  propertySeekerProfile: {
    fullName: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phoneNumber: { type: String, trim: true },
    address: { type: String, trim: true },
    location: { type: String, trim: true },
    googleId: { type: String, trim: true },
    profilePhoto: { type: String, trim: true },
    preferredSearchArea: { type: String, trim: true },
    preferredLocation: { type: String, trim: true },
    budgetMin: { type: Number, default: 0 },
    budgetMax: { type: Number, default: 0 },
    desiredPropertyType: { type: String, trim: true },
    status: { type: String, enum: ['active', 'suspended'], default: 'active' }
  },
  propertySeekerStats: {
    totalSearches: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
    totalUnlocks: { type: Number, default: 0 },
    totalVisits: { type: Number, default: 0 },
    walletBalance: { type: Number, default: 0 },
    remainingViews: { type: Number, default: 0 },
    totalViewsPurchased: { type: Number, default: 0 },
    totalViewsUsed: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    lastActiveAt: { type: Date }
  },
  propertySeekerSubscription: {
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubscriptionPlan', default: null },
    status: { type: String, enum: ['active', 'trial', 'expired', 'past_due', 'cancelled'], default: 'trial' },
    billingCycle: { type: String, enum: ['monthly', 'annual', 'pay_per_use', 'credit_bundle'], default: 'pay_per_use' },
    startDate: { type: Date, default: null },
    expiryDate: { type: Date, default: null },
    renewalDate: { type: Date, default: null },
    assignmentType: { type: String, enum: ['manual', 'automatic'], default: 'manual' },
    autoBillingEnabled: { type: Boolean, default: false },
    autoRenewEnabled: { type: Boolean, default: false }
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  indexes: [
    { email: 1 },
    { company: 1 },
    { role: 1 },
    { isActive: 1 },
    { createdAt: -1 }
  ]
});

// Soft delete support
userSchema.query.active = function() {
  return this.where({ deletedAt: null });
};

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
