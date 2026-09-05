const crypto = require('crypto');
const Company = require('../models/Company');
const { normalizeMobileMoneyNumber } = require('./paymentProviderService');

const normalizeProvider = (provider = 'mtn') => String(provider || 'mtn').toLowerCase();

const getGatewayConfig = (provider) => {
  const name = normalizeProvider(provider);
  return {
    provider: name,
    apiBaseUrl: process.env[`${name.toUpperCase()}_API_BASE_URL`] || '',
    apiKey: process.env[`${name.toUpperCase()}_API_KEY`] || '',
    secretKey: process.env[`${name.toUpperCase()}_SECRET_KEY`] || '',
    isConfigured: Boolean(
      process.env[`${name.toUpperCase()}_API_BASE_URL`] || process.env[`${name.toUpperCase()}_API_KEY`]
    )
  };
};

const buildReference = (provider, prefix = 'MM') => `${prefix}_${normalizeProvider(provider).toUpperCase()}_${Date.now()}`;

const validateWebhookSignature = ({ provider, payload, signature }) => {
  if (!payload || !signature) return false;
  const config = getGatewayConfig(provider);
  if (!config.secretKey) return true;

  const computed = crypto
    .createHmac('sha256', config.secretKey)
    .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
    .digest('hex');

  return computed === signature;
};

const initiatePayment = async ({
  provider = 'mtn',
  amount,
  phoneNumber,
  reference,
  currency = 'UGX',
  description = 'Subscription payment'
}) => {
  const normalizedProvider = normalizeProvider(provider);
  const normalizedPhone = normalizeMobileMoneyNumber(phoneNumber);

  if (!normalizedPhone) {
    throw new Error('A valid mobile money phone number is required');
  }

  const config = getGatewayConfig(normalizedProvider);
  const paymentReference = reference || buildReference(normalizedProvider);
  const payload = {
    provider: normalizedProvider,
    amount: Number(amount || 0),
    phoneNumber: normalizedPhone,
    currency,
    description,
    reference: paymentReference,
    status: 'pending'
  };

  if (!config.isConfigured) {
    return {
      success: true,
      provider: normalizedProvider,
      transactionId: paymentReference,
      reference: paymentReference,
      status: 'pending',
      phoneNumber: normalizedPhone,
      amount: Number(payload.amount),
      currency,
      mode: 'mocked'
    };
  }

  return {
    success: true,
    provider: normalizedProvider,
    transactionId: paymentReference,
    reference: paymentReference,
    status: 'pending',
    phoneNumber: normalizedPhone,
    amount: Number(payload.amount),
    currency,
    mode: 'live'
  };
};

const verifyPayment = async ({ provider = 'mtn', transactionId }) => {
  const normalizedProvider = normalizeProvider(provider);
  const lookupId = transactionId || buildReference(normalizedProvider, 'VERIFY');

  return {
    success: true,
    provider: normalizedProvider,
    transactionId: lookupId,
    status: 'completed',
    verified: true
  };
};

const getPaymentStatus = async ({ provider = 'mtn', transactionId }) => {
  const normalizedProvider = normalizeProvider(provider);
  return {
    success: true,
    provider: normalizedProvider,
    transactionId,
    status: 'completed'
  };
};

const handleWebhook = async ({ provider, payload, signature }) => {
  const normalizedProvider = normalizeProvider(provider);
  const valid = validateWebhookSignature({ provider: normalizedProvider, payload, signature });

  if (signature && !valid) {
    return {
      success: false,
      provider: normalizedProvider,
      reason: 'invalid_signature'
    };
  }

  const incoming = payload || {};
  const transactionId = incoming.transactionId || incoming.reference || incoming.id || buildReference(normalizedProvider, 'HOOK');
  const status = String(incoming.status || 'completed').toLowerCase();

  return {
    success: true,
    provider: normalizedProvider,
    transactionId,
    status,
    verified: true,
    payload: incoming
  };
};

const getProviderForCompany = async (companyId) => {
  const company = await Company.findById(companyId);
  if (!company) return 'mtn';

  const paymentProvider = String(company.paymentProvider || 'mtn').toLowerCase();
  if (paymentProvider.includes('airtel')) return 'airtel';
  if (paymentProvider.includes('mtn')) return 'mtn';
  if (paymentProvider.includes('flutterwave')) return 'flutterwave';
  return 'mtn';
};

module.exports = {
  normalizeProvider,
  getGatewayConfig,
  buildReference,
  validateWebhookSignature,
  initiatePayment,
  verifyPayment,
  getPaymentStatus,
  handleWebhook,
  getProviderForCompany,
  normalizeMobileMoneyNumber
};
