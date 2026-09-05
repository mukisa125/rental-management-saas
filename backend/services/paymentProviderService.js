// Payment Provider Abstraction Layer
// This allows switching between different payment providers.
// Real MTN & Airtel clients are loaded from mobileMoneyProviders/

const MTNMobileMoneyClient = require('./mobileMoneyProviders/mtnMobileMoneyClient');
const AirtelMoneyClient = require('./mobileMoneyProviders/airtelMoneyClient');

const normalizeMobileMoneyNumber = (value) => {
  const raw = String(value || '').trim().replace(/\s+/g, '');
  if (!raw) return '';
  if (/^\+256\d{9}$/.test(raw)) return raw;
  if (/^256\d{9}$/.test(raw)) return `+${raw}`;
  if (/^0\d{9}$/.test(raw)) return `+256${raw.slice(1)}`;
  return raw;
};

class PaymentProvider {
  async processPayment(paymentDetails) {
    throw new Error('processPayment must be implemented');
  }

  async refundPayment(transactionId, amount) {
    throw new Error('refundPayment must be implemented');
  }

  async verifyPayment(transactionId) {
    throw new Error('verifyPayment must be implemented');
  }

  async getPaymentStatus(transactionId) {
    throw new Error('getPaymentStatus must be implemented');
  }
}

class StripeProvider extends PaymentProvider {
  constructor() {
    super();
  }

  async processPayment(paymentDetails) {
    try {
      console.log('Processing payment with Stripe:', paymentDetails);
      return { success: true, transactionId: 'stripe_' + Date.now(), status: 'pending' };
    } catch (error) {
      throw new Error(`Stripe payment error: ${error.message}`);
    }
  }

  async refundPayment(transactionId, amount) {
    try {
      console.log('Processing refund with Stripe:', transactionId, amount);
      return { success: true, refundId: 'stripe_refund_' + Date.now() };
    } catch (error) {
      throw new Error(`Stripe refund error: ${error.message}`);
    }
  }

  async verifyPayment(transactionId) {
    try {
      return { success: true, transactionId, verified: true };
    } catch (error) {
      throw new Error(`Stripe verification error: ${error.message}`);
    }
  }

  async getPaymentStatus(transactionId) {
    try {
      return { success: true, transactionId, status: 'succeeded' };
    } catch (error) {
      throw new Error(`Stripe status error: ${error.message}`);
    }
  }
}

class PayPalProvider extends PaymentProvider {
  constructor() {
    super();
  }

  async processPayment(paymentDetails) {
    try {
      console.log('Processing payment with PayPal:', paymentDetails);
      return { success: true, transactionId: 'paypal_' + Date.now(), status: 'pending' };
    } catch (error) {
      throw new Error(`PayPal payment error: ${error.message}`);
    }
  }

  async refundPayment(transactionId, amount) {
    try {
      console.log('Processing refund with PayPal:', transactionId, amount);
      return { success: true, refundId: 'paypal_refund_' + Date.now() };
    } catch (error) {
      throw new Error(`PayPal refund error: ${error.message}`);
    }
  }

  async verifyPayment(transactionId) {
    try {
      return { success: true, transactionId, verified: true };
    } catch (error) {
      throw new Error(`PayPal verification error: ${error.message}`);
    }
  }

  async getPaymentStatus(transactionId) {
    try {
      return { success: true, transactionId, status: 'completed' };
    } catch (error) {
      throw new Error(`PayPal status error: ${error.message}`);
    }
  }
}

class FlutterwaveProvider extends PaymentProvider {
  constructor() {
    super();
  }

  async processPayment(paymentDetails) {
    try {
      console.log('Processing payment with Flutterwave:', paymentDetails);
      return { success: true, transactionId: 'flutterwave_' + Date.now(), status: 'pending' };
    } catch (error) {
      throw new Error(`Flutterwave payment error: ${error.message}`);
    }
  }

  async refundPayment(transactionId, amount) {
    try {
      console.log('Processing refund with Flutterwave:', transactionId, amount);
      return { success: true, refundId: 'flutterwave_refund_' + Date.now() };
    } catch (error) {
      throw new Error(`Flutterwave refund error: ${error.message}`);
    }
  }

