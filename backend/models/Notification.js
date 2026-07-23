const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: [
      'rent_due',
      'rent_overdue',
      'payment_confirmation',
      'payment_failed',
      'maintenance_request',
      'maintenance_update',
      'maintenance_completed',
      'lease_renewal',
      'lease_expiring',
      'tenant_registered',
      'tenant_application',
      'tenant_approved',
      'announcement',
      'subscription_alert',
      'system_alert',
      'account_alert',
      'document_shared',
      'report_ready'
    ],
    default: 'announcement'
  },
  relatedEntity: {
    entityType: {
      type: String,
      enum: ['property', 'tenant', 'tenant_application', 'payment', 'maintenance', 'lease', 'subscription', 'system', 'user'],
      required: false
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false
    }
  },
  isRead: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  readAt: {
    type: Date
  },
  channels: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: false },
    sms: { type: Boolean, default: false },
    whatsapp: { type: Boolean, default: false },
    push: { type: Boolean, default: false }
  },
  sentAt: {
    inApp: Date,
    email: Date,
    sms: Date,
    whatsapp: Date,
    push: Date
  },
  actionUrl: {
    type: String,
    trim: true
  },
  actionButton: {
    label: String,
    url: String
  },
  metadata: mongoose.Schema.Types.Mixed,
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  indexes: [
    { company: 1, user: 1, isRead: 1 },
    { user: 1, createdAt: -1 },
    { company: 1, createdAt: -1 },
    { priority: 1 }
  ]
});

// Soft delete support
notificationSchema.query.active = function() {
  return this.where({ deletedAt: null });
};

module.exports = mongoose.model('Notification', notificationSchema);
