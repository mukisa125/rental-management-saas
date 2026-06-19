const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    gps: {
      latitude: Number,
      longitude: Number
    }
  },
  propertyType: {
    type: String,
    enum: ['apartment', 'house', 'commercial', 'land', 'other'],
    default: 'apartment'
  },
  description: {
    type: String,
    trim: true
  },
  totalUnits: {
    type: Number,
    default: 0
  },
  occupiedUnits: {
    type: Number,
    default: 0
  },
  vacantUnits: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'maintenance'],
    default: 'active'
  },
  image: {
    type: String
  },
  images: [{
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  amenities: [{
    name: String,
    icon: String
  }],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  yearBuilt: Number,
  area: Number,
  documents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document'
  }],
  monthlyIncome: {
    type: Number,
    default: 0
  },
  annualIncome: {
    type: Number,
    default: 0
  },
  occupancyRate: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  indexes: [
    { company: 1, owner: 1 },
    { company: 1, status: 1 },
    { owner: 1 },
    { createdAt: -1 }
  ]
});

// Soft delete support
propertySchema.query.active = function() {
  return this.where({ deletedAt: null });
};

// Update vacant units before saving
propertySchema.pre('save', async function() {
  this.vacantUnits = this.totalUnits - this.occupiedUnits;
});

module.exports = mongoose.model('Property', propertySchema);