  async verifyPayment(transactionId) {
    try {
      return { success: true, transactionId, verified: true };
    } catch (error) {
      throw new Error(`Flutterwave verification error: ${error.message}`);
    }
  }

  async getPaymentStatus(transactionId) {
    try {
      return { success: true, transactionId, status: 'successful' };
    } catch (error) {
      throw new Error(`Flutterwave status error: ${error.message}`);
    }
  }
}

class MobileMoneyProvider extends PaymentProvider {
  constructor(network = 'mtn') {
    super();
    this.network = String(network || 'mtn').toLowerCase();
    
    // Initialize the appropriate real client
    if (this.network === 'airtel') {
      this.client = new AirtelMoneyClient();
    } else {
      this.client = new MTNMobileMoneyClient();
    }
  }

  async processPayment(paymentDetails) {
    try {
      const phoneNumber = normalizeMobileMoneyNumber(
        paymentDetails?.phoneNumber
        || paymentDetails?.mobileMoneyNumber
        || paymentDetails?.number
        || paymentDetails?.msisdn
      );

      if (!phoneNumber) {
        throw new Error('A valid mobile money phone number is required');
      }

      const reference = `${this.network}_${Date.now()}`;
      const amount = paymentDetails?.amount || 0;
      const description = paymentDetails?.description || 'Subscription payment';

      let result;
      if (this.network === 'airtel') {
        result = await this.client.collectMoney({
          phoneNumber,
          amount,
          reference,
          description
        });
      } else {
        result = await this.client.requestMoney({
          phoneNumber,
          amount,
          externalId: reference,
          description
        });
      }

      return {
        success: true,
        transactionId: result.transactionId || reference,
        status: result.status || 'pending',
        provider: this.network,
        phoneNumber,
        reference,
        ...result
      };
    } catch (error) {
      console.error(`[${this.network}] Payment error:`, error.message);
      throw new Error(`${this.network} payment error: ${error.message}`);
    }
  }

  async refundPayment(transactionId, amount) {
    try {
      console.log(`[${this.network}] Refund requested for:`, transactionId, amount);
      return { success: true, refundId: `${this.network}_refund_${Date.now()}` };
    } catch (error) {
      throw new Error(`${this.network} refund error: ${error.message}`);
    }
  }

  async verifyPayment(transactionId) {
    try {
      const result = await this.client.getTransactionStatus(transactionId);
      return {
        success: true,
        transactionId,
        verified: true,
        status: result.status,
        ...result
      };
    } catch (error) {
      throw new Error(`${this.network} verification error: ${error.message}`);
    }
  }

  async getPaymentStatus(transactionId) {
    try {
      const result = await this.client.getTransactionStatus(transactionId);
      return {
        success: true,
        transactionId,
        status: result.status,
        ...result
      };
    } catch (error) {
      throw new Error(`${this.network} status error: ${error.message}`);
    }
  }
}

const getPaymentProvider = (providerName) => {
  const normalizedName = String(providerName || '').trim().toLowerCase();
  
  // Map provider names to their implementations
  if (normalizedName.includes('airtel')) {
    return new MobileMoneyProvider('airtel');
  }
  
  if (normalizedName.includes('mtn') || normalizedName.includes('mobile_money') || normalizedName.includes('mobilemoney')) {
    return new MobileMoneyProvider('mtn');
  }
  
  if (normalizedName === 'stripe' || normalizedName === 'card') {
    return new StripeProvider();
  }
  
  if (normalizedName === 'paypal') {
    return new PayPalProvider();
  }
  
  if (normalizedName === 'flutterwave') {
    return new FlutterwaveProvider();
  }
  
  if (normalizedName === 'manual') {
    return new StripeProvider(); // Default fallback
  }

  console.warn(`[Payment] Unknown provider: ${providerName}, defaulting to MTN`);
  return new MobileMoneyProvider('mtn');
};

module.exports = {
  PaymentProvider,
  StripeProvider,
  PayPalProvider,
  FlutterwaveProvider,
  MobileMoneyProvider,
  normalizeMobileMoneyNumber,
  getPaymentProvider
};
