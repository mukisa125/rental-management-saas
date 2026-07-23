# Project File Walkthrough

This walkthrough covers the project-owned files in the rental management SaaS. It intentionally excludes `node_modules`, package lock files, log files, binary assets, and local/generated cache files.

## Big Picture

The project is split into two applications:

- `backend/`: Node.js, Express, MongoDB, Mongoose, JWT authentication.
- `frontend/`: Vite, React, React Router, Axios, Tailwind-style utility classes.

The backend exposes REST APIs under `/api/...`. The frontend calls those APIs through `frontend/src/services/api.js` and renders separate experiences for super admins, self owners/managers, tenants, and property seekers.

## Root And Support Folders

- `backend/`: Server-side application.
- `frontend/`: Browser application.
- `docs/`: Project notes, setup guides, feature summaries, and implementation guides.
- `database/API_DOCUMENTATION.md`: API reference for core endpoints and payload examples.
- `Microsoft/Windows/PowerShell/ModuleAnalysisCache`: Local PowerShell cache artifact, not application logic.

## Backend Entry And Configuration

- `backend/server.js`: Express entry point. Loads `.env` and `.env.local`, connects to MongoDB, configures CORS/body parsing, logs requests, mounts all API route modules, exposes `/api/health`, then handles 404 and errors.
- `backend/config/db.js`: Connects Mongoose to `MONGODB_URI` or local `mongodb://localhost:27017/rental-management`; exits the process if connection fails.
- `backend/seed.js`: Seeds initial/sample data for local development.
- `backend/package.json`: Backend scripts and dependencies, including Express, Mongoose, JWT, bcrypt, multer, and PDFKit.

## Backend Middleware

- `backend/middleware/authMiddleware.js`: Compatibility wrapper that re-exports `protect` from the RBAC middleware.
- `backend/middleware/rbacMiddleware.js`: JWT authentication, role authorization, company isolation, ownership/manager checks, permission checks, and subscription limit context.

## Backend Models

- `backend/models/User.js`: User accounts for super admins, managers, owners, self owners, tenants, and property seekers. Hashes passwords before save and exposes password comparison.
- `backend/models/Company.js`: Tenant company/account record with subscription state, usage counters, billing settings, and soft delete support.
- `backend/models/SubscriptionPlan.js`: Platform and property-seeker plans, prices, limits, included views/visits, features, status, and soft delete support.
- `backend/models/PlanAssignment.js`: Manual or automatic assignment of a plan to a landlord or property seeker.
- `backend/models/SubscriptionTransaction.js`: Subscription billing transaction history for companies.
- `backend/models/BillingTransaction.js`: Broader billing record for landlord subscriptions, listing unlocks, credit bundles, property seeker payments, and gateway/manual payment metadata.
- `backend/models/Property.js`: Rental property data, address/location controls, marketplace visibility, images, amenities, owner/manager refs, income, occupancy, and soft delete support.
- `backend/models/Unit.js`: Individual rentable unit inside a property, with rent, deposit, status, current tenant, images, amenities, documents, and maintenance history.
- `backend/models/Tenant.js`: Tenant profile, linked user account, lease dates, rent, deposit, identity attachments, balances, emergency/reference details, and soft delete support.
- `backend/models/TenantApplication.js`: Token-based public tenant application form tied to a property/unit, with submitted tenant details and optional account creation.
- `backend/models/Payment.js`: Rent invoice/payment record, amounts, balances, due/paid dates, proof of payment, receipt number generation, and soft delete support.
- `backend/models/Maintenance.js`: Maintenance requests with tenant/property/unit links, issue type, priority, status flow, images, comments, costs, technician info, and generated request IDs.
- `backend/models/Document.js`: Uploaded or generated documents, file content/base64, category/type/source, relationships to tenants/properties/payments/maintenance, visibility, versions, and soft delete support.
- `backend/models/Notification.js`: In-app notification records with type, priority, read status, related entity, channels, and action links.
- `backend/models/ActivityLog.js`: Audit trail for user and system actions, including old/new values, IP/user agent, status, and metadata.
- `backend/models/ListingUnlock.js`: Tracks temporary property seeker access to locked listing details.
- `backend/models/SelfOwnerSettings.js`: Self-owner profile, business, payment, receipt/invoice, notification, rent/lease, document, security, subscription snapshot, and preference settings.
- `backend/models/SystemSettings.js`: Editable platform-wide settings plus default settings such as platform name, email/SMS/payment config, security, backup, and maintenance mode.
- `backend/models/SystemMonitoring.js`: Stored system health metrics, errors, warnings, backup state, storage values, and a TTL index for old monitoring records.

