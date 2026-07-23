const WHATSAPP_MESSAGE_LIMIT = 4096;

const clean = (value) => String(value || '').trim();

const getConfig = () => ({
  accessToken: clean(process.env.WHATSAPP_ACCESS_TOKEN),
  phoneNumberId: clean(process.env.WHATSAPP_PHONE_NUMBER_ID),
  businessAccountId: clean(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID),
  apiVersion: clean(process.env.WHATSAPP_API_VERSION || 'v23.0'),
  defaultCountryCode: clean(process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '256'),
  timeoutMs: Number(process.env.WHATSAPP_REQUEST_TIMEOUT_MS) || 15000
});

const isConfigured = () => {
  const config = getConfig();
  return Boolean(config.accessToken && config.phoneNumberId);
};

const getStatus = () => {
  const config = getConfig();
  return {
    configured: isConfigured(),
    phoneNumberId: config.phoneNumberId || null,
    businessAccountId: config.businessAccountId || null,
    apiVersion: config.apiVersion,
    hasAccessToken: Boolean(config.accessToken)
  };
};

const normalizePhoneNumber = (value) => {
  const config = getConfig();
  let phone = clean(value).replace(/[^\d+]/g, '');
  if (!phone) throw new Error('WhatsApp recipient phone number is required.');

  if (phone.startsWith('+')) phone = phone.slice(1);
  if (phone.startsWith('00')) phone = phone.slice(2);
  if (phone.startsWith('0') && config.defaultCountryCode) {
    phone = `${config.defaultCountryCode}${phone.slice(1)}`;
  }

  phone = phone.replace(/\D/g, '');
  if (phone.length < 8 || phone.length > 15) {
    throw new Error('WhatsApp recipient phone number must be in international format.');
  }

  return phone;
};

const normalizeMessage = (value) => {
  const message = clean(value);
  if (!message) throw new Error('WhatsApp message is required.');
  if (message.length > WHATSAPP_MESSAGE_LIMIT) {
    throw new Error(`WhatsApp message must be ${WHATSAPP_MESSAGE_LIMIT} characters or fewer.`);
  }
  return message;
};

const formatMoney = (value) => {
  const amount = Number(value) || 0;
  return `UGX ${amount.toLocaleString('en-US')}`;
};

const buildPaymentReceiptMessage = ({ tenantName, receiptNumber, amount, receiptUrl }) => {
  const receiptLabel = clean(receiptNumber);
  return [
    `Hello ${clean(tenantName) || 'tenant'},`,
    `Your rent payment receipt${receiptLabel ? ` ${receiptLabel}` : ''} for ${formatMoney(amount)} is ready.`,
    receiptUrl ? `You can verify it here: ${receiptUrl}` : ''
  ].filter(Boolean).join(' ');
};

const sendPaymentReceiptMessage = ({ payment, to, receiptUrl, message }) => {
  const tenant = payment?.tenant || {};
  return sendTextMessage({
    to: to || tenant.phone,
    message: message || buildPaymentReceiptMessage({
      tenantName: tenant.fullName,
      receiptNumber: payment?.receiptNumber,
      amount: payment?.amountPaid || payment?.amount,
      receiptUrl
    }),
    previewUrl: Boolean(receiptUrl)
  });
};

const buildMessagesUrl = () => {
  const config = getConfig();
  return `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;
};

const parseMetaResponse = async (response) => {
  const text = await response.text();
  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (error) {
      payload = { raw: text };
    }
  }

  if (!response.ok) {
    const errorInfo = payload?.error || {};
    const details = errorInfo.message || payload?.raw || `Meta returned status ${response.status}`;
    const error = new Error(`WhatsApp message failed: ${details}`);
    error.meta = {
      status: response.status,
      code: errorInfo.code || null,
      type: errorInfo.type || null,
      details: errorInfo.error_data?.details || null,
      traceId: errorInfo.fbtrace_id || null
    };
    throw error;
  }

  return payload;
};

const sendTextMessage = async ({ to, message, previewUrl = false }) => {
  const config = getConfig();
  if (!isConfigured()) {
    throw new Error('WhatsApp API is not configured.');
  }

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalizePhoneNumber(to),
    type: 'text',
    text: {
      preview_url: Boolean(previewUrl),
      body: normalizeMessage(message)
    }
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetch(buildMessagesUrl(), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    return parseMetaResponse(response);
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('WhatsApp request timed out.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = {
  buildPaymentReceiptMessage,
  getStatus,
  isConfigured,
  normalizePhoneNumber,
  sendPaymentReceiptMessage,
  sendTextMessage
};
