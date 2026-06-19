# Quick Reference Guide

## Getting Started

### Backend Setup
```bash
cd backend
npm install
# Create .env with MONGO_URI and JWT_SECRET
npm start
# Server runs on http://localhost:5000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

## Test User Accounts

### Super Admin
```
Email: admin@rentsaas.com
Password: AdminPassword123
Role: super_admin
```

### Self Owner (Create via registration)
```
Company Registration: POST /api/auth/register-company
Returns: JWT token + company details
Redirects to: /self-owner/dashboard
```

### Manager
```
Email: manager@rentsaas.com
Password: ManagerPassword123
Role: manager
Company: Central Management
```

## Frontend Routes

### Super Admin Portal
```
/super-admin/dashboard       - KPI overview
/super-admin/customers       - Customer management
/super-admin/subscriptions   - Subscription analytics
/super-admin/system-monitor  - System health
/super-admin/activity-logs   - Audit trail
/super-admin/reports         - Revenue analytics
/super-admin/settings        - Platform settings
```

### Self Owner Portal
```
/self-owner/dashboard        - KPI overview
/self-owner/properties       - Property management
/self-owner/tenants          - Tenant management
/self-owner/payments         - Payment tracking
/self-owner/maintenance      - Maintenance requests
/self-owner/reports          - Report generation
/self-owner/documents        - Document storage
/self-owner/profile          - Profile settings
```

### Manager Portal (Existing)
```
/manager/dashboard           - Dashboard
/manager/properties          - Properties
/manager/units               - Units
/manager/tenants             - Tenants
/manager/payments            - Payments
/manager/maintenance         - Maintenance
/manager/reports             - Reports
/manager/settings            - Settings
```

## Key API Endpoints

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
GET    /api/super-admin/dashboard
GET    /api/super-admin/customers
GET    /api/super-admin/customers/:id
POST   /api/super-admin/customers/:id/suspend
POST   /api/super-admin/customers/:id/activate
POST   /api/super-admin/customers/:id/change-plan
GET    /api/super-admin/system-monitor
GET    /api/super-admin/activity-logs
GET    /api/super-admin/subscriptions-analytics
GET    /api/super-admin/revenue-analytics
GET    /api/super-admin/settings
PUT    /api/super-admin/settings/:key
POST   /api/super-admin/users/:id/reset-password
```

### Self Owner
```
GET    /api/self-owner/dashboard
GET    /api/self-owner/properties
POST   /api/self-owner/properties
PUT    /api/self-owner/properties/:id
GET    /api/self-owner/properties/:id/units
GET    /api/self-owner/tenants
GET    /api/self-owner/payments
POST   /api/self-owner/payments
GET    /api/self-owner/maintenance
GET    /api/self-owner/reports/:type
```

## Common Tasks

### Register a New Self Owner
```bash
curl -X POST http://localhost:5000/api/auth/register-company \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "John Properties",
    "ownerName": "John Doe",
    "email": "john@properties.com",
    "password": "SecurePassword123",
    "phone": "+1234567890",
    "address": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY"
    }
  }'
```

### Create a Property
```bash
curl -X POST http://localhost:5000/api/self-owner/properties \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Downtown Apartments",
    "location": "123 Main Street",
    "propertyType": "apartment",
    "description": "Modern apartment complex"
  }'
```

### Record a Payment
```bash
curl -X POST http://localhost:5000/api/self-owner/payments \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant-id",
    "amount": 1500,
    "paymentMethod": "cash",
    "dueDate": "2024-02-01"
  }'
```

### Generate Report
```bash
curl -X GET "http://localhost:5000/api/self-owner/reports/revenue?startDate=2024-01-01&endDate=2024-12-31" \
  -H "Authorization: Bearer {token}"
```

## Database

