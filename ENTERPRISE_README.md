# Multi-Tenant Enterprise Rental Management SaaS Platform

## Overview

This is a comprehensive upgrade of the rental management system into a production-ready, multi-tenant enterprise SaaS platform. The platform supports multiple user roles, company isolation, subscription management, payment processing, activity logging, and advanced analytics.

## Key Features

### 1. Multi-Tenant Architecture
- **Complete Company Isolation**: Each company's data is completely isolated from others
- **Database-Level Security**: Company IDs are indexed on all data models
- **Tenant Isolation Middleware**: Automatically enforces company boundaries on queries

### 2. Role-Based Access Control (RBAC)
Five distinct user roles with specific permissions:

#### Super Admin (`super_admin`)
- Platform-wide management and configuration
- Customer account management
- Subscription and billing oversight
- System monitoring and health checks
- Activity log access
- Revenue analytics

#### Self Owner (`self_owner`)
- Independent landlord management portal
- Own property and unit management
- Tenant management
- Payment recording
- Maintenance request handling
- Personal reporting and analytics

#### Manager (`manager`)
- Company-wide property management
- Multiple property oversight
- Tenant and lease management
- Payment processing and tracking
- Maintenance coordination
- Report generation

#### Owner (`owner`)
- Individual property ownership
- Single or multiple properties
- Financial tracking
- Maintenance management

#### Tenant (`tenant`)
- Self-service portal
- Rent payment tracking
- Maintenance requests
- Document access

### 3. Subscription Management
- **Multiple Plan Tiers**:
  - Trial (14 days free)
  - Starter
  - Professional
  - Business
  - Enterprise
  
- **Feature-Based Tiers**:
  - Resource limits (properties, units, managers, owners, tenants)
  - Custom branding
  - API access
  - Advanced reporting
  - Automation workflows
  - Priority support

- **Flexible Billing**:
  - Monthly and annual billing cycles
  - Auto-renewal management
  - Prorated upgrades/downgrades
  - Invoice generation
  - Grace period handling

### 4. Payment Provider Integration
Abstraction layer supporting multiple payment providers:
- **Stripe**: Credit card and digital payments
- **PayPal**: Global payment solution
- **Flutterwave**: African payment processor
- **Mobile Money**: Local mobile payment methods

Payment features:
- PCI DSS compliant processing
- Automatic retry mechanism
- Refund capability
- Transaction tracking

### 5. Activity Logging & Audit Trail
- Comprehensive action logging (login, CRUD operations, admin actions)
- IP address and user agent tracking
- Change tracking (before/after values)
- System-wide activity aggregation
- Export capabilities (CSV, PDF)

### 6. System Monitoring & Health Checks
- Real-time CPU and memory usage monitoring
- Database health tracking
- API response time monitoring
- Error tracking and alerting
- Warning log system
- Automatic data cleanup (90-day retention)

### 7. Advanced Reporting & Analytics
Multiple report types:
- **Revenue Reports**: Income tracking by month and property
- **Occupancy Reports**: Unit occupancy rates and trends
- **Property Reports**: Property metrics and statistics
- **Maintenance Reports**: Work orders, costs, resolution times
- **Subscription Analytics**: Customer distribution, plan analysis
- **Growth Analytics**: Historical growth trends
- **Executive Summary**: KPI dashboard

### 8. Company Management
Company features:
- Company profile and branding
- Subscription management
- User team management
- Payment method management
- Metadata storage
- Activity tracking

## Database Models

### Core Models

#### User
```javascript
{
  name: String,
  email: String,
  password: String (hashed),
  role: 'super_admin' | 'manager' | 'owner' | 'self_owner' | 'tenant',
  company: ObjectId (ref: Company),
  permissions: [String],
  isActive: Boolean,
  lastLogin: Date,
  twoFactorEnabled: Boolean,
  notificationPreferences: Object
}
```

