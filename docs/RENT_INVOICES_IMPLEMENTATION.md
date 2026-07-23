# Rent & Invoices Page - Implementation Documentation

## Overview
A comprehensive Rent & Invoices management page has been successfully implemented for the RentSaaS Self Owner dashboard. This allows property owners to manage rent billing, generate invoices, track payments, and monitor outstanding balances.

---

## Files Changed

### Frontend Files

#### 1. **SelfOwnerInvoices.jsx** (Main Page)
**Path:** `frontend/src/pages/self-owner/SelfOwnerInvoices.jsx`

**Changes:**
- Completely rewritten from a basic table to a comprehensive invoice management system
- Added state management for invoices, filters, tabs, and modals
- Implemented invoice loading with pagination and filtering
- Added multiple tabs for different invoice statuses
- Integrated all child components
- Added invoice preview and payment recording functionality
- Implemented print and PDF generation logic
- Added error handling and loading states

**Key Features:**
- Summary cards showing invoice metrics
- Advanced filtering by property, billing month, and date range
- Tabbed interface for different invoice statuses
- Invoice table with detailed information
- Multiple modals for creating and managing invoices
- Invoice preview/receipt style display

---

### Components Created

#### 2. **InvoiceSummaryCards.jsx**
**Path:** `frontend/src/components/invoices/InvoiceSummaryCards.jsx`

**Purpose:** Display 6 key invoice metrics
- Total Invoiced This Month
- Paid Invoices
- Unpaid Invoices
- Overdue Invoices
- Partial Payments
- Outstanding Balance

**Features:**
- Uses card-based layout with icons
- Shows invoice counts and amounts
- Color-coded based on status
- Responsive grid (1, 2, 3, or 6 columns)

---

#### 3. **InvoiceFilters.jsx**
**Path:** `frontend/src/components/invoices/InvoiceFilters.jsx`

**Purpose:** Provide filtering and action controls

**Filters Available:**
- Search by invoice number, tenant name, or property
- Filter by property
- Filter by billing month
- Filter by due date range (start and end date)
- Reset filters button

**Actions:**
- Generate Invoice button (opens modal)
- Generate Monthly Invoices button (opens modal)

---

#### 4. **InvoiceTable.jsx**
**Path:** `frontend/src/components/invoices/InvoiceTable.jsx`

**Purpose:** Display invoices in a structured table format

**Columns:**
- Invoice No.
- Tenant Name & Phone
- Property / Unit
- Due Date (with overdue indicator)
- Rent Amount
- Amount Paid
- Balance (highlighted in red if > 0)
- Status (with color-coded badge)
- Actions (View, Print buttons)

**Features:**
- Responsive table with horizontal scroll on mobile
- Automatic status detection based on balance and due date
- Overdue indicator showing days overdue
- Quick action buttons for viewing and printing

---

#### 5. **GenerateInvoiceModal.jsx**
**Path:** `frontend/src/components/invoices/GenerateInvoiceModal.jsx`

**Purpose:** Modal for creating a single invoice

**Fields:**
- Select Tenant (with auto-fill)
- Property (auto-filled, read-only)
- Unit (auto-filled, read-only)
- Billing Month
- Due Date
- Rent Amount
- Previous Balance
- Late Fee
- Discount
- Notes

**Smart Behavior:**
- When tenant is selected, auto-fills property, unit, rent amount, and previous balance
- Displays total due in real-time
- Form validation with error messages
- Loading state during submission

---

#### 6. **GenerateMonthlyInvoicesModal.jsx**
**Path:** `frontend/src/components/invoices/GenerateMonthlyInvoicesModal.jsx`

**Purpose:** Bulk invoice generation for multiple tenants

**Fields:**
- Billing Month (required)
- Due Date (required)
- Property Filter (optional - generate only for specific property)
- Include Previous Balances (checkbox)
- Add Late Fee (checkbox with amount input)
- Notes (applies to all invoices)

**Features:**
- Generate invoices for all active tenants
- Skip tenants with previous balances (optional)
- Add late fees automatically
- Generates preview showing:
  - Total active tenants
  - Already invoiced
  - New invoices to generate
  - Total expected rent

---

#### 7. **InvoicePreview.jsx**
**Path:** `frontend/src/components/invoices/InvoicePreview.jsx`

**Purpose:** Display detailed invoice preview in receipt style

**Display Information:**
- Invoice header with RentSaaS branding
- Invoice number and dates
- Tenant information (name, phone, email)
- Property & unit details
- Prepared by (owner name)
- Itemized charges:
  - Rent Amount
  - Previous Balance
  - Late Fee
  - Discount
- Financial Summary:
  - Total Due
  - Amount Paid
  - Balance Due (highlighted)