### Collections
```
users               - User accounts
companies           - Tenant companies
properties          - Real estate properties
units               - Rental units
tenants             - Tenant records
payments            - Rent payments
maintenance         - Maintenance requests
documents           - Stored documents
activitylogs        - Audit trail
subscriptionplans   - Subscription tiers
subscriptiontransactions - Billing records
systemsettings      - Platform config
systemmonitoring    - Health metrics
notifications       - User notifications
```

### Indexes
- All collections have indexes on `company` field
- Users indexed on `email`, `company`, `role`
- Properties indexed on `company`, `owner`, `status`
- Activity logs indexed on `company`, `user`, `action`

## Environment Variables (.env)

```env
# Database
MONGO_URI=mongodb://localhost:27017/rental-management-saas

# JWT
JWT_SECRET=your-very-secure-secret-key
JWT_EXPIRE=30d

# Server
NODE_ENV=development
PORT=5000

# Frontend
FRONTEND_URL=http://localhost:5173

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Payment Providers (Optional)
STRIPE_SECRET_KEY=sk_test_...
PAYPAL_CLIENT_ID=...
PAYPAL_SECRET=...
```

## Troubleshooting

### Reset Password
```bash
# Via super admin endpoint
POST /api/super-admin/users/{userId}/reset-password
{
  "newPassword": "NewPassword123"
}
```

### Check System Health
```bash
GET /api/super-admin/system-monitor
# Returns: CPU, memory, database health, errors
```

### View Activity Logs
```bash
GET /api/super-admin/activity-logs?page=1&limit=50
# Filter by action or date
```

### Debug Company Isolation
```bash
# All queries automatically include company filter
# Check user has company assigned
GET /api/auth/profile
```

## Performance Tips

1. **Use Pagination**: All list endpoints support ?page=1&limit=50
2. **Filter Results**: Use status filters to reduce data
3. **Index Queries**: Database indexes on company, owner, status
4. **Cache Heavily Used**: Dashboard data loads in < 500ms
5. **Monitor Performance**: Check /api/super-admin/system-monitor

## Security Checklist

- ✅ JWT tokens expire after 30 days
- ✅ Passwords hashed with bcryptjs (10 rounds)
- ✅ Company isolation enforced at middleware level
- ✅ All user actions logged with IP address
- ✅ CORS configured for frontend origin
- ✅ Sensitive settings masked in UI
- ✅ Role-based access control on all routes

## File Locations

**Backend**
- Models: `backend/models/`
- Controllers: `backend/controllers/`
- Services: `backend/services/`
- Routes: `backend/routes/`
- Middleware: `backend/middleware/`

**Frontend**
- Pages: `frontend/src/pages/`
- Layouts: `frontend/src/layouts/`
- Components: `frontend/src/components/`
- Services: `frontend/src/services/`
- Context: `frontend/src/context/`

**Documentation**
- README: `ENTERPRISE_README.md`
- Integration: `INTEGRATION_GUIDE.md`
- Roadmap: `ROADMAP.md`
- Summary: `COMPLETION_SUMMARY.md`

## Useful Commands

```bash
# Start backend development server
cd backend && npm run dev

# Start frontend development server
cd frontend && npm run dev

# Build frontend for production
cd frontend && npm run build

# Seed database with initial data
cd backend && node seed.js

# Run tests (when implemented)
npm test

# Generate API documentation (when implemented)
npm run docs

# Monitor MongoDB
mongosh

# Check active connections
netstat -an | grep 5000
```

## Support Resources

1. Check `ENTERPRISE_README.md` for detailed architecture
2. Review `INTEGRATION_GUIDE.md` for API examples
3. See `ROADMAP.md` for planned features
4. Check browser console for frontend errors
5. Review backend logs for API errors

## Next Priority Features

1. Email notifications
2. Payment webhooks
3. PDF report export
4. SMS alerts
5. Two-factor authentication

---

**Last Updated**: June 16, 2026
**API Version**: 1.0.0
**Frontend Version**: 1.0.0
