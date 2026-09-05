/**
 * Airtel Money Uganda API Client
 * 
 * Integration Setup:
 * 1. Add these env variables to your .env or .env.local:
 *    - AIRTEL_API_BASE_URL=https://api.airtel.ug/v1/payments (sandbox or production)
 *    - AIRTEL_CLIENT_ID=your_airtel_client_id
 *    - AIRTEL_CLIENT_SECRET=your_airtel_client_secret
 *    - AIRTEL_API_KEY=your_airtel_api_key
 * 
 * 2. Get credentials at:
 *    - https://developer.airtel.ug (Airtel Developer Platform)
 *    - Create a business account
 *    - Register your application
 *    - Generate OAuth2 credentials
 */

const axios = require('axios');
const crypto = require('crypto');

class AirtelMoneyClient {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || process.env.AIRTEL_API_BASE_URL || '';
    this.clientId = config.clientId || process.env.AIRTEL_CLIENT_ID || '';
    this.clientSecret = config.clientSecret || process.env.AIRTEL_CLIENT_SECRET || '';
    this.apiKey = config.apiKey || process.env.AIRTEL_API_KEY || '';
    this.timeout = config.timeout || 30000;
    this.isConfigured = Boolean(this.baseUrl && (this.clientId || this.apiKey));
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Get OAuth2 access token
   */
  async getAccessToken() {
    try {
      // Return cached token if valid
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      if (!this.isConfigured) {
        console.warn('[Airtel] API not configured, using mock token');
        return 'mock_token_' + Date.now();
      }

      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      const response = await axios.post(
        `${this.baseUrl}/oauth/token`,
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: this.timeout
        }
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + (response.data.expires_in * 1000 || 3600000);
      return this.accessToken;
    } catch (error) {
      console.error('[Airtel] Token error:', error.response?.data || error.message);
      throw new Error(`Airtel authentication failed: ${error.message}`);
    }
  }

  /**
   * Collect money from a customer
   * @param {string} phoneNumber - Customer's phone number (e.g., +256701234567)
   * @param {number} amount - Amount in UGX
   * @param {string} reference - Unique transaction reference
   * @param {string} description - Transaction description
   */
  async collectMoney({ phoneNumber, amount, reference, description = 'Payment collection' }) {
    try {
      if (!this.isConfigured) {
        console.warn('[Airtel] API not configured, returning mock response');
        return this.mockCollectMoney({ phoneNumber, amount, reference });
      }

      const token = await this.getAccessToken();
      const url = `${this.baseUrl}/collections`;
      const payload = {
        reference,
        subscriber: {
          country: 'UG',
          currency: 'UGX',
          msisdn: phoneNumber
        },
        transaction: {
          amount: Number(amount),
          currency: 'UGX',
          id: reference
        },
        type: 'DisbursementTransaction'
      };

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey || ''
        },
        timeout: this.timeout
      });

      return {
        success: true,
        transactionId: response.data?.transaction?.id || reference,
        status: 'pending',
        reference,
        provider: 'airtel_money',
        phoneNumber,
        amount
      };
    } catch (error) {
      console.error('[Airtel] Collect error:', error.response?.data || error.message);
      throw new Error(`Airtel collection failed: ${error.message}`);
    }
  }

  /**
   * Check transaction status
   * @param {string} reference - Transaction reference
   */
  async getTransactionStatus(reference) {
    try {
      if (!this.isConfigured) {
        return { success: true, status: 'SUCCESS', reference };
      }

      const token = await this.getAccessToken();
      const url = `${this.baseUrl}/collections/${reference}`;
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-API-Key': this.apiKey || ''
        },
        timeout: this.timeout
      });

      const status = String(response.data?.status || 'PENDING').toUpperCase();
      return {
        success: true,
        status,
        reference,
        transactionId: response.data?.transaction?.id,
        amount: response.data?.transaction?.amount
      };
    } catch (error) {
      console.error('[Airtel] Status error:', error.response?.data || error.message);
      throw new Error(`Airtel status check failed: ${error.message}`);
    }
  }

  /**
   * Disburse money to a customer (payout)
   * @param {string} phoneNumber - Recipient phone number
   * @param {number} amount - Amount in UGX
   * @param {string} reference - Unique transaction reference
   * @param {string} description - Disbursement description
   */
  async disburseMoney({ phoneNumber, amount, reference, description = 'Payment disbursement' }) {
    try {
      if (!this.isConfigured) {
        console.warn('[Airtel] API not configured, returning mock response');
        return this.mockDisburseMoney({ phoneNumber, amount, reference });
      }

      const token = await this.getAccessToken();
      const url = `${this.baseUrl}/disbursements`;
      const payload = {
        reference,
        subscriber: {
          country: 'UG',
          currency: 'UGX',
          msisdn: phoneNumber
        },
        transaction: {
          amount: Number(amount),
          currency: 'UGX',
          id: reference
        },
        type: 'DisbursementTransaction'
      };

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey || ''
        },
        timeout: this.timeout
      });

      return {
        success: true,
        transactionId: response.data?.transaction?.id || reference,
        status: 'pending',
        reference,
        provider: 'airtel_money',
        phoneNumber,
        amount
      };
    } catch (error) {
      console.error('[Airtel] Disburse error:', error.response?.data || error.message);
      throw new Error(`Airtel disburse failed: ${error.message}`);
    }
  }

  /**
   * Validate webhook signature from Airtel
   */
  validateWebhookSignature(payload, signature) {
    if (!this.apiKey || !signature) return true; // Skip if no key configured

    const computed = crypto
      .createHmac('sha256', this.apiKey)
      .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
      .digest('hex');

    return computed === signature;
  }

  /**
   * Mock responses for development/testing when API not configured
   */
  mockCollectMoney({ phoneNumber, amount, reference }) {
    return {
      success: true,
      transactionId: `AIRTEL_${Date.now()}`,
      status: 'pending',
      reference,
      provider: 'airtel_money',
      phoneNumber,
      amount,
      mode: 'mock'
    };
  }

  mockDisburseMoney({ phoneNumber, amount, reference }) {
    return {
      success: true,
      transactionId: `AIRTEL_DISB_${Date.now()}`,
      status: 'pending',
      reference,
      provider: 'airtel_money',
      phoneNumber,
      amount,
      mode: 'mock'
    };
  }
}

module.exports = AirtelMoneyClient;
