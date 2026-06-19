const mongoose = require('mongoose');

const systemSettingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  value: mongoose.Schema.Types.Mixed,
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: [
      'platform',
      'payment',
      'email',
      'sms',
      'notification',
      'security',
      'backup',
      'api',
      'theme'
    ]
  },
  dataType: {
    type: String,
    enum: ['string', 'number', 'boolean', 'json', 'array'],
    default: 'string'
  },
  isEditable: {
    type: Boolean,
    default: true
  },
  isPublic: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  indexes: [
    { key: 1 },
    { category: 1 }
  ]
});

// Predefined settings
const DEFAULT_SETTINGS = [
  { key: 'platform_name', value: 'Rental Management SaaS', category: 'platform' },
  { key: 'platform_logo', value: '', category: 'platform' },
  { key: 'platform_email', value: 'noreply@rentalsaas.com', category: 'platform' },
  { key: 'smtp_host', value: '', category: 'email' },
  { key: 'smtp_port', value: 587, category: 'email' },
  { key: 'smtp_user', value: '', category: 'email' },
  { key: 'smtp_password', value: '', category: 'email' },
  { key: 'sms_provider', value: 'twilio', category: 'sms' },
  { key: 'sms_api_key', value: '', category: 'sms' },
  { key: 'stripe_key', value: '', category: 'payment' },
  { key: 'stripe_secret', value: '', category: 'payment' },
  { key: 'paypal_client_id', value: '', category: 'payment' },
  { key: 'paypal_secret', value: '', category: 'payment' },
  { key: 'flutterwave_key', value: '', category: 'payment' },
  { key: 'enable_email_notifications', value: true, category: 'notification' },
  { key: 'enable_sms_notifications', value: false, category: 'notification' },
  { key: 'enable_push_notifications', value: false, category: 'notification' },
  { key: 'jwt_expiration', value: '30d', category: 'security' },
  { key: 'password_expiration_days', value: 90, category: 'security' },
  { key: 'max_failed_login_attempts', value: 5, category: 'security' },
  { key: 'lockout_duration_minutes', value: 15, category: 'security' },
  { key: 'backup_enabled', value: true, category: 'backup' },
  { key: 'backup_frequency', value: 'daily', category: 'backup' },
  { key: 'api_rate_limit', value: 1000, category: 'api' },
  { key: 'maintenance_mode', value: false, category: 'platform' }
];

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
module.exports.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