#### Company
```javascript
{
  companyName: String,
  ownerName: String,
  email: String,
  phone: String,
  address: Object,
  superAdmin: ObjectId (ref: User),
  subscriptionPlan: ObjectId (ref: SubscriptionPlan),
  subscriptionStatus: 'trial' | 'active' | 'expired' | 'suspended' | 'cancelled',
  billingCycle: 'monthly' | 'annual',
  trialEndsAt: Date,
  subscriptionStartDate: Date,
  subscriptionEndDate: Date,
  paymentProvider: 'stripe' | 'paypal' | 'flutterwave' | 'mobile_money' | 'manual',
  monthlyRevenue: Number,
  annualRevenue: Number,
  isActive: Boolean,
  totalProperties: Number,
  totalUnits: Number,
  totalManagers: Number,
  totalOwners: Number,
  totalTenants: Number
}
```

#### SubscriptionPlan
```javascript
{
  name: String,
  description: String,
  monthlyPrice: Number,
  annualPrice: Number,
  trialDays: Number,
  maxProperties: Number,
  maxUnits: Number,
  maxManagers: Number,
  maxOwners: Number,
  maxTenants: Number,
  features: [Object],
  customBranding: Boolean,
  apiAccess: Boolean,
  advancedReporting: Boolean,
  prioritySupport: Boolean,
  status: 'active' | 'inactive' | 'discontinued'
}
```

#### ActivityLog
```javascript
{
  company: ObjectId (ref: Company),
  user: ObjectId (ref: User),
  action: String,
  entity: String,
  entityId: ObjectId,
  oldValue: Mixed,
  newValue: Mixed,
  changes: [Object],
  ipAddress: String,
  userAgent: String,
  status: 'success' | 'failure' | 'pending',
  errorMessage: String,
  metadata: Object
}
```

#### SubscriptionTransaction
```javascript
{
  company: ObjectId (ref: Company),
  subscriptionPlan: ObjectId (ref: SubscriptionPlan),
  amount: Number,
  billingCycle: 'monthly' | 'annual',
  transactionType: 'subscription' | 'upgrade' | 'downgrade' | 'refund',
  paymentMethod: String,
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded',
  paymentId: String,
  invoiceId: String,
  invoiceUrl: String,
  receiptUrl: String,
  startDate: Date,
  endDate: Date,
  processedDate: Date,
  retryCount: Number,
  nextRetryDate: Date
}
```

#### SystemSettings
```javascript
{
  key: String,
  value: Mixed,
  category: String,
  dataType: String,
  isEditable: Boolean,
  isPublic: Boolean
}
```

#### SystemMonitoring
```javascript
{
  cpuUsage: Number (0-100),
  memoryUsage: Number (0-100),
  databaseHealth: 'healthy' | 'warning' | 'critical',
  apiHealth: 'healthy' | 'warning' | 'critical',
  errors: [Object],
  warnings: [Object],
  backupStatus: String,
  lastBackup: Date,
  storageUsed: Number,
  storageAvailable: Number
}
```

#### Property
```javascript
{
  company: ObjectId (ref: Company) - REQUIRED FOR MULTI-TENANCY,
  name: String,
  location: String,
  address: Object,
  propertyType: String,
  owner: ObjectId (ref: User),
  totalUnits: Number,
  occupiedUnits: Number,
  vacantUnits: Number,
  occupancyRate: Number,
  monthlyIncome: Number,
  annualIncome: Number,
  status: 'active' | 'inactive' | 'maintenance'
}
```

#### Unit
```javascript
{
  company: ObjectId (ref: Company) - REQUIRED FOR MULTI-TENANCY,
  property: ObjectId (ref: Property),
  owner: ObjectId (ref: User),
  unitNumber: String,
  rentAmount: Number,
  status: 'vacant' | 'occupied' | 'maintenance' | 'reserved',
  currentTenant: ObjectId (ref: Tenant),
  leaseStartDate: Date,
  leaseEndDate: Date,
  maintenanceHistory: [ObjectId]
}
```

#### Tenant
```javascript
{
  company: ObjectId (ref: Company) - REQUIRED FOR MULTI-TENANCY,
  user: ObjectId (ref: User),
  property: ObjectId (ref: Property),
  owner: ObjectId (ref: User),
  unit: ObjectId (ref: Unit),
  status: 'active' | 'inactive' | 'pending' | 'terminated' | 'renewed',
  leaseStart: Date,
  leaseEnd: Date,
  rentAmount: Number,
  outstandingBalance: Number,
  totalPaidAmount: Number,
  securityDeposit: Number
}
```

