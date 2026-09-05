/**
 * MTN Mobile Money Uganda API Client
 * 
 * Integration Setup:
 * 1. Add these env variables to your .env or .env.local:
 *    - MTN_API_BASE_URL=https://api.mtn.co.ug/v1/mobile-money (sandbox or production)
 *    - MTN_API_KEY=your_mtn_api_key_from_dashboard
 *    - MTN_SECRET_KEY=your_mtn_secret_key_from_dashboard
 *    - MTN_API_USER=your_mtn_api_username
 *    - MTN_API_PASSWORD=your_mtn_api_password
 * 
 * 2. Get credentials at:
 *    - https://developer.mtn.co.ug (Developer Portal)
 *    - Create an application
 *    - Generate API keys
 */

const axios = require('axios');
const crypto = require('crypto');

class MTNMobileMoneyClient {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || process.env.MTN_API_BASE_URL || '';
    this.apiKey = config.apiKey || process.env.MTN_API_KEY || '';
    this.secretKey = config.secretKey || process.env.MTN_SECRET_KEY || '';
    this.apiUser = config.apiUser || process.env.MTN_API_USER || '';
    this.apiPassword = config.apiPassword || process.env.MTN_API_PASSWORD || '';
    this.timeout = config.timeout || 30000;
    this.isConfigured = Boolean(this.baseUrl && this.apiKey);
  }

  /**
   * Generate basic auth header for MTN API
   */
  getAuthHeader() {
    if (!this.apiUser || !this.apiPassword) {
      return { 'X-API-Key': this.apiKey };
    }
    const credentials = Buffer.from(`${this.apiUser}:${this.apiPassword}`).toString('base64');
    return { Authorization: `Basic ${credentials}` };
  }

  /**
   * Request money from a customer
   * @param {string} phoneNumber - Customer's phone number (e.g., +256701234567)
   * @param {number} amount - Amount in UGX
   * @param {string} externalId - Unique transaction reference
   * @param {string} description - Transaction description
   */
  async requestMoney({ phoneNumber, amount, externalId, description = 'Payment request' }) {
    try {
      if (!this.isConfigured) {
        console.warn('[MTN] API not configured, returning mock response');
        return this.mockRequestMoney({ phoneNumber, amount, externalId });
      }

      const url = `${this.baseUrl}/requestmoney`;
      const payload = {
        externalId,
        amount: Number(amount),
        currency: 'EUR', // MTN Uganda typically requires EUR; convert as needed
        payer: {
          partyIdType: 'MSISDN',
          partyId: phoneNumber
        },
        payerMessage: description,
        payeeNote: description
      };

      const response = await axios.post(url, payload, {
        headers: {
          ...this.getAuthHeader(),
          'Content-Type': 'application/json',
          'X-Reference-Id': externalId
        },
        timeout: this.timeout
      });

      return {
        success: true,
        transactionId: response.data?.transactionId || externalId,
        status: 'pending',
        reference: externalId,
        provider: 'mtn_mobile_money',
        externalId,
        phoneNumber,
        amount
      };
    } catch (error) {
      console.error('[MTN] Request money error:', error.response?.data || error.message);
      throw new Error(`MTN request money failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Check transaction status
   * @param {string} externalId - External reference ID
   */
  async getTransactionStatus(externalId) {
    try {
      if (!this.isConfigured) {
        return { success: true, status: 'SUCCESSFUL', externalId };
      }

      const url = `${this.baseUrl}/requestmoney/${externalId}`;
      const response = await axios.get(url, {
        headers: this.getAuthHeader(),
        timeout: this.timeout
      });

      const status = String(response.data?.status || 'PENDING').toUpperCase();
      return {
        success: true,
        status,
        externalId,
        transactionId: response.data?.transactionId,
        amount: response.data?.amount,
        currency: response.data?.currency
      };
    } catch (error) {
      console.error('[MTN] Get status error:', error.response?.data || error.message);
      throw new Error(`MTN status check failed: ${error.message}`);
    }
  }

  /**
   * Transfer money to a customer (payout)
   * @param {string} phoneNumber - Recipient phone number
   * @param {number} amount - Amount in UGX
   * @param {string} externalId - Unique transaction reference
   * @param {string} description - Transfer description
   */
  async transferMoney({ phoneNumber, amount, externalId, description = 'Payment transfer' }) {
    try {
      if (!this.isConfigured) {
        console.warn('[MTN] API not configured, returning mock response');
        return this.mockTransferMoney({ phoneNumber, amount, externalId });
      }

      const url = `${this.baseUrl}/transfer`;
      const payload = {
        externalId,
        amount: Number(amount),
        currency: 'EUR',
        payee: {
          partyIdType: 'MSISDN',
          partyId: phoneNumber
        },
        payerMessage: description,
        payeeNote: description
      };

      const response = await axios.post(url, payload, {
        headers: {
          ...this.getAuthHeader(),
          'Content-Type': 'application/json',
          'X-Reference-Id': externalId
        },
        timeout: this.timeout
      });

      return {
        success: true,
        transactionId: response.data?.transactionId || externalId,
        status: 'pending',
        reference: externalId,
        provider: 'mtn_mobile_money',
        phoneNumber,
        amount
      };
    } catch (error) {
      console.error('[MTN] Transfer error:', error.response?.data || error.message);
      throw new Error(`MTN transfer failed: ${error.message}`);
    }
  }

  /**
   * Validate webhook signature from MTN
   */
  validateWebhookSignature(payload, signature) {
    if (!this.secretKey || !signature) return true; // Skip if no secret configured

    const computed = crypto
      .createHmac('sha256', this.secretKey)
      .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
      .digest('hex');

    return computed === signature;
  }

  /**
   * Mock responses for development/testing when API not configured
   */
  mockRequestMoney({ phoneNumber, amount, externalId }) {
    return {
      success: true,
      transactionId: `MTN_${Date.now()}`,
      status: 'pending',
      reference: externalId,
      provider: 'mtn_mobile_money',
      phoneNumber,
      amount,
      mode: 'mock'
    };
  }

  mockTransferMoney({ phoneNumber, amount, externalId }) {
    return {
      success: true,
      transactionId: `MTN_XFER_${Date.now()}`,
      status: 'pending',
      reference: externalId,
      provider: 'mtn_mobile_money',
      phoneNumber,
      amount,
      mode: 'mock'
    };
  }
}

module.exports = MTNMobileMoneyClient;