- Notes and payment instructions
- Payment instructions section

**Actions:**
- Print Invoice
- Download PDF
- Send Invoice (placeholder)
- Record Payment (if balance > 0)

**Payment Recording:**
- Toggle to payment mode when needed
- Input payment amount (with max limit = balance)
- Validation for payment amount
- Automatic submission handling

---

## Backend Changes

### 1. **selfOwnerController.js** - Updated Methods

#### Enhanced `createInvoice()`
**Location:** `backend/controllers/selfOwnerController.js:561-610`

**Improvements:**
- Added validation for required fields
- Added duplicate invoice prevention by checking:
  - Same tenant
  - Same unit
  - Same billing month
  - Not cancelled status
- Supports all invoice fields:
  - Rent amount
  - Previous balance
  - Penalties (late fees)
  - Discount
  - Billing month
- Updates tenant's outstanding balance
- Returns populated invoice with all relations

---

#### New `generateMonthlyInvoices()`
**Location:** `backend/controllers/selfOwnerController.js:612-705`

**Features:**
- Bulk generates invoices for active tenants
- Filters by property if specified
- Checks for existing invoices in billing month
- Option to include/exclude previous balances
- Automatic late fee application
- Returns summary with:
  - Total tenants processed
  - Already invoiced count
  - New invoices created
  - Total expected rent

**Safety:**
- Continues on individual invoice failures
- Doesn't fail entire batch if one fails

---

#### New `recordPaymentOnInvoice()`
**Location:** `backend/controllers/selfOwnerController.js:707-745`

**Features:**
- Records payment on specific invoice
- Validates payment amount
- Prevents overpayment
- Updates invoice status (partial or paid)
- Updates tenant's outstanding balance
- Updates tenant's total paid amount
- Sets paid date automatically

---

#### Enhanced `getPaymentSummary()`
**Location:** `backend/controllers/selfOwnerController.js:410-465`

**New Fields Returned:**
- `totalInvoiced` - Total invoices created
- `totalInvoicedThisMonth` - Invoices created this month
- `paidInvoices` - Count of paid invoices
- `unpaidInvoices` - Count of unpaid invoices
- `partialInvoices` - Count of partially paid invoices
- `overdueInvoices` - Count of overdue invoices
- `paidAmount` - Total amount paid
- `unpaidAmount` - Total unpaid amount
- `partialAmount` - Total partially paid amount
- `overdueAmount` - Total overdue amount
- `outstandingBalance` - Total outstanding (unpaid + partial + overdue)

---

### 2. **selfOwnerRoutes.js** - Updated Routes

**New Routes Added:**
```javascript
// Record payment on specific invoice
POST /self-owner/payments/:id/record-payment

// Generate invoices for multiple tenants
POST /self-owner/invoices/monthly

// Create single invoice
POST /self-owner/invoices
```

**Route Order (Specific before Generic):**
```javascript
router.post('/payments/:id/record-payment', controller.recordPaymentOnInvoice);
router.post('/invoices/monthly', controller.generateMonthlyInvoices);
router.route('/invoices').post(controller.createInvoice);
```

---

## How Invoice Generation Works

### Single Invoice Creation

1. **User clicks "Generate Invoice"**
   - Modal opens with tenant selection

2. **User selects tenant**
   - Auto-fills: Property, Unit, Rent Amount, Previous Balance
   - User can override these values

3. **User fills remaining fields**
   - Billing Month
   - Due Date
   - Late Fee (optional)
   - Discount (optional)
   - Notes (optional)

4. **Form submission**
   - Frontend validates all required fields
   - Calculates total: Rent + Previous Balance + Late Fee - Discount
   - Sends POST request to `/self-owner/invoices`

5. **Backend processing**
   - Validates tenant ownership
   - Creates Payment document with status: 'pending'
   - Updates tenant's outstanding balance
   - Generates receipt number
   - Returns populated invoice

6. **Success**
   - Shows success notification
   - Refreshes invoice list
   - Closes modal

---

### Monthly Invoices Generation

1. **User clicks "Generate Monthly Invoices"**
   - Modal opens with bulk options

2. **User configures settings**
   - Selects Billing Month
   - Sets Due Date
   - Optionally filters by Property
   - Toggles "Include Previous Balances"
   - Optionally adds Late Fee

3. **Form submission**
   - Sends POST request to `/self-owner/invoices/monthly`

4. **Backend processing**
   - Retrieves all active tenants (filtered if needed)
   - Checks for existing invoices in billing month
   - For each tenant without invoice:
     - Calculates total: Rent + Previous Balance + Late Fee
     - Creates Payment document
     - Updates tenant balance
   - Skips tenants with previous balance if option disabled
   - Returns summary and created invoices

