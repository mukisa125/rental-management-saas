# Mobile Money Integration Guide

This guide shows exactly where to add MTN Mobile Money and Airtel Money credentials and how they integrate into the billing system.

---

## 1. File Locations & Structure

```
backend/
├── services/
│   ├── mobileMoneyProviders/
│   │   ├── mtnMobileMoneyClient.js      ← MTN API client (requests & transfers)
│   │   └── airtelMoneyClient.js         ← Airtel API client (collections & disbursements)
│   ├── mobileMoneyGatewayService.js     ← Gateway abstraction & webhook handler
│   ├── paymentProviderService.js        ← Provider factory & routing
│   ├── billingLifecycleService.js       ← Subscription renewal orchestration
│   └── billingSchedulerService.js       ← Renewal sweep automation
├── routes/
│   └── billingRoutes.js                 ← Public endpoints for status, renew, webhooks
└── models/
    └── Company.js                       ← Stores selected payment provider & settings
```

---

## 2. Environment Variables Setup

Add these to your `.env` or `.env.local` file:

### MTN Mobile Money Configuration
```env
# MTN Mobile Money (Sandbox for testing, switch to production URL when ready)
MTN_API_BASE_URL=https://api.sandbox.mtn.co.ug/v1
MTN_API_KEY=your_mtn_api_key_here
MTN_SECRET_KEY=your_mtn_secret_key_here
MTN_API_USER=your_mtn_api_username
MTN_API_PASSWORD=your_mtn_api_password

# Get credentials at: https://developer.mtn.co.ug
```

### Airtel Money Configuration
```env
# Airtel Money (Sandbox for testing)
AIRTEL_API_BASE_URL=https://api.sandbox.airtel.ug/v1
AIRTEL_CLIENT_ID=your_airtel_client_id
AIRTEL_CLIENT_SECRET=your_airtel_client_secret
AIRTEL_API_KEY=your_airtel_api_key

# Get credentials at: https://developer.airtel.ug
```

### How to Get Credentials

#### For MTN:
1. Visit https://developer.mtn.co.ug
2. Sign up / Log in
3. Create a new application
4. Go to "API Keys" section
5. Copy the API Key and Secret Key
6. Use Basic Auth with API_USER and API_PASSWORD OR just the API_KEY

#### For Airtel:
1. Visit https://developer.airtel.ug
2. Create a business account
3. Register your application
4. Generate OAuth2 credentials (Client ID & Secret)
5. Copy the credentials to your .env

---

## 3. How Payment Flow Works

### Subscription Renewal Flow
```
1. Customer's subscription approaches expiration
   └─> billingSchedulerService.js finds due subscriptions

2. For each due subscription:
   └─> Calls createRenewalTransaction() from billingLifecycleService.js
   └─> This checks the company's paymentProvider field (MTN or Airtel)

3. mobileMoneyGatewayService.js routes to the correct client:
   ├─> If MTN: Creates MTNMobileMoneyClient
   ├─> If Airtel: Creates AirtelMoneyClient
   └─> Calls initiatePayment() with phone number

4. The gateway client sends request to MTN/Airtel API:
   ├─> MTN: requestMoney() asks customer for payment
   └─> Airtel: collectMoney() charges customer's account

5. Payment gateway returns transaction ID & status

6. Webhook from MTN/Airtel notifies your app of payment completion
   └─> POST /api/billing/mobile-money/{provider}/webhook
   └─> billingRoutes.js calls handleWebhook()
   └─> Updates subscription status to 'active' if payment succeeded
```

---

## 4. API Endpoints Created

All endpoints live in [backend/routes/billingRoutes.js](../backend/routes/billingRoutes.js)

### Check Subscription Status
```
GET /api/billing/status/:companyId
Authorization: Bearer {jwt_token}

Response:
{
  "success": true,
  "company": { ... },
  "status": "active|expired|suspended|trial",
  "nextBillingDate": "2026-09-18T00:00:00Z",
  "amount": 50000,
  "currency": "UGX"
}
```

