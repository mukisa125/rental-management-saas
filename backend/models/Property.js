const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
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
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Update vacant units before saving
propertySchema.pre('save', function(next) {
  this.vacantUnits = this.totalUnits - this.occupiedUnits;
  next();
});

module.exports = mongoose.model('Property', propertySchema);
