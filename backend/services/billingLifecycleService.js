const Company = require('../models/Company');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const SubscriptionTransaction = require('../models/SubscriptionTransaction');
const BillingTransaction = require('../models/BillingTransaction');
const { getPaymentProvider } = require('./paymentProviderService');

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const addMonths = (date, months) => {
  const target = new Date(date);
  target.setMonth(target.getMonth() + Math.max(0, months));
  return target;
};

const normalizeSubscriptionStatus = ({ company, now = new Date() }) => {
  if (!company) return 'trial';

  const currentStatus = String(company.subscriptionStatus || 'trial').toLowerCase();
  if (currentStatus === 'cancelled') return 'cancelled';
  if (currentStatus === 'suspended') return 'suspended';

  const trialEndsAt = toDate(company.trialEndsAt);
  if (currentStatus === 'trial' && trialEndsAt && now < trialEndsAt) {
    return 'trial';
  }

  const endDate = toDate(company.subscriptionEndDate);
  if (endDate && now > endDate) {
    return 'expired';
  }

  if (currentStatus === 'expired') {
    return 'expired';
  }

  return 'active';
};

const generateInvoiceNumber = (prefix = 'INV') => {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${Date.now()}-${random}`;
};

const calculatePlanAmount = ({ plan, billingCycle, months = 1 }) => {
  if (!plan) return 0;

  const normalizedCycle = String(billingCycle || 'monthly').toLowerCase();
  const monthsCount = Math.max(1, Math.round(toNumber(months, 1)));

  if (normalizedCycle === 'annual') {
    const annualAmount = toNumber(plan.annualPrice, toNumber(plan.monthlyPrice, 0));
    return Number(((annualAmount / 12) * monthsCount).toFixed(2));
  }

  const monthlyAmount = toNumber(plan.monthlyPrice, toNumber(plan.price, 0));
  return Number((monthlyAmount * monthsCount).toFixed(2));
};

const refreshCompanySubscriptionState = async (companyId) => {
  const company = await Company.findById(companyId).populate('subscriptionPlan');
  if (!company) {
    return null;
  }

  const nextStatus = normalizeSubscriptionStatus({ company });

  if (company.subscriptionStatus !== nextStatus) {
    company.subscriptionStatus = nextStatus;
    if (nextStatus === 'expired') {
      company.isActive = false;
    } else if (nextStatus === 'active') {
      company.isActive = true;
    }
    await company.save();
  }

  return company;
};

const createInvoiceRecord = async ({
  companyId,
  userId,
  planId,
  amount,
  currency = 'UGX',
  paymentMethod = 'manual',
  billingCycle = 'monthly',
  transactionType = 'subscription',
  status = 'pending',
  reference = '',
  provider = 'manual',
  paymentFor = 'landlord_subscription'
}) => {
  const invoiceNumber = generateInvoiceNumber();

  const record = await BillingTransaction.create({
    transactionId: invoiceNumber,
    userId: userId || companyId,
    userType: 'landlord',
    planId,
    paymentFor,
    chargeType: 'monthly_seeker_plan',
    amount: toNumber(amount, 0),
    totalAmount: toNumber(amount, 0),
    currency,
    paymentMethod,
    paymentProvider: provider,
    providerReference: reference,
    providerTransactionId: reference,
    status,
    provider: provider === 'manual' ? 'manual' : provider,
    providerStatus: status,
    autoBillingEnabled: true,
    autoRenewEnabled: true,
    startDate: new Date(),
    expiryDate: billingCycle === 'annual' ? addMonths(new Date(), 12) : addMonths(new Date(), 1)
  });

  return record;
};

const createRenewalTransaction = async ({ companyId, planId, billingCycle = 'monthly', paymentMethod = 'manual', months = 1 }) => {
  const company = await Company.findById(companyId).populate('subscriptionPlan');
  if (!company) {
    throw new Error('Company not found');
  }

  const plan = planId ? await SubscriptionPlan.findById(planId) : company.subscriptionPlan;
  if (!plan) {
    throw new Error('Subscription plan not found');
  }

  const amount = calculatePlanAmount({ plan, billingCycle, months });
  const startDate = new Date();
  const endDate = billingCycle === 'annual' ? addMonths(startDate, 12 * months) : addMonths(startDate, months);

  const transaction = await SubscriptionTransaction.create({
    company: companyId,
    subscriptionPlan: plan._id,
    amount,
    currency: 'UGX',
    billingCycle,
    transactionType: 'subscription',
    paymentMethod,
    status: 'pending',
    startDate,
    endDate,
    paymentId: '',
    invoiceId: generateInvoiceNumber('SUB'),
    invoiceUrl: '',
    receiptUrl: ''
  });

  await createInvoiceRecord({
    companyId,
    userId: company.superAdmin,
    planId: plan._id,
    amount,
    currency: 'UGX',
    paymentMethod,
    billingCycle,
    transactionType: 'subscription',
    status: 'pending',
    reference: transaction._id.toString(),
    provider: paymentMethod === 'manual' ? 'manual' : paymentMethod,
    paymentFor: 'landlord_subscription'
  });

  company.nextPaymentDueDate = endDate;
  company.subscriptionEndDate = endDate;
  company.subscriptionStatus = 'active';
  company.isActive = true;
  await company.save();

  return { company, transaction, amount };
};

const renewExpiredSubscription = async ({ companyId, paymentMethod = 'manual', billingCycle = 'monthly' }) => {
  const company = await Company.findById(companyId).populate('subscriptionPlan');
  if (!company) {
    throw new Error('Company not found');
  }

  const plan = company.subscriptionPlan;
  if (!plan) {
    throw new Error('Company does not have an active subscription plan');
  }

  const normalizedCycle = String(company.billingCycle || billingCycle || 'monthly').toLowerCase();
  const amount = calculatePlanAmount({
    plan,
    billingCycle: normalizedCycle,
    months: 1
  });

  const provider = getPaymentProvider(paymentMethod);
  const paymentResult = await provider.processPayment({
    companyId: company._id,
    amount,
    currency: 'UGX',
    billingCycle: normalizedCycle,
    paymentMethod,
    planId: plan._id,
    invoiceNumber: generateInvoiceNumber('REN')
  });

  if (!paymentResult || !paymentResult.success) {
    throw new Error(paymentResult?.error || 'Payment renewal failed');
  }

  const nextEndDate = normalizedCycle === 'annual' ? addMonths(new Date(), 12) : addMonths(new Date(), 1);
  company.subscriptionStatus = 'active';
  company.isActive = true;
  company.lastPaymentDate = new Date();
  company.subscriptionStartDate = company.subscriptionStartDate || new Date();
  company.subscriptionEndDate = nextEndDate;
  company.nextPaymentDueDate = nextEndDate;
  company.billingCycle = normalizedCycle;
  company.paymentProvider = paymentMethod;
  await company.save();

  return {
    success: true,
    company,
    paymentResult,
    amount
  };
};

module.exports = {
  toNumber,
  toDate,
  addMonths,
  normalizeSubscriptionStatus,
  refreshCompanySubscriptionState,
  createInvoiceRecord,
  createRenewalTransaction,
  renewExpiredSubscription,
  calculatePlanAmount,
  generateInvoiceNumber
};
