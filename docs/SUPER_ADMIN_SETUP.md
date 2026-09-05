# Super Admin Setup & User Approval Workflow

## 🔐 Super Admin Credentials

**Email:** `super@ug.com`  
**Password:** `SuperAdmin@2026!`

These credentials are created automatically when you run the seed script. The super admin account has:
- Role: `super_admin`
- Approval Status: `approved` (can login immediately)
- Plan: Enterprise (unlimited access to all features)
- Email: admin@rentsaas.com

---

## 🎯 User Approval Workflow Overview

### Registration Flow

1. **Manager & Owner Registration** → Sets `approvalStatus = 'pending'`
2. **Tenant Registration** → Sets `approvalStatus = 'approved'` (can login immediately)
3. **Pending users cannot login** until approved by super admin
4. **Super admin can approve/reject** pending users from the API or dashboard

### Role-Based Approval

- **Roles requiring approval:** `manager`, `owner`
- **Roles approved automatically:** `tenant`, `self_owner`
- **Super admin:** Always approved

---

## 📝 Frontend - Register Component Updates

### New Features:
✅ Role dropdown field added with options:
- Manager (requires approval)
- Owner (requires approval)  
- Tenant (auto-approved)

✅ Approval pending message displays after registration for pending roles:
```
Registration successful! Your account is pending approval from the admin. 
You will receive an email once your account is approved.
```

### File Modified:
- `frontend/src/pages/Register.jsx`

**Updated State:**
```javascript
const [formData, setFormData] = useState({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  company: '',
  role: 'manager', // NEW: Default to manager
});

const [registrationStatus, setRegistrationStatus] = useState(null); // NEW
```

**Updated Form Field:**
```jsx
<select
  value={formData.role}
  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
  className="w-full px-4 py-3 border border-gray-300 rounded-lg..."
>
  <option value="manager">Manager (requires approval)</option>
  <option value="owner">Owner (requires approval)</option>
  <option value="tenant">Tenant</option>
</select>
```

---

## 🔌 Backend - New Super Admin Endpoints

### 1. Get Pending Users
**Endpoint:** `GET /api/super-admin/pending-users`  
**Auth:** Required (super_admin role)  
**Query Params:**
- `page` (default: 1)
- `limit` (default: 50)

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "_id": "userId",
      "name": "John Manager",
      "email": "john@example.com",
      "role": "manager",
      "phone": "+256 700 123 456",
      "company": { "companyName": "My Company" },
      "approvalStatus": "pending",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 5,
    "pages": 1
  }
}
```

### 2. Approve User
**Endpoint:** `POST /api/super-admin/users/:userId/approve`  
**Auth:** Required (super_admin role)  
**Body:** (none required)

**Response:**
```json
{
  "success": true,
  "message": "User John Manager has been approved",
  "user": {
    "id": "userId",
    "name": "John Manager",
    "email": "john@example.com",
    "role": "manager",
    "approvalStatus": "approved"
  }
}
```

**Activity Logged:** ✅ User approval is logged with timestamp, approver details, and IP address

### 3. Reject User
**Endpoint:** `POST /api/super-admin/users/:userId/reject`  
**Auth:** Required (super_admin role)  
**Body:**
```json
{
  "rejectionReason": "Profile information does not match documentation"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User John Manager has been rejected",
  "user": {
    "id": "userId",
    "name": "John Manager",
    "email": "john@example.com",
    "role": "manager",
    "approvalStatus": "rejected",
    "rejectionReason": "Profile information does not match documentation"
  }
}
```

**Activity Logged:** ✅ User rejection is logged with rejection reason

---

## 🗄️ Database - User Model Updates

### New Fields in User Schema:

```javascript
approvalStatus: {
  type: String,
  enum: ['pending', 'approved', 'rejected'],
  default: 'approved'
},
approvedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User'
},
approvalDate: {
  type: Date
},
rejectionReason: {
  type: String
}
```

### Index Added:
- `approvalStatus` field is indexed for fast queries

---

## 🌾 Seed Data

### Subscription Plans Created (5 Plans):
1. **Trial** - Free trial for 14 days
   - Max: 3 properties, 10 units, 20 tenants
2. **Starter** - $29.99/month
   - Max: 10 properties, 50 units, 100 tenants
3. **Professional** - $99.99/month
   - Max: 50 properties, 500 units, 1000 tenants
   - Includes: API access, custom reports
4. **Business** - $299.99/month
   - Max: 500 properties, 5000 units, 10000 tenants
5. **Enterprise** - $999.99/month
   - Unlimited resources

### Demo Users Created:
All demo users are pre-approved and can login immediately:
- Super Admin: `admin@rentsaas.com` / `AdminPassword123`
- Manager: `mark@example.com` / `password123`
- Owner: `owner@example.com` / `password123`
- Tenant: `tenant@example.com` / `password123`
- Additional Tenants: john@, jane@, robert@example.com

---

## 🚀 How to Test the Workflow

### Step 1: Seed the Database
```bash
cd backend
npm run seed
# or
node seed.js
```

**Output will include:**
```
Super Admin Credentials - Email: super@ug.com | Password: SuperAdmin@2026!
```

### Step 2: Test Super Admin Login
```bash
1. Go to frontend login page
2. Enter: admin@rentsaas.com / AdminPassword123
3. You should have access to super admin dashboard
```

### Step 3: Test Manager Registration (Pending Approval)
```bash
1. Go to frontend register page
2. Fill form with role = "Manager"
3. Click register
4. See "pending approval" message
5. Try to login → Should get error: "Your account is pending approval from admin"
```

### Step 4: Approve User via API
```bash
# Using cURL or Postman
POST /api/super-admin/users/:userId/approve
Headers: Authorization: Bearer <ADMIN_JWT_TOKEN>

