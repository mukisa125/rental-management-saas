# Integration Guide - Multi-Tenant Enterprise Platform

## Quick Start

### 1. Backend Setup

#### Install Dependencies
```bash
cd backend
npm install
```

#### Create .env File
```env
MONGO_URI=mongodb://localhost:27017/rental-management-saas
JWT_SECRET=your-very-secure-random-secret-key-here
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:5173

# Payment Providers
STRIPE_SECRET_KEY=your-stripe-key
STRIPE_PUBLISHABLE_KEY=your-stripe-public-key

PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_SECRET=your-paypal-secret

FLUTTERWAVE_SECRET_KEY=your-flutterwave-key

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# AWS S3 (Optional)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=your-bucket-name
AWS_REGION=us-east-1
```

#### Initialize Database
```bash
# Start MongoDB
mongod

# Seed initial plans and settings
node seed.js
```

#### Start Backend
```bash
npm start
```

### 2. Frontend Setup

#### Install Dependencies
```bash
cd frontend
npm install
```

#### Environment Variables
```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=RentSaaS
```

#### Start Frontend
```bash
npm run dev
```

## API Integration Examples

### Authentication Flow

#### 1. Company Registration (Self Owner)
```javascript
// Self owner registration
const registerCompany = async () => {
  const response = await fetch('http://localhost:5000/api/auth/register-company', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      companyName: 'John\'s Properties',
      ownerName: 'John Doe',
      email: 'john@properties.com',
      password: 'SecurePassword123',
      phone: '+1234567890',
      address: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        country: 'USA'
      }
    })
  });

  const data = await response.json();
  // data.token - JWT token for API requests
  // data.company - Company details including subscription
  localStorage.setItem('token', data.token);
};
```

#### 2. Login
```javascript
const loginUser = async (email, password) => {
  const response = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  localStorage.setItem('token', data.token);
  return data;
};
```

### Self Owner Operations

#### Create Property
```javascript
const createProperty = async (propertyData) => {
  const response = await fetch('http://localhost:5000/api/self-owner/properties', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify(propertyData)
  });

  return response.json();
};

// Usage
createProperty({
  name: 'Downtown Apartments',
  location: '123 Main Street, New York',
  propertyType: 'apartment',
  description: 'Modern 5-unit apartment complex',
  amenities: [
    { name: 'Swimming Pool' },
    { name: 'Fitness Center' },
    { name: 'Parking Lot' }
  ]
});
```

#### Record Payment
```javascript
const recordPayment = async (paymentData) => {
  const response = await fetch('http://localhost:5000/api/self-owner/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify(paymentData)
  });

  return response.json();
};

// Usage
recordPayment({
  tenantId: 'tenant-id',
  amount: 1500,
  paymentMethod: 'cash',
  dueDate: new Date('2024-02-01'),
  notes: 'February rent payment'
});
```

#### Generate Reports
```javascript
const generateReport = async (reportType) => {
  const response = await fetch(
    `http://localhost:5000/api/self-owner/reports/${reportType}?` +
    `startDate=2024-01-01&endDate=2024-12-31`,
    {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }
  );

  return response.json();
};

// Usage
const revenueReport = await generateReport('revenue');
const occupancyReport = await generateReport('occupancy');
const maintenanceReport = await generateReport('maintenance');
```

### Super Admin Operations

#### Get Dashboard
```javascript
const getSuperAdminDashboard = async () => {
  const response = await fetch('http://localhost:5000/api/super-admin/dashboard', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });

  return response.json();
};

// Response includes:
// - Total customers
// - Total properties and units
// - Total tenants and managers
// - Active/expired subscriptions
// - Monthly and annual revenue
// - System health status
```

#### Manage Customers
```javascript
// List customers
const getCustomers = async (page = 1, status = null) => {
  let url = `http://localhost:5000/api/super-admin/customers?page=${page}`;
  if (status) url += `&status=${status}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });

  return response.json();
};

// Suspend customer
const suspendCustomer = async (companyId) => {
  const response = await fetch(
    `http://localhost:5000/api/super-admin/customers/${companyId}/suspend`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }
  );

  return response.json();
};

// Change subscription plan
const changeCustomerPlan = async (companyId, newPlanId) => {
  const response = await fetch(
    `http://localhost:5000/api/super-admin/customers/${companyId}/change-plan`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ newPlanId })
    }
  );

  return response.json();
};
```

#### Monitor System
```javascript
const getSystemHealth = async () => {
  const response = await fetch('http://localhost:5000/api/super-admin/system-monitor', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    }
  });

  return response.json();
  // Returns: CPU usage, memory usage, database health, recent errors
};
```

#### View Activity Logs
```javascript
const getActivityLogs = async (page = 1) => {
  const response = await fetch(
    `http://localhost:5000/api/super-admin/activity-logs?page=${page}`,
    {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }
  );

  return response.json();
};
```

#### Get Analytics
```javascript
const getSubscriptionAnalytics = async () => {
  const response = await fetch(
    'http://localhost:5000/api/super-admin/subscriptions-analytics',
    {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }
  );

  return response.json();
};

const getRevenueAnalytics = async () => {
  const response = await fetch(
    'http://localhost:5000/api/super-admin/revenue-analytics',
    {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    }
  );

  return response.json();
};
```

## Database Seeding

Create initial subscription plans and settings:

```bash
# seed.js
const mongoose = require('mongoose');
const SubscriptionPlan = require('./models/SubscriptionPlan');
const SystemSettings = require('./models/SystemSettings');

