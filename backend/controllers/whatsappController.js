const Payment = require('../models/Payment');
const {
  buildPaymentReceiptMessage,
  getStatus: getWhatsAppStatus,
  sendPaymentReceiptMessage,
  sendTextMessage
} = require('../services/whatsappService');

const getCompanyId = (req) => req.company?._id || req.user?.company;
const asText = (value, fallback = '') => (value === undefined || value === null ? fallback : String(value).trim());

const paymentScope = (req, extra = {}) => {
  const scope = {
    company: getCompanyId(req),
    deletedAt: null,
    ...extra
  };

  if (req.user?.role === 'self_owner') {
    scope.owner = req.user._id;
  }

  return scope;
};

const getPublicApiBaseUrl = (req) => {
  const configured = asText(process.env.PUBLIC_API_URL || process.env.BACKEND_PUBLIC_URL || '');
  if (configured) return configured.replace(/\/+$/, '');
  return `${req.protocol}://${req.get('host')}/api`;
};

const buildReceiptMessage = (req, payment) => {
  const receiptNumber = asText(payment.receiptNumber, 'your receipt');
  const receiptUrl = `${getPublicApiBaseUrl(req)}/self-owner/payments/verify/${encodeURIComponent(receiptNumber)}`;

  return buildPaymentReceiptMessage({
    tenantName: payment.tenant?.fullName,
    receiptNumber,
    amount: payment.amountPaid || payment.amount,
    receiptUrl
  });
};

const getStatus = (req, res) => {
  res.json({ success: true, whatsapp: getWhatsAppStatus() });
};

const sendMessage = async (req, res) => {
  try {
    const result = await sendTextMessage({
      to: req.body.to,
      message: req.body.message,
      previewUrl: req.body.previewUrl
    });

    return res.json({
      success: true,
      message: 'WhatsApp message sent',
      result
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

const sendPaymentReceipt = async (req, res) => {
  try {
    const payment = await Payment.findOne(paymentScope(req, { _id: req.params.id }))
      .populate('tenant', 'fullName phone email')
      .populate('property', 'name')
      .populate('unit', 'unitNumber');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    const to = asText(req.body.to, asText(payment.tenant?.phone, ''));
    const message = asText(req.body.message, buildReceiptMessage(req, payment));
    const receiptNumber = asText(payment.receiptNumber, 'your receipt');
    const receiptUrl = `${getPublicApiBaseUrl(req)}/self-owner/payments/verify/${encodeURIComponent(receiptNumber)}`;
    const result = await sendPaymentReceiptMessage({ payment, to, message, receiptUrl });

    return res.json({
      success: true,
      message: 'Receipt sent on WhatsApp',
      result
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getStatus,
  sendMessage,
  sendPaymentReceipt
};