## Backend Routes

- `backend/routes/authRoutes.js`: `/api/auth` endpoints for register, company registration, login, logout, and profile read/update.
- `backend/routes/propertyRoutes.js`: Generic property CRUD under `/api/properties`.
- `backend/routes/unitRoutes.js`: Generic unit CRUD under `/api/units`.
- `backend/routes/tenantRoutes.js`: Generic tenant CRUD plus full tenant allocation with account/payment setup.
- `backend/routes/paymentRoutes.js`: Generic payment CRUD plus payment stats.
- `backend/routes/maintenanceRoutes.js`: Generic maintenance CRUD.
- `backend/routes/documentRoutes.js`: Protected document listing/upload/delete by tenant or property.
- `backend/routes/notificationRoutes.js`: Protected notification listing, unread count, mark read, mark all read, and delete.
- `backend/routes/ownerRoutes.js`: Manager/owner views for owned properties, financial summaries, maintenance, revenue trends, occupancy, and manager-created owners.
- `backend/routes/selfOwnerRoutes.js`: Main self-owner/manager API for dashboard, settings, properties, units, tenants, applications, payments, invoices, maintenance, documents, notices, reports, and public receipt verification.
- `backend/routes/tenantPortalRoutes.js`: Tenant-only dashboard, rental info, payments, maintenance, documents, notices, profile, and settings.
- `backend/routes/tenantApplicationRoutes.js`: Public token-based tenant application fetch and submission.
- `backend/routes/propertySeekerRoutes.js`: Property seeker Google auth/config, profile, payments, listing unlocks, and dashboard.
- `backend/routes/publicRoutes.js`: Public property seeker pricing and vacant listing endpoints.
- `backend/routes/superAdminRoutes.js`: Super admin dashboards, customers, users, billing, analytics, plans, assignments, settings, activity logs, support tickets, and announcements.

## Backend Controllers

- `backend/controllers/authController.js`: Registration/login/profile logic, JWT generation, company creation for self owners, subscription setup, approval status, logout activity.
- `backend/controllers/propertyController.js`: Basic authenticated property CRUD and property/unit cleanup.
- `backend/controllers/unitController.js`: Basic authenticated unit CRUD with property population and status handling.
- `backend/controllers/tenantController.js`: Basic tenant CRUD plus full tenant allocation that can create a tenant user account and related payment records.
- `backend/controllers/paymentController.js`: Basic payment CRUD, tenant/property population, and payment summary stats.
- `backend/controllers/maintenanceController.js`: Basic maintenance CRUD scoped to the authenticated user.
- `backend/controllers/documentController.js`: Document retrieval by tenant/property, upload, and delete.
- `backend/controllers/notificationController.js`: User-scoped notifications, unread counts, read state updates, deletion, and notification creation helper.
- `backend/controllers/ownerController.js`: Owner-facing property lists, property details, revenue/occupancy metrics, maintenance list, and manager owner creation.
- `backend/controllers/selfOwnerController.js`: Largest owner/manager business controller. Handles owner-scoped dashboard, properties, units, tenants, invoices, payments, receipt verification, maintenance workflow, documents, notices, reports, notifications, image normalization, pagination, and auto-generated document tasks.
- `backend/controllers/selfOwnerSettingsController.js`: Reads and updates self-owner settings tabs, sanitizes profile/business images, saves payment/receipt/notification/rent/document/security/preferences settings, updates password, and deletes account data.
- `backend/controllers/tenantPortalController.js`: Tenant dashboard, rental profile, payment history/details, maintenance creation/comments/cancel, documents/downloads, notices, profile update, settings update, and tenant-safe scoping.
- `backend/controllers/tenantApplicationController.js`: Generates tenant application links, serves public forms, validates submissions, notifies owners, approves applications into tenant records, optionally creates tenant users, and rejects applications.
- `backend/controllers/propertySeekerController.js`: Public listing/pricing payloads, Google auth support, seeker profile/dashboard, payment requests, listing unlocks, view credit accounting, and approximate vs exact listing location logic.
- `backend/controllers/superAdminController.js`: Platform-wide dashboards, customers, landlord/tenant/property-seeker listings, billing summaries, billing transaction status updates, plans, plan assignments, analytics, settings, user approvals/rejections, password reset, announcements, and reports.

