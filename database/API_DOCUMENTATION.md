# Rental Management SaaS - API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+256 700 123 456",
  "company": "Company Name",
  "role": "manager"
}
```

**Response (201):**
```json
{
  "_id": "user_id",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "manager",
  "token": "jwt_token"
}
```

#### Login User
```http
POST /auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "_id": "user_id",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "manager",
  "phone": "+256 700 123 456",
  "company": "Company Name",
  "token": "jwt_token"
}
```

#### Get User Profile
```http
GET /auth/profile
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "_id": "user_id",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "manager",
  "phone": "+256 700 123 456",
  "company": "Company Name",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Update User Profile
```http
PUT /auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Updated",
  "email": "john.updated@example.com",
  "phone": "+256 700 999 888",
  "company": "Updated Company",
  "password": "newpassword123"
}
```

**Response (200):**
```json
{
  "_id": "user_id",
  "name": "John Updated",
  "email": "john.updated@example.com",
  "role": "manager",
  "phone": "+256 700 999 888",
  "company": "Updated Company",
  "token": "new_jwt_token"
}
```

### Properties

#### Get All Properties
```http
GET /properties
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "_id": "property_id",
    "name": "Sunset Apartments",
    "location": "Kampala, Uganda",
    "description": "Modern apartment complex",
    "totalUnits": 12,
    "occupiedUnits": 10,
    "vacantUnits": 2,
    "status": "active",
    "owner": {
      "_id": "user_id",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### Get Single Property
```http
GET /properties/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "_id": "property_id",
  "name": "Sunset Apartments",
  "location": "Kampala, Uganda",
  "description": "Modern apartment complex",
  "totalUnits": 12,
  "occupiedUnits": 10,
  "vacantUnits": 2,
  "status": "active",
  "owner": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Create Property
```http
POST /properties
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Property",
  "location": "Location",
  "description": "Property description",
  "totalUnits": 10,
  "status": "active"
}
```

