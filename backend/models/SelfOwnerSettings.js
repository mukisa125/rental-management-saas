const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
  enabled: { type: Boolean, default: false },
  number: { type: String, trim: true, default: '' },
  accountName: { type: String, trim: true, default: '' },
  bankName: { type: String, trim: true, default: '' },
  accountNumber: { type: String, trim: true, default: '' },
  branch: { type: String, trim: true, default: '' }
}, { _id: false });

const selfOwnerSettingsSchema = new mongoose.Schema({
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  profile: {
    fullName: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    whatsappNumber: { type: String, trim: true, default: '' },
    profilePhoto: { type: String, trim: true, default: '' }
  },
  business: {
    businessName: { type: String, trim: true, default: '' },
    businessType: { type: String, trim: true, default: 'Property Owner' },
    registrationId: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    whatsappNumber: { type: String, trim: true, default: '' },
    address: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    district: { type: String, trim: true, default: '' },
    country: { type: String, trim: true, default: 'Uganda' },
    workingHours: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    logo: { type: String, trim: true, default: '' },
    favicon: { type: String, trim: true, default: '' },
    primaryColor: { type: String, trim: true, default: '#2563eb' },
    secondaryColor: { type: String, trim: true, default: '#0f172a' }
  },
  payments: {
    cash: { type: paymentMethodSchema, default: () => ({ enabled: true }) },
    mtnMobileMoney: { type: paymentMethodSchema, default: () => ({ enabled: false }) },
    airtelMoney: { type: paymentMethodSchema, default: () => ({ enabled: false }) },
    bankTransfer: { type: paymentMethodSchema, default: () => ({ enabled: false }) },
    cardOnlinePayment: { type: paymentMethodSchema, default: () => ({ enabled: false }) },
    defaultMethod: { type: String, trim: true, default: 'cash' },
    allowPartialPayments: { type: Boolean, default: true },
    allowAdvancePayments: { type: Boolean, default: true },
    gracePeriodDays: { type: Number, default: 5, min: 0, max: 90 },
    lateFeeType: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
    lateFeeAmount: { type: Number, default: 0, min: 0 },
    showPaymentFeeTips: { type: Boolean, default: true },
    requirePaymentReference: { type: Boolean, default: false }
  },
  receiptsInvoices: {
    receiptHeaderName: { type: String, trim: true, default: 'Rent Receipt' },
    receiptPrefix: { type: String, trim: true, default: 'RCPT' },
    invoicePrefix: { type: String, trim: true, default: 'INV' },
    showQrVerificationCode: { type: Boolean, default: false },
    showOwnerContactOnReceipt: { type: Boolean, default: true },
    showBalanceOnReceipt: { type: Boolean, default: true },
    showSignatureOnReceipt: { type: Boolean, default: false },
    receiptFooterMessage: { type: String, trim: true, default: 'Thank you for your payment.' },
    defaultReceiptStatus: { type: String, trim: true, default: 'Paid' },
    autoGenerateMonthlyInvoices: { type: Boolean, default: false },
    invoiceDueDay: { type: Number, default: 5, min: 1, max: 31 },
    showTenantBalance: { type: Boolean, default: true },
    showPaymentInstructions: { type: Boolean, default: true }
  },
  notifications: {
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: false },
    whatsappNotifications: { type: Boolean, default: false },
    inAppNotifications: { type: Boolean, default: true },
    whatsappNumber: { type: String, trim: true, default: '' },
    notificationEmail: { type: String, trim: true, default: '' },
    rentPaymentAlerts: { type: Boolean, default: true },
    overdueRentAlerts: { type: Boolean, default: true },
    maintenanceRequestAlerts: { type: Boolean, default: true },
    leaseExpiryAlerts: { type: Boolean, default: true },
    tenantRegistrationAlerts: { type: Boolean, default: true },
    documentExpiryAlerts: { type: Boolean, default: true },
    invoiceGeneratedAlerts: { type: Boolean, default: true },
    failedPaymentAlerts: { type: Boolean, default: true },
    propertyRulesNotice: { type: String, trim: true, default: '' },
    dailySummary: { type: Boolean, default: false },
    weeklySummary: { type: Boolean, default: true },
    monthlySummary: { type: Boolean, default: true }
  },
  rentLease: {
    defaultRentDueDay: { type: Number, default: 5, min: 1, max: 31 },
    gracePeriodDays: { type: Number, default: 5, min: 0, max: 90 },
    autoMarkOverdueRent: { type: Boolean, default: true },
    allowPartialPayments: { type: Boolean, default: true },
    allowAdvancePayments: { type: Boolean, default: true },
    latePaymentFee: { type: Number, default: 0, min: 0 },
    latePaymentFeeType: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' },
    securityDepositRequired: { type: Boolean, default: true },
    securityDepositType: { type: String, enum: ['amount', 'months'], default: 'amount' },
    securityDepositValue: { type: Number, default: 1, min: 0 },
    defaultCurrency: { type: String, trim: true, default: 'UGX' },
    defaultLeaseDurationMonths: { type: Number, default: 12, min: 1, max: 120 },
    leaseExpiryReminderDays: { type: Number, default: 30, min: 1, max: 365 },
    autoGenerateLeaseDocuments: { type: Boolean, default: true },
    requireTenantIdBeforeLease: { type: Boolean, default: true },
    requireLcLetterBeforeLease: { type: Boolean, default: false },
    defaultMoveInChecklist: { type: String, trim: true, default: '' },
    defaultMoveOutChecklist: { type: String, trim: true, default: '' }
  },
  documents: {
    autoGeneratePaymentReceipts: { type: Boolean, default: true },
    autoGenerateTenantProfileDocuments: { type: Boolean, default: true },
    autoGeneratePropertyProfileDocuments: { type: Boolean, default: true },
    autoGenerateUnitProfileDocuments: { type: Boolean, default: true },
    autoGenerateMaintenanceApprovalDocuments: { type: Boolean, default: true },
    autoGenerateMaintenanceCompletionDocuments: { type: Boolean, default: true },
    autoGenerateMonthlyAssessmentReports: { type: Boolean, default: true },
    autoGenerateLeaseDocuments: { type: Boolean, default: true },
    allowTenantDocumentUploads: { type: Boolean, default: true },
    allowTenantMaintenanceImageUploads: { type: Boolean, default: true },
    showDocumentsToTenant: { type: Boolean, default: true },
    requireApprovalBeforeTenantDocumentAcceptance: { type: Boolean, default: true },
    documentExpiryReminders: { type: Boolean, default: true },
    watermarkDocuments: { type: Boolean, default: false },
    preventDocumentDownloadByTenant: { type: Boolean, default: false },
    encryptSensitiveDocuments: { type: Boolean, default: false },
    sendExpiryReminderBeforeDays: { type: Number, default: 30, min: 1, max: 365 }
  },
  security: {
    twoFactorEnabled: { type: Boolean, default: false },
    sessionTimeoutMinutes: { type: Number, default: 60, min: 5, max: 1440 }
  },
  subscriptionSnapshot: {
    planName: { type: String, trim: true, default: '' },
    status: { type: String, trim: true, default: '' },
    billingCycle: { type: String, trim: true, default: '' },
    nextBillingDate: { type: Date },
    subscriptionStartDate: { type: Date },
    subscriptionExpiryDate: { type: Date }
  },
  preferences: {
    language: { type: String, trim: true, default: 'English' },
    theme: { type: String, enum: ['light', 'dark', 'system'], default: 'light' },
    dateFormat: { type: String, trim: true, default: 'DD/MM/YYYY' },
    timeFormat: { type: String, enum: ['12h', '24h'], default: '24h' },
    currency: { type: String, trim: true, default: 'UGX' },
    currencyFormat: { type: String, trim: true, default: 'UGX 1,234' },
    defaultDashboardView: { type: String, trim: true, default: 'Overview' },
    rowsPerPage: { type: Number, default: 25, min: 5, max: 200 },
    compactTableView: { type: Boolean, default: false },
    enableKeyboardShortcuts: { type: Boolean, default: true },
    country: { type: String, trim: true, default: 'Uganda' }
  }
}, { timestamps: true });

module.exports = mongoose.model('SelfOwnerSettings', selfOwnerSettingsSchema);