## Backend Services

- `backend/services/activityLogService.js`: Creates activity records, fetches company/user activity, summarizes activity, tracks login/logout/registration, exports CSV, and cleans old logs.
- `backend/services/documentService.js`: Creates document records, generates PDF receipts/assessments/maintenance/property/unit/tenant/report documents, registers uploaded attachments/images, lists owner documents, and soft deletes documents.
- `backend/services/paymentProviderService.js`: Abstract payment provider interface plus stub-style Stripe, PayPal, Flutterwave, and mobile money provider classes.
- `backend/services/propertySeekerBillingService.js`: Applies purchased property view credits to a property seeker after a qualifying billing transaction.
- `backend/services/reportingService.js`: Generates revenue, subscription, customer, property, occupancy, maintenance, growth, and executive summary reports.
- `backend/services/subscriptionService.js`: Plan lookup, subscription creation/upgrades/downgrades/cancellation/suspension/reactivation, subscription payment processing, usage/limit checks, and invoice generation.
- `backend/services/systemMonitoringService.js`: Records host/API/database health metrics, builds monitoring dashboards, logs errors/warnings, updates health states, and cleans old monitoring data.

## Frontend Entry And Configuration

- `frontend/package.json`: Frontend scripts and dependencies, including React, React Router, Axios, Lucide icons, Recharts, jsPDF, XLSX, Tailwind/PostCSS, and Vite.
- `frontend/index.html`: HTML shell with the `root` element and browser title `RentProLink`.
- `frontend/vite.config.js`: Vite config enabling the React plugin.
- `frontend/tailwind.config.js`: Tailwind content paths and primary emerald color scale.
- `frontend/postcss.config.js`: PostCSS pipeline using Tailwind and Autoprefixer.
- `frontend/eslint.config.js`: ESLint flat config for JS/JSX, React Hooks, and Vite refresh rules.
- `frontend/src/main.jsx`: React entry point. Wraps the app in `ThemeProvider`, overrides browser `alert` with the app toast system, and renders into `#root`.
- `frontend/src/App.jsx`: Main route table. Wraps routes in auth context, maps each role to layouts/pages, protects pages with `ProtectedRoute`/`RoleProtectedRoute`, and mounts global toast host.
- `frontend/src/App.css`: Legacy/default app styling placeholder.
- `frontend/src/index.css`: Global CSS and utility styling for the app.
- `frontend/public/favicon.svg`: Browser favicon.
- `frontend/public/icons.svg`: Public icon sprite/static icon asset.
- `frontend/src/assets/*`: Static images/SVGs used by the frontend.

## Frontend Services, Context, And Utilities

- `frontend/src/services/api.js`: Central Axios client. Resolves API base URL, attaches bearer token, clears auth on 401, and exports grouped API helpers for auth, property seekers, properties, units, tenants, payments, maintenance, tenant portal, self owner, notifications, and documents.
- `frontend/src/context/AuthContext.jsx`: Stores current user/token/loading state, restores saved sessions, exposes login/register/logout/update profile helpers, and normalizes API user payloads.
- `frontend/src/context/ThemeContext.jsx`: Stores light/dark/system theme preference, applies the document theme class, and exposes `useTheme`.
- `frontend/src/constants/brand.js`: Defines the product name `RentProLink`.
- `frontend/src/utils/authRoutes.js`: Maps user roles to default dashboard paths.
- `frontend/src/utils/currency.js`: Formats values as UGX.
- `frontend/src/utils/imageCompression.js`: Validates image type/size/count, compresses images client-side with canvas, extracts base64, and reports image config limits.
- `frontend/src/utils/toast.js`: Dispatches global toast events consumed by `SystemToastHost`.

