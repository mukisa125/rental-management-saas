const mongoose = require('mongoose');

const unitSchema = new mongoose.Schema({
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
  rentAmount: {
    type: Number,
    required: true
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
    enum: ['vacant', 'occupied', 'maintenance'],
    default: 'vacant'
  },
  currentTenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Unit', unitSchema);
