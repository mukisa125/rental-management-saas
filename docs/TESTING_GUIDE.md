# User Approval Workflow - Quick Testing Guide

## 🚀 Getting Started

### Step 1: Run Database Seed
```bash
cd backend
node seed.js
# or if you have npm script
npm run seed
```

**Expected Output:**
```
Connected to MongoDB
Cleared existing data
Created subscription plans: 5
Created super admin company
Created super admin user: super@ug.com
Super Admin Credentials - Email: super@ug.com | Password: SuperAdmin@2026!
Created manager user: mark@example.com
...
Database seeded successfully!
```

### Step 2: Start Backend Server
```bash
npm start
# Server should run on http://localhost:5000
```

### Step 3: Start Frontend
```bash
cd frontend
npm run dev
# Frontend should run on http://localhost:5173 (or your configured port)
```

---

## 🧪 Test Scenarios

### Scenario 1: Super Admin Login ✓
1. Open login page
2. Enter: `admin@rentsaas.com` / `AdminPassword123`
3. **Expected:** Login successful → Redirect to super admin dashboard
4. **Verify:** You see "Super Admin Dashboard" header

---

### Scenario 2: Manager Registration (Requires Approval) ⏳
1. Go to Register page
2. Fill form:
   - Name: John Manager
   - Email: john.mgr@test.com
   - Password: Test1234
   - Phone: +256 700 900 900
   - Role: **Manager (requires approval)** ← Select this
3. Click Register
4. **Expected:**
   - See blue message: "Registration successful! Your account is pending approval..."
   - Form resets
   - NOT redirected to dashboard

5. Try to login with john.mgr@test.com / Test1234
   - **Expected:** Error message: "Your account is pending approval from admin"

---

### Scenario 3: Tenant Registration (Auto-Approved) ✓
1. Go to Register page
2. Fill form:
   - Name: Jane Tenant
   - Email: jane.tenant@test.com
   - Password: Test1234
   - Phone: +256 700 800 800
   - Role: **Tenant** ← Select this
3. Click Register
4. **Expected:**
   - Redirected to dashboard immediately
   - Can login with those credentials

---

### Scenario 4: Super Admin Approves Manager User 📋
**Prerequisites:** Complete Scenario 2 first (create pending manager)

#### Using API (Postman/cURL):

**1. Get Admin JWT Token**
```bash
POST /api/auth/login
Body: {
  "email": "admin@rentsaas.com",
  "password": "AdminPassword123"
}
```
Copy the JWT token from response.

**2. Get Pending Users**
```bash
GET /api/super-admin/pending-users
Headers: Authorization: Bearer <JWT_TOKEN>
```
**Response includes:**
```json
{
  "users": [
    {
      "_id": "USER_ID",
      "name": "John Manager",
      "email": "john.mgr@test.com",
      "role": "manager",
      "approvalStatus": "pending"
    }
  ]
}
```

**3. Approve the User**
```bash
POST /api/super-admin/users/<USER_ID>/approve
Headers: Authorization: Bearer <JWT_TOKEN>
Body: {} (empty)
```
**Expected Response:**
```json
{
  "success": true,
  "message": "User John Manager has been approved",
  "user": {
    "id": "USER_ID",
    "name": "John Manager",
    "email": "john.mgr@test.com",
    "role": "manager",
    "approvalStatus": "approved"
  }
}
```

**4. User Can Now Login**
- Go to login page
- Enter: john.mgr@test.com / Test1234
- **Expected:** Login successful → Redirected to dashboard

---

### Scenario 5: Super Admin Rejects Manager User ❌
**Prerequisites:** Create another pending manager user

#### Using API:

**1. Get Admin JWT Token** (same as Scenario 4 step 1)

**2. Reject the User**
```bash
POST /api/super-admin/users/<USER_ID>/reject
Headers: Authorization: Bearer <JWT_TOKEN>
Body: {
  "rejectionReason": "Incomplete documentation provided"
}
```
**Expected Response:**
```json
{
  "success": true,
  "message": "User Mike Owner has been rejected",
  "user": {
    "id": "USER_ID",
    "name": "Mike Owner",
    "email": "mike.owner@test.com",
    "role": "owner",
    "approvalStatus": "rejected",
    "rejectionReason": "Incomplete documentation provided"
  }
}
```