5. **Response**
   - Shows count of invoices created
   - Displays summary statistics
   - Refreshes invoice list

---

## How Duplicate Invoices Are Prevented

### Method 1: Database Check (Recommended)

In `createInvoice()`:
```javascript
// Check for existing invoice in billing month
const existingInvoice = await Payment.findOne({
  owner: ownerId,
  tenant: tenantId,
  unit: unitId,
  property: propertyId,
  createdAt: { $gte: monthStart, $lte: monthEnd },
  status: { $ne: 'cancelled' }
});

if (existingInvoice) {
  return error: 'Invoice already exists for this tenant, unit, and billing month'
}
```

### Method 2: Date Range Matching

- Billing month converted to date range (1st to last day)
- Search for existing documents in that range
- Check for same tenant AND unit AND property
- Ignore cancelled invoices

### Method 3: Status Check

- Only active/pending invoices count as existing
- Cancelled invoices don't prevent new ones
- Allows re-invoicing if needed

---

## How Invoice Status Is Calculated

### Automatic Status Determination

The system determines invoice status based on:

1. **Amount Paid vs. Total Due**
   - If amountPaid ≥ amount → Status: **Paid**
   - If amountPaid > 0 AND < amount → Status: **Partial**
   - If amountPaid = 0 → Status: **Unpaid**

2. **Due Date Comparison**
   - If dueDate < today AND balance > 0 → Status: **Overdue**
   - Updated dynamically as days pass

3. **User-Set Status**
   - Special statuses: **Draft**, **Cancelled**
   - Set explicitly by owner

4. **Balance Calculation**
   ```
   Balance = Total Due - Amount Paid
   Total Due = Rent Amount + Previous Balance + Late Fee - Discount
   ```

### Status Flow
```
Draft → Pending → Unpaid → Partial → Paid
            ↓
          Overdue (if due date passes)
            ↓
          Cancelled (if cancelled by owner)
```

---

## How to Test the Rent & Invoices Page

### Prerequisites
- Backend running on http://localhost:5000
- Frontend running on http://localhost:5173
- Authenticated as Self Owner
- Have properties, units, and tenants created

### Test Scenario 1: Create Single Invoice

1. Navigate to **Dashboard → Rent & Invoices**
2. Click **"Generate Invoice"** button
3. Select a tenant from dropdown
   - Verify property, unit, rent amount auto-fill
4. Select billing month (e.g., 2024-01)
5. Set due date (e.g., 2024-01-15)
6. Enter late fee (e.g., 50000)
7. Enter discount (e.g., 10000)
8. Add notes (optional)
9. Click **"Create Invoice"**
10. Verify:
    - Success notification appears
    - Invoice appears in table
    - Summary cards update
    - Invoice receipt number is generated
    - Tenant outstanding balance increases

### Test Scenario 2: Generate Monthly Invoices

1. Navigate to **Rent & Invoices**
2. Click **"Generate Monthly Invoices"** button
3. Select billing month
4. Set due date
5. Toggle "Include Previous Balances" ON
6. Toggle "Add Late Fee" ON and enter amount
7. Click **"Generate Invoices"**
8. Verify:
    - Multiple invoices created
    - Summary shows correct counts
    - Each tenant has one invoice
    - No duplicate invoices
    - All tenants from property included

### Test Scenario 3: View Invoice Preview

1. In invoice table, click **"View Invoice"** (eye icon)
2. Verify preview shows:
    - Invoice details (number, dates, status)
    - Tenant information
    - Property and unit
    - Itemized charges (rent, previous balance, fees, discount)
    - Financial summary (total due, paid, balance)
    - Notes and payment instructions
3. Click **"Print"** to print invoice
4. Click **"Download PDF"** to download
5. Click **"Send Invoice"** to email (if implemented)

### Test Scenario 4: Record Payment

1. In invoice preview, click **"Record Payment"**
2. Enter payment amount (must be ≤ balance)
3. Click **"Confirm Payment"**
4. Verify:
    - Success notification
    - Invoice status changes to Partial or Paid
    - Paid amount increases
    - Balance decreases
    - Invoice table updates
    - Summary cards refresh

### Test Scenario 5: Filter Invoices

1. Use search box to find by:
    - Invoice number (e.g., RCPT-2024-0001)
    - Tenant name
    - Property name
2. Filter by property
3. Filter by billing month
4. Filter by date range
5. Verify results update correctly

### Test Scenario 6: Tab Navigation

1. Click different tabs:
    - All Invoices
    - Unpaid
    - Overdue
    - Paid
    - Drafts
    - Recurring Rent
2. Verify:
    - Table updates with correct invoices
    - Tab count badges show correct numbers
    - Pagination resets to page 1

