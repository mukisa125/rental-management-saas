const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
  requestId: {
    type: String,
    unique: true
  },
  tenant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tenant',
    required: true
  },
  property: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  unit: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unit',
    required: true
  },
  issue: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
    default: 'open'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedDate: {
    type: Date
  },
  resolutionNotes: {
    type: String,
    trim: true
  },
  images: [{
    type: String
  }]
}, {
  timestamps: true
});

// Generate request ID before saving
maintenanceSchema.pre('save', async function() {
  if (!this.requestId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.requestId = `MTN-${timestamp}-${random}`;
  }
});

module.exports = mongoose.model('Maintenance', maintenanceSchema);