**3. User Cannot Login**
- Go to login page
- Enter: mike.owner@test.com / Test1234
- **Expected:** Error message: "Your account has been rejected. Reason: Incomplete documentation provided"

---

## 🔍 Verification Checklist

### Backend Verification

- [ ] **User Model has approval fields**
  ```bash
  # Check in backend/models/User.js
  - approvalStatus field exists
  - approvedBy field exists
  - approvalDate field exists
  - rejectionReason field exists
  ```

- [ ] **Auth Controller Updated**
  ```bash
  # Check in backend/controllers/authController.js
  - registerUser() sets approvalStatus based on role
  - loginUser() validates approvalStatus
  ```

- [ ] **Super Admin Controller has 3 new methods**
  ```bash
  # Check in backend/controllers/superAdminController.js
  - getPendingUsers() exists
  - approveUser() exists
  - rejectUser() exists
  ```

- [ ] **Routes Added**
  ```bash
  # Check in backend/routes/superAdminRoutes.js
  - GET /pending-users
  - POST /users/:userId/approve
  - POST /users/:userId/reject
  ```

### Frontend Verification

- [ ] **Register Component Updated**
  ```bash
  # Check in frontend/src/pages/Register.jsx
  - role field in formData
  - role dropdown in form
  - registrationStatus state exists
  - pending message shows correctly
  ```

- [ ] **Role Options Display**
  - Manager (requires approval)
  - Owner (requires approval)
  - Tenant

### Database Verification

- [ ] **Seed Data Created**
  ```bash
  # Check MongoDB
  - 5 SubscriptionPlans created
  - 1 Company for super admin
  - 6 Users created (1 super admin + 5 demo users)
  ```

- [ ] **Super Admin Account**
  - Email: admin@rentsaas.com
  - Password: AdminPassword123
  - Role: super_admin
  - approvalStatus: approved
  - Can login successfully

---

## 🐛 Troubleshooting

### Issue: "User not found" when approving
**Solution:** 
1. Verify user ID is correct
2. Ensure user exists with approvalStatus='pending'
3. Check MongoDB connection

### Issue: Register doesn't show role dropdown
**Solution:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard reload (Ctrl+F5)
3. Rebuild frontend: `npm run build`

### Issue: "Rejection reason is required" error
**Solution:**
1. Ensure rejectionReason is in request body
2. Make sure it's not empty string
3. Example correct body:
   ```json
   {
     "rejectionReason": "Reason for rejection here"
   }
   ```

### Issue: Super admin login fails
**Solution:**
1. Run seed again: `node seed.js`
2. Check MongoDB connection string
3. Verify admin@rentsaas.com exists in User collection
4. Check password hash was created (bcrypt)

---

## 📝 API Testing Commands

### Using cURL

**Login as super admin:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rentsaas.com","password":"AdminPassword123"}'
```

**Get pending users:**
```bash
curl -X GET http://localhost:5000/api/super-admin/pending-users \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Approve user:**
```bash
curl -X POST http://localhost:5000/api/super-admin/users/<USER_ID>/approve \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Reject user:**
```bash
curl -X POST http://localhost:5000/api/super-admin/users/<USER_ID>/reject \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"rejectionReason":"Reason here"}'
```

---

## 📧 Next Steps (Not Implemented Yet)

These features are ready for implementation:

1. **Email Notifications**
   - Welcome email to pending users
   - Approval confirmation email
   - Rejection email with reason

2. **Super Admin Dashboard Page**
   - Frontend component for user approvals
   - Tabs: Pending | Approved | Rejected
   - One-click approve/reject buttons

3. **Admin Audit Dashboard**
   - View all user approval actions
   - See who approved/rejected whom
   - Timestamps and IP addresses

4. **Bulk Operations**
   - Approve multiple users at once
   - Batch reject with reason

---

**Status:** ✅ Complete and Ready for Testing
**Last Updated:** January 2024
**Created by:** Development Team

For questions or issues, refer to SUPER_ADMIN_SETUP.md