## Frontend Layouts

- `frontend/src/layouts/SuperAdminLayout.jsx`: Super-admin navigation shell and page metadata.
- `frontend/src/layouts/SelfOwnerLayout.jsx`: Self-owner navigation shell.
- `frontend/src/layouts/ManagerLayout.jsx`: Manager navigation shell, reusing owner-style sections.
- `frontend/src/layouts/TenantLayout.jsx`: Tenant portal navigation shell.

## Frontend Shared Components

- `frontend/src/components/ResponsiveShell.jsx`: Main app frame with sidebar/topbar behavior, notifications, profile menu, and responsive layout.
- `frontend/src/components/ProtectedRoute.jsx`: Redirects unauthenticated users away from protected routes.
- `frontend/src/components/RoleProtectedRoute.jsx`: Enforces required/allowed roles before rendering a page.
- `frontend/src/components/Sidebar.jsx`: Generic sidebar UI.
- `frontend/src/components/sidebars/TenantSidebar.jsx`: Tenant-specific sidebar navigation.
- `frontend/src/components/Header.jsx`: Header with path-based titles, search, notification, and user affordances.
- `frontend/src/components/Topbar.jsx`: Super-admin topbar with pending user and expiring subscription notification dropdowns.
- `frontend/src/components/SystemToastHost.jsx`: Global toast listener/render target.
- `frontend/src/components/BrandLogo.jsx`: Reusable logo mark and name.
- `frontend/src/components/StatusBadge.jsx`: Generic status badge.
- `frontend/src/components/PlanBadge.jsx`: Plan label badge.
- `frontend/src/components/StatCard.jsx`: KPI card with icon, value, and trend.
- `frontend/src/components/SystemHealthCard.jsx`: System health status card.
- `frontend/src/components/ActivityCard.jsx`: Recent activity list card.
- `frontend/src/components/ChartCard.jsx`: Chart wrapper plus simple sparkline helper.
- `frontend/src/components/ChartPlaceholder.jsx`: Placeholder for chart areas.
- `frontend/src/components/DataTable.jsx`: Generic table with view/edit/delete actions.
- `frontend/src/components/CustomersTable.jsx`: Super-admin customer/user table.
- `frontend/src/components/FiltersBar.jsx`: Generic filtering/export/add toolbar.
- `frontend/src/components/Pagination.jsx`: Generic pagination controls.
- `frontend/src/components/EmptyState.jsx`: Generic empty state.
- `frontend/src/components/ErrorState.jsx`: Generic error state.
- `frontend/src/components/LoadingState.jsx`: Generic loading state.
- `frontend/src/components/TransactionTable.jsx`: Billing transaction table.
- `frontend/src/components/SubscriptionSummaryCard.jsx`: Summary card for subscription plan totals.

## Frontend Subscription Components

- `frontend/src/components/subscriptions/SubscriptionTabs.jsx`: Tab selector for subscription views.
- `frontend/src/components/subscriptions/SubscriptionTable.jsx`: Subscription/customer table with suspend/activate callbacks.
- `frontend/src/components/subscriptions/SubscriptionSummaryCard.jsx`: Compact summary KPI card.
- `frontend/src/components/subscriptions/SubscriptionPlanTable.jsx`: Table for plan management, including delete/edit actions.
- `frontend/src/components/subscriptions/CreatePlanModal.jsx`: Modal for creating/editing subscription plans.

## Frontend Super Admin Components And Pages