const seedPlans = async () => {
  await SubscriptionPlan.create([
    {
      name: 'Trial',
      description: '14-day free trial',
      monthlyPrice: 0,
      annualPrice: 0,
      trialDays: 14,
      maxProperties: 2,
      maxUnits: 5,
      maxManagers: 1,
      maxOwners: 5,
      maxTenants: 10,
      features: ['Basic Dashboard', 'Property Management'],
      isActive: true
    },
    {
      name: 'Starter',
      description: 'Perfect for small landlords',
      monthlyPrice: 29,
      annualPrice: 290,
      trialDays: 0,
      maxProperties: 5,
      maxUnits: 25,
      maxManagers: 2,
      maxOwners: 10,
      maxTenants: 50,
      features: ['Dashboard', 'Property Management', 'Tenant Management'],
      isActive: true
    },
    // ... more plans
  ]);
};

seedPlans();
```

## Testing Different Roles

### Super Admin
```
Email: admin@platform.com
Password: AdminPassword123
Role: super_admin
```

### Self Owner
1. Use register-company endpoint
2. Automatically gets `self_owner` role
3. Has company isolation

### Manager
1. Register as manager
2. Assign to company
3. Has access to company data

### Owner
1. Register as owner
2. Assign to property
3. Can view own properties only

### Tenant
1. Created by owner/manager
2. Can view their rental
3. Can pay rent
4. Can submit maintenance requests

## Subscription Workflow

### 1. Company Registration
- Company created with Trial plan
- Trial period set for 14 days
- User is company super admin

### 2. Plan Upgrade
- During trial or after trial period
- Select new plan
- Create subscription transaction
- Process payment (if not manual)
- Update company subscription

### 3. Recurring Billing
- Setup automated billing for active subscriptions
- Process payment on renewal date
- Update subscription end date
- Log transaction

### 4. Plan Downgrade
- Effective at next billing cycle
- Pro-rata credit if applicable
- Create downgrade transaction
- Log activity

### 5. Cancellation
- Company suspended
- All access revoked
- Data retained for compliance
- Activity logged

## Payment Processing Flow

### 1. Create Subscription Transaction
```javascript
// POST /api/subscriptions/create-transaction
{
  company: companyId,
  subscriptionPlan: planId,
  amount: 99,
  billingCycle: 'monthly',
  paymentMethod: 'stripe'
}
```

### 2. Process Payment
```javascript
// POST /api/subscriptions/process-payment
{
  transactionId: transactionId,
  paymentDetails: {
    token: stripeToken,
    // or
    paypalEmail: user@email.com
  }
}
```

### 3. Verify Payment
The system automatically:
- Contacts payment provider
- Verifies transaction
- Updates subscription status
- Generates invoice
- Sends confirmation email

## File Structure

```
project/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── Company.js
│   │   ├── SubscriptionPlan.js
│   │   ├── Property.js
│   │   ├── Unit.js
│   │   ├── Tenant.js
│   │   ├── Payment.js
│   │   ├── Maintenance.js
│   │   ├── ActivityLog.js
│   │   └── ... (more models)
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── superAdminController.js
│   │   ├── selfOwnerController.js
│   │   └── ... (more controllers)
│   ├── services/
│   │   ├── subscriptionService.js
│   │   ├── paymentProviderService.js
│   │   ├── activityLogService.js
│   │   ├── systemMonitoringService.js
│   │   └── reportingService.js
│   ├── routes/
│   │   ├── superAdminRoutes.js
│   │   ├── selfOwnerRoutes.js
│   │   └── ... (more routes)
│   ├── middleware/
│   │   ├── rbacMiddleware.js
│   │   ├── authMiddleware.js
│   │   └── ... (more middleware)
│   ├── server.js
│   ├── seed.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── super-admin/
│   │   │   │   ├── SuperAdminDashboard.jsx
│   │   │   │   ├── SuperAdminCustomers.jsx
│   │   │   │   └── ... (more pages)
│   │   │   ├── self-owner/
│   │   │   │   ├── SelfOwnerDashboard.jsx
│   │   │   │   ├── SelfOwnerProperties.jsx
│   │   │   │   └── ... (more pages)
│   │   │   └── ... (existing pages)
│   │   ├── layouts/
│   │   │   ├── SuperAdminLayout.jsx
│   │   │   ├── SelfOwnerLayout.jsx
│   │   │   └── ... (existing layouts)
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vite.config.js
│   └── package.json
│
├── docs/
│   ├── ENTERPRISE_README.md
│   ├── INTEGRATION_GUIDE.md
│   ├── database-design.md
│   └── requirements.md
│
└── README.md
```

## Troubleshooting

### Company Isolation Issues
- Check that `company` field is set on all models
- Verify middleware is applied to routes
- Check query filters include company condition

### Authentication Errors
- Verify JWT_SECRET is consistent
- Check token expiration (30 days)
- Verify user.isActive and company.isActive

### Payment Processing
- Check payment provider credentials
- Verify webhook URLs
- Check transaction status transitions
- Review error logs in activity logs

### Performance Issues
- Verify indexes are created
- Check database query performance
- Review N+1 query problems
- Monitor CPU/memory with system monitoring

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database indices created
- [ ] Subscription plans seeded
- [ ] Payment providers configured
- [ ] Email service configured
- [ ] SSL certificates installed
- [ ] Rate limiting enabled
- [ ] CORS configured
- [ ] Backup system running
- [ ] Monitoring alerts configured
- [ ] Activity logging verified
- [ ] Load testing completed

## Support

For issues or questions:
1. Check activity logs for error details
2. Review system monitoring dashboard
3. Check backend logs
4. Verify database connection
5. Test API endpoints with Postman

## Next Steps

1. Configure payment providers
2. Set up email notifications
3. Create additional reports
4. Implement SMS alerts
5. Add webhook support
6. Deploy to production
