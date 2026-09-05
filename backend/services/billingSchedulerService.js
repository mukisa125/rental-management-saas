const Company = require('../models/Company');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const { createRenewalTransaction } = require('./billingLifecycleService');
const { getPaymentProvider } = require('./paymentProviderService');

const findDueSubscriptions = async ({ daysAhead = 7 } = {}) => {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const companies = await Company.find({
    deletedAt: null,
    subscriptionStatus: { $in: ['trial', 'active'] },
    $or: [
      { subscriptionEndDate: { $lte: windowEnd } },
      { nextPaymentDueDate: { $lte: windowEnd } },
      { trialEndsAt: { $lte: windowEnd } }
    ]
  }).populate('subscriptionPlan');

  return companies;
};

const processRenewalForCompany = async (company, options = {}) => {
  const paymentMethod = company.paymentProvider || options.paymentMethod || 'manual';
  const billingCycle = company.billingCycle || options.billingCycle || 'monthly';
  const plan = company.subscriptionPlan || await SubscriptionPlan.findById(company.subscriptionPlan);

  if (!plan) {
    throw new Error('Subscription plan not found for renewal');
  }

  const provider = getPaymentProvider(paymentMethod);
  const paymentResult = await provider.processPayment({
    companyId: company._id,
    amount: plan.monthlyPrice || plan.price || 0,
    currency: 'UGX',
    billingCycle,
    paymentMethod,
    planId: plan._id,
    phoneNumber: company.phone
  });

  const renewal = await createRenewalTransaction({
    companyId: company._id,
    planId: plan._id,
    billingCycle,
    paymentMethod,
    months: 1,
    invoicePrefix: 'REN'
  });

  return {
    success: true,
    companyId: company._id,
    providerResult: paymentResult,
    renewal,
    paymentMethod,
    amount: renewal.amount
  };
};

const runRenewalSweep = async ({ daysAhead = 7 } = {}) => {
  const companies = await findDueSubscriptions({ daysAhead });
  const results = [];

  for (const company of companies) {
    try {
      const result = await processRenewalForCompany(company);
      results.push(result);
    } catch (error) {
      results.push({
        success: false,
        companyId: company._id,
        error: error.message
      });
    }
  }

  return {
    processed: results.length,
    results
  };
};

module.exports = {
  findDueSubscriptions,
  processRenewalForCompany,
  runRenewalSweep
};