### Test Scenario 7: Prevent Duplicate Invoices

1. Create invoice for tenant, property, unit, and month
2. Try to create another invoice for same combination
3. Verify:
    - System shows error: "Invoice already exists..."
    - Invoice not created
    - User must cancel or update existing invoice

### Test Scenario 8: Pagination

1. Create multiple invoices (more than 10)
2. Verify:
    - Table shows 10 rows per page
    - Pagination controls appear
    - Previous/Next buttons work
    - Page indicator shows current page
    - Row count matches pagination info

### Test Scenario 9: Error Handling

1. Try to create invoice without required fields
   - Verify form validation shows errors
2. Try to record payment > balance
   - Verify error message appears
3. Try to generate monthly invoices without date
   - Verify required field error
4. Lose network connection during save
   - Verify error notification

### Test Scenario 10: Data Safety

1. Verify all amounts display without decimals
2. Verify N/A shown for missing data (not undefined/null)
3. Verify currency formatted correctly (UGX)
4. Verify dates formatted consistently (en-UG locale)
5. Verify loading states show skeletons
6. Verify empty states show helpful message

---

## API Endpoints Reference

### Create Single Invoice
```
POST /self-owner/invoices
Body: {
  tenantId: string (ObjectId),
  dueDate: string (ISO date),
  rentAmount: number,
  previousBalance: number (optional),
  penalties: number (optional),
  discount: number (optional),
  billingMonth: string (YYYY-MM),
  notes: string (optional),
  amount: number (total)
}
Response: { invoice: Payment }
```

### Generate Monthly Invoices
```
POST /self-owner/invoices/monthly
Body: {
  billingMonth: string (YYYY-MM),
  dueDate: string (ISO date),
  propertyFilter: string (ObjectId, optional),
  includePreviousBalance: boolean,
  addLateFee: boolean,
  lateFeeAmount: number (if addLateFee=true),
  notes: string (optional)
}
Response: { invoices: [], summary: {} }
```

### Record Payment on Invoice
```
POST /self-owner/payments/:id/record-payment
Body: { amount: number }
Response: { invoice: Payment }
```

### Get Invoice Summary
```
GET /self-owner/payments/summary
Response: { summary: { totalInvoiced, paidInvoices, unpaidInvoices, ... } }
```

### Get Invoices (Paginated)
```
GET /self-owner/payments
Query: {
  page: number,
  limit: number,
  search: string,
  property: string (ObjectId),
  status: string,
  startDate: ISO date,
  endDate: ISO date
}
Response: { payments: [], pagination: {} }
```

### Get Single Invoice
```
GET /self-owner/payments/:id
Response: { payment: Payment }
```

---

## Troubleshooting

### Issue: "Tenant not found" error
- Verify tenant exists and belongs to current owner
- Check tenant is marked as active

### Issue: Duplicate invoice not detected
- Verify billing month is in correct format (YYYY-MM)
- Check invoice status is not 'cancelled'
- Ensure same tenant, property, and unit

### Issue: Invoice total incorrect
- Verify all calculations in form
- Check late fee is being added correctly
- Verify discount is being subtracted

### Issue: Payment not recording
- Verify payment amount ≤ invoice balance
- Check invoice status allows payment
- Verify tenant exists

### Issue: Summary cards not updating
- Refresh page after creating invoice
- Check network tab for API errors
- Verify backend endpoints are running

---

## Security Considerations

1. **Owner Isolation**: All operations scoped to `req.user._id`
2. **Duplicate Prevention**: Database validation before creation
3. **Balance Validation**: Overpayment prevention
4. **Soft Deletes**: Cancelled invoices preserved for audit
5. **Receipt Numbers**: Unique per owner per year
6. **Tenant Association**: Must own tenant to create invoice

---

## Future Enhancements

1. **Email Integration**: Send invoices via email
2. **SMS Reminders**: Remind tenants before due date
3. **PDF Generation**: Server-side PDF creation
4. **Late Fee Automation**: Auto-apply fees after due date
5. **Payment Plans**: Allow split payments
6. **Recurring Invoices**: Auto-generate monthly
7. **Invoice Templates**: Custom branding
8. **Multi-tenant**: Support for property managers
9. **Reporting**: Advanced revenue reports
10. **Mobile App**: Native mobile experience

---

## Performance Notes

- Invoices paginated (default 10 per page)
- Summary calculated efficiently with aggregation
- Duplicate check indexes on (owner, tenant, unit, property, createdAt)
- Receipt number generation with retry logic for uniqueness
- Soft deletes reduce database churn

---

## Support & Questions

For issues or questions about this implementation, refer to:
- Backend logs at `server.js`
- Frontend console for client-side errors
- API response errors in network tab
- Database audit logs for data integrity