### Manually Trigger Renewal
```
POST /api/billing/renew/:companyId
Authorization: Bearer {jwt_token}
Content-Type: application/json

Body:
{
  "paymentMethod": "mtn|airtel",
  "billingCycle": "monthly",
  "planId": "optional_plan_id"
}

Response:
{
  "success": true,
  "message": "Renewal created successfully",
  "company": { ... },
  "transaction": { ... },
  "amount": 50000,
  "currency": "UGX"
}
```

### Run Renewal Sweep (Admin Only)
```
POST /api/billing/renewal/sweep
Authorization: Bearer {jwt_token}

This finds all subscriptions expiring in the next 7 days and processes renewals.

Response:
{
  "success": true,
  "processed": 5,
  "results": [
    { "success": true, "companyId": "...", "amount": 50000 },
    { "success": false, "companyId": "...", "error": "..." }
  ]
}
```

### Mobile Money Webhook (Called by Gateway)
```
POST /api/billing/mobile-money/:provider/webhook
Content-Type: application/json
X-Signature: {signature_from_gateway}

Body (example from MTN):
{
  "transactionId": "MTN_TXN_123456",
  "status": "SUCCESSFUL|FAILED|PENDING",
  "amount": 50000,
  "currency": "UGX",
  "companyId": "company_mongo_id",
  "phoneNumber": "+256701234567"
}

Response:
{
  "success": true,
  "provider": "mtn|airtel",
  "transactionId": "...",
  "status": "completed|failed",
  "verified": true
}
```

### Get Provider for Company
```
GET /api/billing/mobile-money/provider/:companyId
Authorization: Bearer {jwt_token}

Response:
{
  "success": true,
  "provider": "mtn|airtel"
}
```

---

## 5. How to Add a Mobile Money Provider to a Company

In your company settings or during onboarding:

```javascript
// Example: Set company payment provider to MTN
const company = await Company.findByIdAndUpdate(
  companyId,
  {
    paymentProvider: 'mtn',           // or 'airtel'
    phone: '+256701234567',           // for payment requests
    billingCycle: 'monthly',
    subscriptionStatus: 'active'
  },
  { new: true }
);
```

Or via the API (if you add an endpoint):

```
PUT /api/companies/:companyId/payment-settings
Content-Type: application/json

Body:
{
  "paymentProvider": "mtn|airtel",
  "phone": "+256701234567"
}
```

---

## 6. Testing Without Real Credentials

If `MTN_API_BASE_URL` or `AIRTEL_API_BASE_URL` are not set in .env:
- The clients return **mock responses** automatically
- Transactions will have `"mode": "mock"`
- Perfect for local development and testing

When you add real credentials to .env, the clients automatically switch to live mode.

---

## 7. Webhook Integration with Your Gateway

### For MTN:
1. Log in to MTN Developer Portal
2. Go to your application settings
3. Set webhook URL to: `https://yourdomain.com/api/billing/mobile-money/mtn/webhook`
4. Copy the webhook signature key and add to .env as `MTN_SECRET_KEY`
5. MTN will POST payment updates to this endpoint

### For Airtel:
1. Log in to Airtel Developer Portal
2. Go to your application settings
3. Set webhook URL to: `https://yourdomain.com/api/billing/mobile-money/airtel/webhook`
4. Copy the signature key and add to .env as `AIRTEL_API_KEY`
5. Airtel will POST payment updates to this endpoint

---

## 8. Running the Renewal Scheduler

To automatically process renewals daily, uncomment the cron section in [backend/server.js](../backend/server.js):

