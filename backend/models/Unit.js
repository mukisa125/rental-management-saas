const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  unitNumber: {
    type: String,
    required: true,
    trim: true
  },
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rentAmount: {
    type: Number,
    required: true
  },
  depositAmount: {
    type: Number,
    default: 0
  },
  bedrooms: {
    type: Number,
    default: 1
  },
  bathrooms: {
    type: Number,
    default: 1
  },
  area: {
    type: Number
  },
  status: {
    type: String,
    enum: ['vacant', 'occupied', 'maintenance', 'reserved'],
    default: 'vacant'
  },
  currentTenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant'
  },
  leaseStartDate: {
    type: Date
  },
  leaseEndDate: {
    type: Date
  },
  amenities: [{
    name: String,
    description: String
  }],
  features: [{
    name: String,
    description: String
  }],
  images: [{
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  documents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],
  maintenanceHistory: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Maintenance'
  }],
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  indexes: [
    { company: 1, property: 1 },
    { company: 1, status: 1 },
    { property: 1, owner: 1 },
    { currentTenant: 1 },
    { createdAt: -1 }
  ]
});

// Soft delete support
unitSchema.query.active = function() {
  return this.where({ deletedAt: null });
};

module.exports = mongoose.model('Unit', unitSchema);
