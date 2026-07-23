const mongoose = require('mongoose');

const listingUnlockSchema = new mongoose.Schema({
  seekerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  listingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: true,
    index: true
  },
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true,
    index: true
  },
  unitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: true,
    index: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  billingTransactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BillingTransaction',
    default: null
  },
  unlockedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'expired'],
    default: 'active',
    index: true
  }
}, {
  timestamps: true
});

listingUnlockSchema.index({ seekerId: 1, listingId: 1, status: 1, expiresAt: -1 });

module.exports = mongoose.model('ListingUnlock', listingUnlockSchema);