```javascript
const cron = require('node-cron');
const { runRenewalSweep } = require('./services/billingSchedulerService');

// Run every day at midnight (server local time)
cron.schedule('0 0 * * *', async () => {
  console.log('[Cron] Daily renewal sweep started…');
  try {
    const result = await runRenewalSweep({ daysAhead: 7 });
    console.log('[Cron] Processed', result.processed, 'renewals');
  } catch (err) {
    console.error('[Cron] Renewal sweep failed:', err.message);
  }
});
```

Then install node-cron:
```bash
npm install node-cron
```

---

## 9. Database Fields for Mobile Money

The Company model already has these fields:

```javascript
{
  paymentProvider: String,           // 'mtn' | 'airtel' | 'stripe' | etc.
  phone: String,                     // Customer's mobile money number
  subscriptionStatus: String,        // 'trial' | 'active' | 'expired' | 'suspended'
  subscriptionPlan: ObjectId,        // Link to SubscriptionPlan
  subscriptionStartDate: Date,       // When subscription began
  subscriptionEndDate: Date,         // When subscription expires
  nextPaymentDueDate: Date,          // Next renewal date
  lastPaymentDate: Date,             // Last successful payment
  billingCycle: String,              // 'monthly' | 'annual'
  isActive: Boolean                  // Company is in good standing
}
```

No schema changes needed; everything is already there.

---

## 10. Example: Complete Payment Flow Walkthrough

1. **Company signs up and selects MTN:**
   ```javascript
   await Company.create({
     name: 'Example Landlord Inc.',
     email: 'contact@example.ug',
     paymentProvider: 'mtn',
     phone: '+256701234567',
     subscriptionPlan: planId,
     billingCycle: 'monthly',
     trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
   });
   ```

2. **Admin checks subscription status:**
   ```
   GET /api/billing/status/{companyId}
   → Returns: status = "trial", nextBillingDate = 14 days away
   ```

3. **Day 13: Cron job runs renewal sweep:**
   ```
   POST /api/billing/renewal/sweep
   → Finds company with nextPaymentDueDate within 7 days
   → Calls MTN API to request 50,000 UGX from +256701234567
   ```

4. **Customer approves payment in MTN app**

5. **MTN sends webhook to your app:**
   ```
   POST /api/billing/mobile-money/mtn/webhook
   {
     "transactionId": "MTN_TXN_123456",
     "status": "SUCCESSFUL",
     "amount": 50000,
     "companyId": "...",
     "phoneNumber": "+256701234567"
   }
   ```

6. **Your app processes the webhook:**
   ```
   → Validates MTN signature
   → Updates company.subscriptionStatus = "active"
   → Extends subscriptionEndDate by 1 month
   → Records invoice in BillingTransaction
   ```

7. **Company continues using the platform for another month**

8. **Process repeats on day 30**

---

## 11. Troubleshooting

### "Unknown payment provider" error
- Make sure company.paymentProvider is set to exactly 'mtn' or 'airtel'
- Check [backend/services/paymentProviderService.js](../backend/services/paymentProviderService.js) for supported provider names

### API calls return mock responses
- Check that MTN_API_BASE_URL and MTN_API_KEY (or AIRTEL equivalents) are in .env
- Restart the backend server after adding env variables

### Webhook not being called
- Verify webhook URL is publicly accessible
- Check firewall/security group rules allow inbound POST requests
- Confirm signature/secret key matches in both your .env and the gateway dashboard

### Phone number format errors
- Phone numbers should be in format: `+256701234567`
- Or `0701234567` (starts with 0)
- Or `256701234567` (country code without +)
- The client auto-normalizes all formats to `+256...`

---

## 12. Summary

- **MTN & Airtel clients** in `backend/services/mobileMoneyProviders/`
- **All credentials** in `.env` or `.env.local`
- **Endpoints** active at `/api/billing/*`
- **Webhooks** auto-update subscriptions
- **Test mode** works without credentials
- **Scheduler** ready in `billingSchedulerService.js`

Start with sandbox/test credentials, verify everything works, then switch to production APIs.