#### Payment
```javascript
{
  company: ObjectId (ref: Company) - REQUIRED FOR MULTI-TENANCY,
  tenant: ObjectId (ref: Tenant),
  owner: ObjectId (ref: User),
  amount: Number,
  amountPaid: Number,
  status: 'paid' | 'pending' | 'overdue' | 'partial' | 'cancelled',
  dueDate: Date,
  paidDate: Date,
  paymentMethod: String,
  receiptNumber: String,
  penalties: Number,
  discount: Number,
  recordedBy: ObjectId (ref: User),
  verifiedBy: ObjectId (ref: User)
}
```

#### Maintenance
```javascript
{
  company: ObjectId (ref: Company) - REQUIRED FOR MULTI-TENANCY,
  tenant: ObjectId (ref: Tenant),
  property: ObjectId (ref: Property),
  unit: ObjectId (ref: Unit),
  owner: ObjectId (ref: User),
  status: 'submitted' | 'assigned' | 'in_progress' | 'completed' | 'cancelled',
  priority: 'low' | 'medium' | 'high' | 'urgent',
  category: String,
  issue: String,
  cost: Number,
  estimatedCost: Number,
  assignedTo: ObjectId (ref: User),
  submittedDate: Date,
  resolvedDate: Date,
  expectedCompletionDate: Date,
  vendor: Object
}
```

#### Document
```javascript
{
  company: ObjectId (ref: Company) - REQUIRED FOR MULTI-TENANCY,
  tenant: ObjectId (ref: Tenant),
  property: ObjectId (ref: Property),
  owner: ObjectId (ref: User),
  title: String,
  documentType: String,
  fileUrl: String,
  uploadedBy: ObjectId (ref: User),
  accessLevel: 'private' | 'owner' | 'manager' | 'tenant' | 'public',
  version: Number,
  expiryDate: Date
}
```

#### Notification
```javascript
{
  company: ObjectId (ref: Company) - REQUIRED FOR MULTI-TENANCY,
  user: ObjectId (ref: User),
  type: String,
  message: String,
  isRead: Boolean,
  priority: 'low' | 'medium' | 'high' | 'critical',
  channels: Object,
  actionUrl: String
}
```

## API Endpoints

### Authentication
```
POST   /api/auth/register              - Register user
POST   /api/auth/register-company      - Register company (self owner)
POST   /api/auth/login                 - Login
POST   /api/auth/logout                - Logout
GET    /api/auth/profile               - Get profile
PUT    /api/auth/profile               - Update profile
```

### Super Admin
```
GET    /api/super-admin/dashboard                - Dashboard KPIs
GET    /api/super-admin/customers                - List companies
GET    /api/super-admin/customers/:id            - Company details
POST   /api/super-admin/customers/:id/suspend    - Suspend company
POST   /api/super-admin/customers/:id/activate   - Activate company
POST   /api/super-admin/customers/:id/change-plan - Change plan
GET    /api/super-admin/system-monitor           - System health
GET    /api/super-admin/activity-logs            - Activity logs
GET    /api/super-admin/subscriptions-analytics  - Subscription analytics
GET    /api/super-admin/revenue-analytics        - Revenue analytics
GET    /api/super-admin/settings                 - Get settings
PUT    /api/super-admin/settings/:key            - Update setting
POST   /api/super-admin/users/:id/reset-password - Reset password
```

### Self Owner
```
GET    /api/self-owner/dashboard                 - Dashboard
GET    /api/self-owner/properties                - List properties
POST   /api/self-owner/properties                - Create property
PUT    /api/self-owner/properties/:id            - Update property
GET    /api/self-owner/properties/:id/units      - Property units
GET    /api/self-owner/tenants                   - List tenants
GET    /api/self-owner/payments                  - List payments
POST   /api/self-owner/payments                  - Record payment
GET    /api/self-owner/maintenance               - List maintenance
GET    /api/self-owner/reports/:type             - Generate report
```

## Services

### Subscription Service
Handles subscription lifecycle:
- Plan management
- Subscription creation/modification
- Upgrade/downgrade logic
- Cancellation
- Payment processing
- Invoice generation

### Payment Provider Service
Abstraction layer for payment processing:
- Multiple provider support
- Payment processing
- Refund handling
- Transaction verification
- Status checking

### Activity Log Service
Tracks all user actions:
- Activity logging
- User activity retrieval
- System-wide analytics
- Export capabilities
- Data cleanup