- `frontend/src/components/super-admin/SuperAdminTablePage.jsx`: Reusable server-backed table page with search, filters, pagination, detail drawer, user activate/deactivate/delete actions, and fallback endpoint support.
- `frontend/src/pages/super-admin/SuperAdminDashboard.jsx`: Platform dashboard cards, charts/metrics, and system-wide summaries.
- `frontend/src/pages/super-admin/SuperAdminLandlords.jsx`: Landlord management, including creating landlord companies/accounts.
- `frontend/src/pages/super-admin/SuperAdminCustomers.jsx`: Customer/user management with filters, add forms, approval/rejection, edit/delete, suspend/activate.
- `frontend/src/pages/super-admin/SuperAdminTenants.jsx`: Tenant listing page using `SuperAdminTablePage`.
- `frontend/src/pages/super-admin/SuperAdminPropertySeekers.jsx`: Property seeker listing page using `SuperAdminTablePage`.
- `frontend/src/pages/super-admin/SuperAdminVacantListings.jsx`: Vacant listing table using `SuperAdminTablePage`.
- `frontend/src/pages/super-admin/SuperAdminViewsVisits.jsx`: Views/visits analytics table using `SuperAdminTablePage`.
- `frontend/src/pages/super-admin/SuperAdminBilling.jsx`: Billing and plan assignment management, payment status updates, and assignment edits.
- `frontend/src/pages/super-admin/SuperAdminSubscriptions.jsx`: Full subscription plan and assignment workspace.
- `frontend/src/pages/super-admin/SuperAdminSubscriptionAnalytics.jsx`: Subscription analytics KPI view.
- `frontend/src/pages/super-admin/SuperAdminRevenueAnalytics.jsx`: Revenue/reporting analytics view.
- `frontend/src/pages/super-admin/SuperAdminSystemMonitor.jsx`: System health dashboard.
- `frontend/src/pages/super-admin/SuperAdminActivityLogs.jsx`: Activity/audit log listing.
- `frontend/src/pages/super-admin/SuperAdminSettings.jsx`: Platform settings editor.
- `frontend/src/pages/super-admin/SuperAdminSupportTickets.jsx`: Support ticket listing.
- `frontend/src/pages/super-admin/SuperAdminAnnouncements.jsx`: Announcement listing and creation UI.

## Frontend Self Owner Pages

- `frontend/src/pages/self-owner/SelfOwnerDashboard.jsx`: Owner dashboard with summary cards and activity/financial panels.
- `frontend/src/pages/self-owner/SelfOwnerPropertiesEnhanced.jsx`: Main property/unit management experience with image handling, units, dialogs, and CRUD.
- `frontend/src/pages/self-owner/SelfOwnerProperties.jsx`: Earlier/simpler property management page.
- `frontend/src/pages/self-owner/PropertyWizard.jsx`: Step-style property creation helper with unit/image/address handling.
- `frontend/src/pages/self-owner/SelfOwnerUnits.jsx`: Unit management, export, tenant application link generation, and application approval/rejection.
- `frontend/src/pages/self-owner/SelfOwnerTenants.jsx`: Tenant table and tenant profile editing.
- `frontend/src/pages/self-owner/TenantWizard.jsx`: Tenant creation/application form wizard with file attachment conversion and validation.
- `frontend/src/pages/self-owner/SelfOwnerPayments.jsx`: Payment/invoice list, filters, record payment modal, receipt modal, and CRUD calls.
- `frontend/src/pages/self-owner/SelfOwnerInvoices.jsx`: Invoice list, invoice generation, monthly invoice generation, payment recording, preview/print workflows.
- `frontend/src/pages/self-owner/SelfOwnerMaintenance.jsx`: Maintenance dashboard with filters, modals, status updates, comments, and service provider helper.
- `frontend/src/pages/self-owner/SelfOwnerDocuments.jsx`: Thin page wrapper around `SelfOwnerDocumentsPage`.
- `frontend/src/pages/self-owner/SelfOwnerReports.jsx`: Thin page wrapper around `SelfOwnerReportsPage`.
- `frontend/src/pages/self-owner/SelfOwnerSettings.jsx`: Thin page wrapper around `SelfOwnerSettingsPage`.
- `frontend/src/pages/self-owner/SelfOwnerProfile.jsx`: Local profile-editing UI with avatar handling.
- `frontend/src/pages/self-owner/SelfOwnerNotices.jsx`: Owner notices page.