**Response (201):**
```json
{
  "_id": "property_id",
  "name": "New Property",
  "location": "Location",
  "description": "Property description",
  "totalUnits": 10,
  "occupiedUnits": 0,
  "vacantUnits": 10,
  "status": "active",
  "owner": "user_id",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Update Property
```http
PUT /properties/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Property",
  "location": "Updated Location",
  "description": "Updated description",
  "totalUnits": 15,
  "status": "active"
}
```

**Response (200):**
```json
{
  "_id": "property_id",
  "name": "Updated Property",
  "location": "Updated Location",
  "description": "Updated description",
  "totalUnits": 15,
  "occupiedUnits": 10,
  "vacantUnits": 5,
  "status": "active",
  "owner": "user_id",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Delete Property
```http
DELETE /properties/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Property removed"
}
```

### Units

#### Get All Units
```http
GET /units
Authorization: Bearer <token>
Query Parameters:
  - property: Filter by property ID
  - status: Filter by status (vacant, occupied, maintenance)
```

**Response (200):**
```json
[
  {
    "_id": "unit_id",
    "unitNumber": "SUN-001",
    "property": {
      "_id": "property_id",
      "name": "Sunset Apartments",
      "location": "Kampala, Uganda"
    },
    "rentAmount": 500000,
    "bedrooms": 2,
    "bathrooms": 1,
    "area": 80,
    "status": "occupied",
    "currentTenant": {
      "_id": "tenant_id",
      "fullName": "John Doe",
      "email": "john@example.com"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### Create Unit
```http
POST /units
Authorization: Bearer <token>
Content-Type: application/json

{
  "unitNumber": "SUN-001",
  "property": "property_id",
  "rentAmount": 500000,
  "bedrooms": 2,
  "bathrooms": 1,
  "area": 80,
  "status": "vacant"
}
```

**Response (201):**
```json
{
  "_id": "unit_id",
  "unitNumber": "SUN-001",
  "property": "property_id",
  "rentAmount": 500000,
  "bedrooms": 2,
  "bathrooms": 1,
  "area": 80,
  "status": "vacant",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Update Unit
```http
PUT /units/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "unitNumber": "SUN-001",
  "rentAmount": 550000,
  "status": "occupied"
}
```

**Response (200):**
```json
{
  "_id": "unit_id",
  "unitNumber": "SUN-001",
  "property": "property_id",
  "rentAmount": 550000,
  "bedrooms": 2,
  "bathrooms": 1,
  "area": 80,
  "status": "occupied",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Delete Unit
```http
DELETE /units/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Unit removed"
}
```

### Tenants

#### Get All Tenants
```http
GET /tenants
Authorization: Bearer <token>
```

**Response (200):**
```json
[
  {
    "_id": "tenant_id",
    "fullName": "John Doe",
    "email": "john@example.com",
    "phone": "+256 700 123 456",
    "property": {
      "_id": "property_id",
      "name": "Sunset Apartments",
      "location": "Kampala, Uganda"
    },
    "unit": {
      "_id": "unit_id",
      "unitNumber": "SUN-001",
      "rentAmount": 500000
    },
    "leaseStart": "2024-01-01T00:00:00.000Z",
    "leaseEnd": "2024-12-31T00:00:00.000Z",
    "status": "active",
    "emergencyContact": {
      "name": "Jane Doe",
      "phone": "+256 700 999 888",
      "relationship": "Spouse"
    },
    "idNumber": "CM12345678",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### Create Tenant
```http
POST /tenants
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+256 700 123 456",
  "property": "property_id",
  "unit": "unit_id",
  "leaseStart": "2024-01-01",
  "leaseEnd": "2024-12-31",
  "status": "active"
}
```

**Response (201):**
```json
{
  "_id": "tenant_id",
  "fullName": "John Doe",
  "email": "john@example.com",
  "phone": "+256 700 123 456",
  "property": "property_id",
  "unit": "unit_id",
  "leaseStart": "2024-01-01T00:00:00.000Z",
  "leaseEnd": "2024-12-31T00:00:00.000Z",
  "status": "active",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Update Tenant
```http
PUT /tenants/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "fullName": "John Updated",
  "phone": "+256 700 999 888",
  "status": "active"
}
```

**Response (200):**
```json
{
  "_id": "tenant_id",
  "fullName": "John Updated",
  "email": "john@example.com",
  "phone": "+256 700 999 888",
  "property": "property_id",
  "unit": "unit_id",
  "leaseStart": "2024-01-01T00:00:00.000Z",
  "leaseEnd": "2024-12-31T00:00:00.000Z",
  "status": "active",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Delete Tenant
```http
DELETE /tenants/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Tenant removed"
}
```

### Payments

#### Get All Payments
```http
GET /payments
Authorization: Bearer <token>
Query Parameters:
  - status: Filter by status (paid, pending, overdue)
  - tenant: Filter by tenant ID
  - property: Filter by property ID
```

**Response (200):**
```json
[
  {
    "_id": "payment_id",
    "tenant": {
      "_id": "tenant_id",
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "+256 700 123 456"
    },
    "property": {
      "_id": "property_id",
      "name": "Sunset Apartments",
      "location": "Kampala, Uganda"
    },
    "unit": {
      "_id": "unit_id",
      "unitNumber": "SUN-001"
    },
    "amount": 500000,
    "dueDate": "2024-01-01T00:00:00.000Z",
    "paidDate": "2024-01-01T00:00:00.000Z",
    "status": "paid",
    "paymentMethod": "bank_transfer",
    "notes": "Payment received",
    "receiptNumber": "RCP-ABC123-XYZ789",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### Get Payment Statistics
```http
GET /payments/stats
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "monthlyRevenue": 12450000,
  "collected": 15,
  "pending": 3,
  "overdue": 2
}
```

#### Create Payment
```http
POST /payments
Authorization: Bearer <token>
Content-Type: application/json

{
  "tenant": "tenant_id",
  "property": "property_id",
  "unit": "unit_id",
  "amount": 500000,
  "dueDate": "2024-01-01",
  "paidDate": "2024-01-01",
  "paymentMethod": "bank_transfer",
  "notes": "Payment received"
}
```

**Response (201):**
```json
{
  "_id": "payment_id",
  "tenant": "tenant_id",
  "property": "property_id",
  "unit": "unit_id",
  "amount": 500000,
  "dueDate": "2024-01-01T00:00:00.000Z",
  "paidDate": "2024-01-01T00:00:00.000Z",
  "status": "paid",
  "paymentMethod": "bank_transfer",
  "notes": "Payment received",
  "receiptNumber": "RCP-ABC123-XYZ789",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Update Payment
```http
PUT /payments/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 550000,
  "status": "paid",
  "paidDate": "2024-01-01"
}
```

**Response (200):**
```json
{
  "_id": "payment_id",
  "tenant": "tenant_id",
  "property": "property_id",
  "unit": "unit_id",
  "amount": 550000,
  "dueDate": "2024-01-01T00:00:00.000Z",
  "paidDate": "2024-01-01T00:00:00.000Z",
  "status": "paid",
  "paymentMethod": "bank_transfer",
  "notes": "Payment received",
  "receiptNumber": "RCP-ABC123-XYZ789",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Delete Payment
```http
DELETE /payments/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Payment removed"
}
```

### Maintenance

#### Get All Maintenance Requests
```http
GET /maintenance
Authorization: Bearer <token>
Query Parameters:
  - status: Filter by status (open, in_progress, resolved, closed)
  - priority: Filter by priority (low, medium, high, urgent)
  - property: Filter by property ID
```

**Response (200):**
```json
[
  {
    "_id": "maintenance_id",
    "requestId": "MTN-ABC123-XYZ7",
    "tenant": {
      "_id": "tenant_id",
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "+256 700 123 456"
    },
    "property": {
      "_id": "property_id",
      "name": "Sunset Apartments",
      "location": "Kampala, Uganda"
    },
    "unit": {
      "_id": "unit_id",
      "unitNumber": "SUN-001"
    },
    "issue": "Leaking faucet",
    "description": "Kitchen sink faucet is leaking constantly",
    "priority": "medium",
    "status": "open",
    "assignedTo": null,
    "resolvedDate": null,
    "resolutionNotes": null,
    "images": [],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### Create Maintenance Request
```http
POST /maintenance
Authorization: Bearer <token>
Content-Type: application/json

{
  "tenant": "tenant_id",
  "property": "property_id",
  "unit": "unit_id",
  "issue": "Leaking faucet",
  "description": "Kitchen sink faucet is leaking constantly",
  "priority": "medium",
  "status": "open"
}
```

**Response (201):**
```json
{
  "_id": "maintenance_id",
  "requestId": "MTN-ABC123-XYZ7",
  "tenant": "tenant_id",
  "property": "property_id",
  "unit": "unit_id",
  "issue": "Leaking faucet",
  "description": "Kitchen sink faucet is leaking constantly",
  "priority": "medium",
  "status": "open",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Update Maintenance Request
```http
PUT /maintenance/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "resolved",
  "resolutionNotes": "Faucet replaced successfully",
  "assignedTo": "user_id"
}
```

**Response (200):**
```json
{
  "_id": "maintenance_id",
  "requestId": "MTN-ABC123-XYZ7",
  "tenant": "tenant_id",
  "property": "property_id",
  "unit": "unit_id",
  "issue": "Leaking faucet",
  "description": "Kitchen sink faucet is leaking constantly",
  "priority": "medium",
  "status": "resolved",
  "assignedTo": "user_id",
  "resolvedDate": "2024-01-01T00:00:00.000Z",
  "resolutionNotes": "Faucet replaced successfully",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

#### Delete Maintenance Request
```http
DELETE /maintenance/:id
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Maintenance request removed"
}
```

## Error Responses

All endpoints may return error responses:

### 400 Bad Request
```json
{
  "message": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "message": "Not authorized, token failed"
}
```

### 404 Not Found
```json
{
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "message": "Server error message"
}
```

## Data Models

### User
```typescript
{
  _id: string;
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'staff';
  phone?: string;
  company?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Property
```typescript
{
  _id: string;
  name: string;
  location: string;
  description?: string;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  status: 'active' | 'inactive' | 'maintenance';
  image?: string;
  owner: string; // User ID
  createdAt: Date;
  updatedAt: Date;
}
```

### Unit
```typescript
{
  _id: string;
  unitNumber: string;
  property: string; // Property ID
  rentAmount: number;
  bedrooms: number;
  bathrooms: number;
  area?: number;
  status: 'vacant' | 'occupied' | 'maintenance';
  currentTenant?: string; // Tenant ID
  createdAt: Date;
  updatedAt: Date;
}
```

### Tenant
```typescript
{
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  property: string; // Property ID
  unit: string; // Unit ID
  leaseStart: Date;
  leaseEnd: Date;
  status: 'active' | 'inactive' | 'pending';
  emergencyContact?: {
    name?: string;
    phone?: string;
    relationship?: string;
  };
  idNumber?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Payment
```typescript
{
  _id: string;
  tenant: string; // Tenant ID
  property: string; // Property ID
  unit: string; // Unit ID
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  status: 'paid' | 'pending' | 'overdue' | 'partial';
  paymentMethod: 'cash' | 'bank_transfer' | 'mobile_money' | 'card';
  notes?: string;
  receiptNumber: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Maintenance
```typescript
{
  _id: string;
  requestId: string;
  tenant: string; // Tenant ID
  property: string; // Property ID
  unit: string; // Unit ID
  issue: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedTo?: string; // User ID
  resolvedDate?: Date;
  resolutionNotes?: string;
  images?: string[];
  createdAt: Date;
  updatedAt: Date;
}
```