# Or use frontend dashboard when UI is built
```

### Step 5: User Can Now Login
```bash
1. After approval, user receives notification
2. User can login with credentials
3. User is redirected to appropriate dashboard based on role
```

---

## 📊 Routes Summary

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/super-admin/pending-users` | List pending users | super_admin |
| POST | `/api/super-admin/users/:userId/approve` | Approve user | super_admin |
| POST | `/api/super-admin/users/:userId/reject` | Reject user | super_admin |
| POST | `/api/auth/register` | Register new user | None |
| POST | `/api/auth/login` | Login user | None |

---

## 🔄 Login Response Based on Approval Status

### Approved User - Login Success
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "_id": "userId",
    "name": "User Name",
    "email": "user@example.com",
    "role": "manager"
  }
}
```

### Pending User - Login Rejected
```json
{
  "success": false,
  "message": "Your account is pending approval from admin"
}
```

### Rejected User - Login Rejected
```json
{
  "success": false,
  "message": "Your account has been rejected. Reason: Profile information does not match documentation"
}
```

---

## ✅ Implementation Checklist

- ✅ User model updated with approval fields
- ✅ Auth controller registerUser() checks role and sets approval status
- ✅ Auth controller loginUser() validates approval status
- ✅ Super admin endpoints added:
  - ✅ getPendingUsers()
  - ✅ approveUser()
  - ✅ rejectUser()
- ✅ Super admin routes created
- ✅ Register component updated with role dropdown
- ✅ Approval pending message UI
- ✅ Seed.js creates super admin account
- ✅ Subscription plans seeded (5 plans)
- ✅ Activity logging for all approval actions
- ⏳ (Future) Email notifications for approval/rejection
- ⏳ (Future) Super admin approval dashboard UI

---

## 📧 Future Enhancements

1. **Email Notifications**
   - Send email when user registered and pending
   - Send email when account is approved
   - Send email when account is rejected with reason

2. **Admin Dashboard Page**
   - Super admin user approval interface
   - 3 tabs: Pending, Approved, Rejected
   - Quick approve/reject buttons

3. **Bulk Actions**
   - Approve multiple users at once
   - Batch reject with reason

4. **Email Templates**
   - Welcome email for approved users
   - Rejection email with reason
   - Pending approval notification

---

## 🆘 Troubleshooting

**Q: Super admin can't login?**
A: Make sure you ran `npm run seed` first. Check that MongoDB has the User document with email `admin@rentsaas.com` and approvalStatus `approved`.

**Q: Registered user stuck on pending?**
A: Use the `/api/super-admin/users/:userId/approve` endpoint to approve them. Super admin must call this endpoint.

**Q: Register page doesn't show role dropdown?**
A: Clear browser cache and rebuild frontend. Make sure you're viewing the updated Register.jsx component.

**Q: Can't call super admin endpoints?**
A: Ensure you're authenticated with super admin user JWT token. Check that your JWT has `role: 'super_admin'`.

---

Generated: January 2024
Last Updated: User Approval Workflow Implementation