## Frontend Payment Components

- `frontend/src/components/payments/PaymentFilters.jsx`: Payment filter toolbar.
- `frontend/src/components/payments/PaymentStatusBadge.jsx`: Payment-specific status badge.
- `frontend/src/components/payments/PaymentSummaryCards.jsx`: Payment KPI summary cards.
- `frontend/src/components/payments/PaymentsTable.jsx`: Payments table with row actions.
- `frontend/src/components/payments/ProofOfPaymentUploader.jsx`: Reads proof-of-payment files into data URLs.
- `frontend/src/components/payments/ReceiptModal.jsx`: Receipt preview, print, WhatsApp share, and email share UI.
- `frontend/src/components/payments/RecordPaymentModal.jsx`: Form for recording rent payments.
- `frontend/src/components/payments/paymentUtils.js`: Payment labels, dates, status labels, and safe number helpers.

## Frontend Invoice Components

- `frontend/src/components/invoices/InvoiceTable.jsx`: Invoice table with status labels and actions.
- `frontend/src/components/invoices/InvoiceSummaryCards.jsx`: Invoice KPI summary cards.
- `frontend/src/components/invoices/InvoicePreview.jsx`: Invoice preview modal, payment recording mode, and PDF/download actions.
- `frontend/src/components/invoices/InvoiceFilters.jsx`: Invoice filter toolbar.
- `frontend/src/components/invoices/GenerateInvoiceModal.jsx`: Single invoice creation modal with validation.
- `frontend/src/components/invoices/GenerateMonthlyInvoicesModal.jsx`: Monthly invoice batch modal with preview/validation.

## Frontend Maintenance Components

- `frontend/src/components/maintenance/AddMaintenanceModal.jsx`: Maintenance creation/edit form with validation and image handling.
- `frontend/src/components/maintenance/ViewMaintenanceModal.jsx`: Maintenance detail modal and provider assignment payload handling.
- `frontend/src/components/maintenance/MaintenanceTable.jsx`: Maintenance table.
- `frontend/src/components/maintenance/MaintenanceSummaryCards.jsx`: Maintenance KPI cards.
- `frontend/src/components/maintenance/MaintenanceFilters.jsx`: Maintenance search/filter toolbar.
- `frontend/src/components/maintenance/MaintenanceImageGallery.jsx`: Image gallery carousel for maintenance evidence.
- `frontend/src/components/maintenance/ServiceProvidersModal.jsx`: Local service provider add/edit/delete helper.
- `frontend/src/components/maintenance/BadgeHelpers.jsx`: Maintenance status, priority, and source badges.

## Frontend Document Components

- `frontend/src/components/documents/SelfOwnerDocumentsPage.jsx`: Complete document management page with data loading, filters, summary cards, table, preview panel, uploads, replacement, delete, export to PDF/XLSX, print, and blob preview URLs.
- `frontend/src/components/documents/UploadDocumentModal.jsx`: Document upload/replace modal with accepted file types and image compression.
- `frontend/src/components/documents/DocumentSummaryCards.jsx`: Document category summary cards.
- `frontend/src/components/documents/DocumentTabs.jsx`: Document category tabs.
- `frontend/src/components/documents/DocumentFilterBar.jsx`: Search/filter/export/upload toolbar.
- `frontend/src/components/documents/DocumentTable.jsx`: Document table with preview/download/print/replace/delete actions.
- `frontend/src/components/documents/DocumentPreviewPanel.jsx`: Detail/preview side panel for a selected document.
- `frontend/src/components/documents/DocumentFilePreview.jsx`: Inline preview handling for image/PDF/other file types.
- `frontend/src/components/documents/DocumentStatusBadge.jsx`: Document status badge.
- `frontend/src/components/documents/DocumentCategoryBadge.jsx`: Document category badge.
- `frontend/src/components/documents/documentUtils.js`: Safe text/date/number helpers, file type inference, labels, tabs, options, and default pagination/summary values.
- `frontend/src/components/documents/Pagination.jsx`: Document-specific pagination with page size selection.
- `frontend/src/components/documents/LoadingState.jsx`: Document loading state.
- `frontend/src/components/documents/ErrorState.jsx`: Document error state with retry.
- `frontend/src/components/documents/EmptyState.jsx`: Document empty state with upload action.

