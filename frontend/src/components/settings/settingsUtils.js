import {
  UserCircle2,
  Building2,
  Wallet,
  ReceiptText,
  Bell,
  HandCoins,
  Files,
  Shield,
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';

export const safeText = (value, fallback = '-') => {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text && text.toLowerCase() !== 'undefined' && text.toLowerCase() !== 'null' && text.toLowerCase() !== 'nan'
    ? text
    : fallback;
};

export const safeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const formatDateTime = (value) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('en-UG');
};

export const formatMoney = (value, currency = 'UGX') => {
  const amount = safeNumber(value, 0);
  return `${currency} ${Math.round(amount).toLocaleString('en-UG')}`;
};

export const settingsTabs = [
  { id: 'profile', label: 'Profile', icon: UserCircle2 },
  { id: 'business', label: 'Business', icon: Building2 },
  { id: 'payments', label: 'Payments', icon: Wallet },
  { id: 'receipts', label: 'Receipts & Invoices', icon: ReceiptText },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'rentLease', label: 'Rent & Lease', icon: HandCoins },
  { id: 'documents', label: 'Documents', icon: Files },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'subscription', label: 'Subscription', icon: Sparkles },
  { id: 'preferences', label: 'Preferences', icon: SlidersHorizontal }
];

export const defaultSettingsState = {
  profile: {
    fullName: '',
    email: '',
    phone: '',
    whatsappNumber: '',
    profilePhoto: '',
    accountId: '',
    role: 'self_owner',
    accountStatus: 'Active',
    memberSince: null,
    lastLogin: null
  },
  business: {
    businessName: '',
    businessType: 'Property Owner',
    registrationId: '',
    email: '',
    phone: '',
    whatsappNumber: '',
    address: '',
    city: '',
    district: '',
    country: 'Uganda',
    workingHours: '',
    description: '',
    logo: '',
    favicon: '',
    primaryColor: '#2563eb',
    secondaryColor: '#0f172a'
  },
  payments: {
    cash: { enabled: true, number: '', accountName: '' },
    mtnMobileMoney: { enabled: false, number: '', accountName: '' },
    airtelMoney: { enabled: false, number: '', accountName: '' },
    bankTransfer: { enabled: false, bankName: '', accountName: '', accountNumber: '', branch: '' },
    cardOnlinePayment: { enabled: false, accountName: '' },
    defaultMethod: 'cash',
    allowPartialPayments: true,
    allowAdvancePayments: true,
    gracePeriodDays: 5,
    lateFeeType: 'fixed',
    lateFeeAmount: 0,
    showPaymentFeeTips: true,
    requirePaymentReference: false
  },
  receiptsInvoices: {
    receiptHeaderName: 'Invoice',
    receiptPrefix: 'RCPT',
    invoicePrefix: 'INV',
    showQrVerificationCode: false,
    showOwnerContactOnReceipt: true,
    showBalanceOnReceipt: true,
    showSignatureOnReceipt: false,
    receiptFooterMessage: 'Thank you for your payment.',
    defaultReceiptStatus: 'Paid',
    autoGenerateMonthlyInvoices: false,
    invoiceDueDay: 5,
    showTenantBalance: true,
    showPaymentInstructions: true
  },
  notifications: {
    emailNotifications: true,
    smsNotifications: false,
    whatsappNotifications: false,
    inAppNotifications: true,
    whatsappNumber: '',
    notificationEmail: '',
    rentPaymentAlerts: true,
    overdueRentAlerts: true,
    maintenanceRequestAlerts: true,
    leaseExpiryAlerts: true,
    tenantRegistrationAlerts: true,
    documentExpiryAlerts: true,
    invoiceGeneratedAlerts: true,
    failedPaymentAlerts: true,
    propertyRulesNotice: '',
    dailySummary: false,
    weeklySummary: true,
    monthlySummary: true
  },
  rentLease: {
    defaultRentDueDay: 5,
    gracePeriodDays: 5,
    autoMarkOverdueRent: true,
    allowPartialPayments: true,
    allowAdvancePayments: true,
    latePaymentFee: 0,
    latePaymentFeeType: 'fixed',
    securityDepositRequired: true,
    securityDepositType: 'amount',
    securityDepositValue: 1,
    defaultCurrency: 'UGX',
    defaultLeaseDurationMonths: 12,
    leaseExpiryReminderDays: 30,
    autoGenerateLeaseDocuments: true,
    requireTenantIdBeforeLease: true,
    requireLcLetterBeforeLease: false,
    defaultMoveInChecklist: '',
    defaultMoveOutChecklist: ''
  },
  documents: {
    autoGeneratePaymentReceipts: true,
    autoGenerateTenantProfileDocuments: true,
    autoGeneratePropertyProfileDocuments: true,
    autoGenerateUnitProfileDocuments: true,
    autoGenerateMaintenanceApprovalDocuments: true,
    autoGenerateMaintenanceCompletionDocuments: true,
    autoGenerateMonthlyAssessmentReports: true,
    autoGenerateLeaseDocuments: true,
    allowTenantDocumentUploads: true,
    allowTenantMaintenanceImageUploads: true,
    showDocumentsToTenant: true,
    requireApprovalBeforeTenantDocumentAcceptance: true,
    documentExpiryReminders: true,
    watermarkDocuments: false,
    preventDocumentDownloadByTenant: false,
    encryptSensitiveDocuments: false,
    sendExpiryReminderBeforeDays: 30
  },
  security: {
    twoFactorEnabled: false,
    sessionTimeoutMinutes: 60
  },
  subscriptionSnapshot: {
    planName: 'Trial',
    status: 'trial',
    billingCycle: 'monthly',
    nextBillingDate: null,
    subscriptionStartDate: null,
    subscriptionExpiryDate: null
  },
  preferences: {
    language: 'English',
    theme: 'light',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    currency: 'UGX',
    currencyFormat: 'UGX 1,234',
    defaultDashboardView: 'Overview',
    rowsPerPage: 25,
    compactTableView: false,
    enableKeyboardShortcuts: true,
    country: 'Uganda'
  }
};

export const businessTypes = ['Real Estate', 'Landlord', 'Property Owner', 'Rentals', 'Property Management', 'Other'];
export const paymentMethodOptions = ['cash', 'mtnMobileMoney', 'airtelMoney', 'bankTransfer', 'cardOnlinePayment'];

export const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error('Unable to read file'));
  reader.readAsDataURL(file);
});
