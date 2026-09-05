const express = require('express');
const Company = require('../models/Company');
const { protect, authorize } = require('../middleware/rbacMiddleware');
const { createRenewalTransaction, refreshCompanySubscriptionState } = require('../services/billingLifecycleService');
const { runRenewalSweep } = require('../services/billingSchedulerService');
const { handleWebhook, getProviderForCompany } = require('../services/mobileMoneyGatewayService');

const router = express.Router();

router.get('/status/:companyId', protect, async (req, res) => {
  try {
    const company = await Company.findById(req.params.companyId).populate('subscriptionPlan');
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const refreshed = await refreshCompanySubscriptionState(company._id);

    return res.json({
      success: true,
      company: refreshed || company,
      status: refreshed?.subscriptionStatus || company.subscriptionStatus || 'trial',
      nextBillingDate: refreshed?.nextPaymentDueDate || company.nextPaymentDueDate,
      amount: refreshed?.subscriptionPlan ? (refreshed.subscriptionPlan.monthlyPrice || refreshed.subscriptionPlan.price || 0) : 0,
      currency: 'UGX'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/renew/:companyId', protect, authorize('super_admin', 'manager', 'self_owner'), async (req, res) => {
  try {
    const { paymentMethod = 'manual', billingCycle = 'monthly', planId } = req.body || {};
    const company = await Company.findById(req.params.companyId).populate('subscriptionPlan');
    if (!company) {
      return res.status(404).json({ success: false, message: 'Company not found' });
    }

    const selectedPlanId = planId || company.subscriptionPlan?._id || company.subscriptionPlan;
    const result = await createRenewalTransaction({
      companyId: company._id,
      planId: selectedPlanId,
      billingCycle,
      paymentMethod,
      months: 1,
      invoicePrefix: 'SUB'
    });

    return res.json({
      success: true,
      message: 'Renewal created successfully',
      company: result.company,
      transaction: result.transaction,
      amount: result.amount,
      currency: 'UGX'
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/renewal/sweep', protect, authorize('super_admin'), async (_req, res) => {
  try {
    const result = await runRenewalSweep({ daysAhead: 7 });
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/mobile-money/:provider/webhook', async (req, res) => {
  try {
    const provider = req.params.provider;
    const signature = req.headers['x-signature'] || req.headers['x-signature-hash'] || req.headers['signature'];
    const result = await handleWebhook({ provider, payload: req.body, signature });

    if (!result.success) {
      return res.status(400).json(result);
    }

    const companyId = req.body?.companyId || req.body?.metadata?.companyId || null;
    if (companyId) {
      await refreshCompanySubscriptionState(companyId);
    }

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/mobile-money/provider/:companyId', protect, async (req, res) => {
  try {
    const provider = await getProviderForCompany(req.params.companyId);
    return res.json({ success: true, provider });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