## Frontend Reports Components

- `frontend/src/components/reports/SelfOwnerReportsPage.jsx`: Owner reports page with report type tabs, filters, API loading, export actions, summary panels, charts, and tables.
- `frontend/src/components/reports/ReportTabs.jsx`: Report type tab selector.
- `frontend/src/components/reports/ReportsFilterBar.jsx`: Report date/filter toolbar.
- `frontend/src/components/reports/ReportsSummaryCards.jsx`: Report KPI summary cards.
- `frontend/src/components/reports/ReportSummaryPanel.jsx`: Report summary/details panel.
- `frontend/src/components/reports/ReportTable.jsx`: Report data table with pagination-style offset display.
- `frontend/src/components/reports/RentCollectionChart.jsx`: Rent collection visualization using Recharts.
- `frontend/src/components/reports/ExportButtons.jsx`: Report export controls.
- `frontend/src/components/reports/StatusBadge.jsx`: Report-specific status badge.

## Frontend Settings Components

- `frontend/src/components/settings/SelfOwnerSettingsPage.jsx`: Full owner settings page. Loads settings, manages active tab state, saves each section through `selfOwnerAPI`, updates password, shows warnings/usage/history, and routes tab components.
- `frontend/src/components/settings/settingsUtils.js`: Settings tab definitions, default settings state, safe formatters, business/payment options, and file-to-data-url helper.
- `frontend/src/components/settings/SettingsTabs.jsx`: Settings tab selector.
- `frontend/src/components/settings/SaveButton.jsx`: Save button with loading state.
- `frontend/src/components/settings/SuccessToast.jsx`: Settings success message.
- `frontend/src/components/settings/LoadingState.jsx`: Settings loading state.
- `frontend/src/components/settings/ErrorState.jsx`: Settings error state.
- `frontend/src/components/settings/FormField.jsx`: Reusable label/input wrapper.
- `frontend/src/components/settings/ToggleSwitch.jsx`: Reusable toggle switch.
- `frontend/src/components/settings/ProfileSettingsTab.jsx`: Profile fields, profile image upload, and delete account confirmation UI.
- `frontend/src/components/settings/AccountSummaryCard.jsx`: Account summary display.
- `frontend/src/components/settings/BusinessSettingsTab.jsx`: Business branding/contact fields and image upload controls.
- `frontend/src/components/settings/BusinessPreviewCard.jsx`: Business settings live preview.
- `frontend/src/components/settings/PaymentSettingsTab.jsx`: Payment method settings and payment policy controls.
- `frontend/src/components/settings/ReceiptInvoiceSettingsTab.jsx`: Receipt/invoice behavior fields and preview.
- `frontend/src/components/settings/ReceiptPreviewCard.jsx`: Receipt display preview.
- `frontend/src/components/settings/NotificationSettingsTab.jsx`: Notification channel and alert settings.
- `frontend/src/components/settings/RentLeaseSettingsTab.jsx`: Rent due, grace period, late fee, deposit, lease duration, and checklist settings.
- `frontend/src/components/settings/DocumentSettingsTab.jsx`: Auto-generation, tenant access, watermark/download/security, and expiry reminder settings.
- `frontend/src/components/settings/SecuritySettingsTab.jsx`: Two-factor/session/password/activity controls.
- `frontend/src/components/settings/SubscriptionSettingsTab.jsx`: Subscription snapshot, usage limits, and payment history.
- `frontend/src/components/settings/PreferencesSettingsTab.jsx`: Language, theme, date/time, currency, table density, shortcut, and country settings.