### System Monitoring Service
Platform health tracking:
- Metrics collection
- Health status
- Error tracking
- Warning management
- Dashboard data

### Reporting Service
Advanced analytics:
- Revenue reports
- Occupancy analysis
- Property statistics
- Maintenance tracking
- Growth trends
- Executive summary

## Security Features

### Company Data Isolation
- All models include `company` field (indexed)
- Middleware enforces company boundaries
- Query filters automatically applied
- Cross-company data access prevented

### Authentication & Authorization
- JWT token-based authentication
- 30-day token expiration
- Role-based access control
- Permission-based authorization
- IP and user agent tracking

### Password Security
- bcryptjs hashing (10 salt rounds)
- Password change tracking
- Password reset capability
- Account lockout after failed attempts

### Activity Audit Trail
- All actions logged with user/IP/timestamp
- Before/after value tracking
- Success/failure status recording
- Error message capture

## Middleware

### Protection Middleware
```javascript
protect: Validates JWT token, loads user
authorize(...roles): Checks user role
isolateCompanyData: Enforces company isolation
checkOwnershipOrManager: Verifies resource access
checkSubscriptionLimit: Validates plan limits
```

## Installation & Setup

### Backend
```bash
cd backend
npm install
# Create .env file with MongoDB URI and JWT secret
npm start
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables
```
MONGO_URI=mongodb://localhost:27017/rental-saas
JWT_SECRET=your-secret-key
PORT=5000
```

## Usage Examples

### Company Registration (Self Owner)
```bash
POST /api/auth/register-company
{
  "companyName": "John's Properties",
  "ownerName": "John Doe",
  "email": "john@properties.com",
  "password": "SecurePassword123",
  "phone": "+1234567890",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "country": "USA"
  }
}
```

### Create Property (Self Owner)
```bash
POST /api/self-owner/properties
Authorization: Bearer {token}
{
  "name": "Downtown Apartments",
  "location": "123 Main Street",
  "propertyType": "apartment",
  "description": "Modern apartment complex",
  "address": { ... },
  "amenities": [
    { "name": "Swimming Pool" },
    { "name": "Gym" }
  ]
}
```

### Generate Report
```bash
GET /api/self-owner/reports/revenue?startDate=2024-01-01&endDate=2024-12-31
Authorization: Bearer {token}
```

## Monitoring & Maintenance

### Database Indexes
All models have proper indexes on:
- company (multi-tenancy)
- owner/user (user queries)
- createdAt (date-based queries)
- status (state queries)

### Data Cleanup
Automatic cleanup jobs:
- Activity logs: Delete records > 90 days old
- System monitoring: TTL index 90 days
- Soft deletes: Retained for audit trail

### System Health
Monitor at: `/api/super-admin/system-monitor`
- CPU/Memory usage
- Database health
- API response times
- Error rates
- Backup status

## Testing Checklist

- [ ] Company registration and isolation
- [ ] User authentication and RBAC
- [ ] Subscription lifecycle (create, upgrade, downgrade, cancel)
- [ ] Payment processing with different providers
- [ ] Activity logging and audit trail
- [ ] Company data isolation (cross-company access prevented)
- [ ] Report generation
- [ ] System monitoring
- [ ] Soft deletes
- [ ] Email notifications
- [ ] SMS notifications
- [ ] API rate limiting

## Future Enhancements

1. **Payment Integration**
   - Live payment provider integration
   - Webhook handlers for payment confirmations
   - Automated invoice delivery

2. **Notifications**
   - Email notifications
   - SMS alerts
   - Push notifications
   - In-app notifications

3. **Advanced Features**
   - Tenant portal API
   - Document storage and versioning
   - Automatic rent reminders
   - Maintenance scheduling
   - Lease renewal management

4. **Reporting Enhancements**
   - Custom report builder
   - Scheduled report delivery
   - PDF/Excel export
   - Email distribution

5. **API**
   - OpenAPI documentation
   - Rate limiting
   - Webhook support
   - Partner integrations

## Support & Documentation

For detailed information:
- Backend API: See `backend/API_DOCUMENTATION.md`
- Database Design: See `docs/database-design.md`
- Requirements: See `docs/requirements.md`

## License

Proprietary - All Rights Reserved
