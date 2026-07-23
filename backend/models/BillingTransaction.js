const mongoose = require('mongoose');

const billingTransactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userType: {
    type: String,
    enum: ['landlord', 'property_seeker', 'tenant'],
    required: true
  },
  planId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubscriptionPlan',
    default: null
  },
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PlanAssignment',
    default: null
  },
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  seekerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  visitBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  paymentFor: {
    type: String,
    enum: [
      'landlord_subscription',
      'listing_detail_unlock',
      'per_view_charge',
      'map_location_reveal',
      'landlord_contact_reveal',
      'visit_booking',
      'credit_bundle',
      'property_view_package',
      'premium_seeker_plan',
      'other'
    ],
    default: 'other'
  },
  chargeType: {
    type: String,
    enum: ['per_view', 'detail_unlock', 'map_reveal', 'contact_reveal', 'visit_booking', 'credit_bundle', 'monthly_seeker_plan', 'other'],
    default: 'other'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  selectedViews: {
    type: Number,
    default: 0,
    min: 0
  },
  pricePerView: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'UGX'
  },
  paymentMethod: {
    type: String,
    enum: ['mtn_mobile_money', 'airtel_money', 'bank_transfer', 'card_payment', 'cash', 'manual', 'pending_gateway'],
    default: 'manual'
  },
  status: {
    type: String,
    enum: ['paid', 'pending', 'failed', 'cancelled', 'refunded', 'partial'],
    default: 'pending'
  },
  providerReference: {
    type: String,
    trim: true,
    default: ''
  },
  manualRecordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  paidAt: {
    type: Date,
    default: null
  },
  startDate: {
    type: Date,
    default: null
  },
  expiryDate: {
    type: Date,
    default: null
  },
  subscribedMonths: {
    type: Number,
    default: 1,
    min: 1
  },
  provider: {
    type: String,
    enum: ['mtn', 'airtel', 'flutterwave', 'manual', 'pending_gateway', 'none'],
    default: 'none'
  },
  paymentProvider: {
    type: String,
    trim: true,
    default: ''
  },
  providerTransactionId: {
    type: String,
    trim: true,
    default: ''
  },
  providerStatus: {
    type: String,
    trim: true,
    default: ''
  },
  callbackPayload: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  paymentRequestId: {
    type: String,
    trim: true,
    default: ''
  },
  phoneNumber: {
    type: String,
    trim: true,
    default: ''
  },
  mobileMoneyNumber: {
    type: String,
    trim: true,
    default: ''
  },
  creditsAppliedAt: {
    type: Date,
    default: null
  },
  autoBillingEnabled: {
    type: Boolean,
    default: false
  },
  autoRenewEnabled: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

billingTransactionSchema.index({ status: 1, createdAt: -1, deletedAt: 1 });
billingTransactionSchema.index({ userType: 1, paymentFor: 1, createdAt: -1 });

module.exports = mongoose.model('BillingTransaction', billingTransactionSchema);