## Frontend Tenant Pages

- `frontend/src/pages/tenant/TenantPortalUI.jsx`: Shared tenant UI helpers and shell pieces, including safe formatters, date labels, day countdowns, method labels, headers, panels, loading, and error states.
- `frontend/src/pages/tenant/TenantDashboard.jsx`: Tenant dashboard summary, balances, upcoming payments, recent activity, and maintenance/payment highlights.
- `frontend/src/pages/tenant/TenantMyRental.jsx`: Tenant rental/property/unit/lease details.
- `frontend/src/pages/tenant/TenantPayments.jsx`: Tenant payment history and printable receipt/details view.
- `frontend/src/pages/tenant/TenantMaintenance.jsx`: Tenant maintenance list, create request flow, image uploads, details, comments, and cancellation.
- `frontend/src/pages/tenant/TenantDocuments.jsx`: Tenant-visible documents and downloads.
- `frontend/src/pages/tenant/TenantNotices.jsx`: Tenant notices with mark-read behavior.
- `frontend/src/pages/tenant/TenantProfile.jsx`: Tenant profile editing, emergency contact editing, and avatar upload.
- `frontend/src/pages/tenant/TenantSettings.jsx`: Tenant preference/notification/security settings form.

## Frontend Public/Auth Pages

- `frontend/src/pages/Login.jsx`: Login form, password visibility, auth call, error/loading states, and role-based redirect.
- `frontend/src/pages/Register.jsx`: Registration form for user/company signup.
- `frontend/src/pages/TenantApplication.jsx`: Public tenant application page. Loads token details, renders `TenantWizard`, submits public application, and shows success/error states.
- `frontend/src/pages/ServiceProviderRequestForm.jsx`: Public/service-provider request-style form with local form state and simple chat-like helper logic.
- `frontend/src/pages/property-seeker/PropertySeekerPage.jsx`: Public and signed-in property seeker marketplace. Loads listings/pricing/dashboard, supports Google identity, maps, profile, payments, listing unlocks, and seeker dashboard modes.

## Documentation Files

- `docs/README.md`: General project README with setup, architecture, features, and basic API examples.
- `docs/requirements.md`: Short requirements list for users and core modules.
- `docs/mvp-features.md`: MVP feature planning notes.
- `docs/ROADMAP.md`: Product/development roadmap.
- `docs/QUICK_REFERENCE.md`: Quick command/reference guide.
- `docs/TESTING_GUIDE.md`: Testing instructions.
- `docs/SUPER_ADMIN_SETUP.md`: Super admin setup instructions.
- `docs/INTEGRATION_GUIDE.md`: Integration guidance.
- `docs/ENTERPRISE_README.md`: Enterprise-level project description.
- `docs/database-design.md`: Database/schema design notes.
- `docs/COMPLETION_SUMMARY.md`: Completion summary.
- `docs/MAINTENANCE_PHASE_SUMMARY.md`: Maintenance module summary.
- `docs/RENT_INVOICES_IMPLEMENTATION.md`: Rent invoice implementation detail.
- `docs/RENT_INVOICES_SUMMARY.md`: Rent invoice feature summary.
- `docs/overview`: Overview notes file.
- `docs/github_rep`: GitHub/repository notes file.
- `database/API_DOCUMENTATION.md`: API endpoint documentation and example requests/responses.

## How A Request Flows

1. A user visits a route in `frontend/src/App.jsx`.
2. `ProtectedRoute` or `RoleProtectedRoute` checks auth/role using `AuthContext`.
3. A page or component calls an API helper from `frontend/src/services/api.js`.
4. The backend route in `backend/routes/*` receives the request.
5. `protect`, `authorize`, and sometimes `isolateCompanyData` validate the user.
6. The controller in `backend/controllers/*` performs business logic.
7. The controller reads/writes Mongoose models in `backend/models/*`.
8. Optional service modules generate documents, reports, billing effects, monitoring data, or activity logs.
9. The response returns to the React page, which updates local state and renders tables, cards, modals, or forms.
