const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
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
  userName: {
    type: String,
    trim: true
  },
  userEmail: {
    type: String,
    lowercase: true,
    trim: true
  },
  action: {
    type: String,
    required: true,
    trim: true,
    enum: [
      'login',
      'logout',
      'register',
      'profile_update',
      'property_create',
      'property_update',
      'property_delete',
      'unit_create',
      'unit_update',
      'unit_delete',
      'tenant_create',
      'tenant_update',
      'tenant_delete',
      'payment_create',
      'payment_update',
      'payment_delete',
      'maintenance_create',
      'maintenance_update',
      'maintenance_delete',
      'document_upload',
      'document_delete',
      'notification_sent',
      'subscription_upgrade',
      'subscription_downgrade',
      'subscription_cancel',
      'payment_process',
      'user_create',
      'user_update',
      'user_delete',
      'role_change',
      'permission_change',
      'settings_update',
      'report_generate',
      'export_data',
      'backup_create',
      'system_action'
    ]
  },
  entity: {
    type: String,
    trim: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId
  },
  entityName: {
    type: String,
    trim: true
  },
  oldValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  changes: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  }],
  description: {
    type: String,
    trim: true
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'pending'],
    default: 'success'
  },
  errorMessage: {
    type: String,
    trim: true
  },
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true,
  indexes: [
    { company: 1, createdAt: -1 },
    { user: 1, createdAt: -1 },
    { action: 1, createdAt: -1 },
    { entity: 1, entityId: 1 },
    { createdAt: -1 }
  ]
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
