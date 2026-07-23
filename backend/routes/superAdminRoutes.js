const express = require('express');
const { protect, authorize } = require('../middleware/rbacMiddleware');
const superAdminController = require('../controllers/superAdminController');

const router = express.Router();

// All routes require authentication and super_admin role
router.use(protect);
router.use(authorize('super_admin'));

// Dashboard
router.get('/dashboard', superAdminController.getDashboard);
router.get('/landlords', superAdminController.getLandlords);
router.get('/tenants', superAdminController.getTenantsList);
router.get('/property-seekers', superAdminController.getPropertySeekers);
router.get('/property_seekers', superAdminController.getPropertySeekers);
router.get('/vacant-listings', superAdminController.getVacantListings);
router.get('/vacant-units', superAdminController.getVacantListings);
router.get('/vacant_units', superAdminController.getVacantListings);
router.get('/views-visits', superAdminController.getViewsVisits);
router.get('/views-and-visits', superAdminController.getViewsVisits);
router.get('/billing', superAdminController.getBilling);
router.get('/billings', superAdminController.getBilling);
router.get('/billing/summary', superAdminController.getBillingSummary);
router.get('/billing-summary', superAdminController.getBillingSummary);
router.get('/billings/summary', superAdminController.getBillingSummary);
router.get('/billing/transactions', superAdminController.getBillingTransactions);
router.get('/billing-transactions', superAdminController.getBillingTransactions);
router.get('/billing_transactions', superAdminController.getBillingTransactions);
router.put('/billing/transactions/:transactionId/status', superAdminController.updateBillingTransactionStatus);
router.put('/billing-transactions/:transactionId/status', superAdminController.updateBillingTransactionStatus);
router.put('/billing_transactions/:transactionId/status', superAdminController.updateBillingTransactionStatus);
router.get('/reports', superAdminController.getReports);
router.get('/support-tickets', superAdminController.getSupportTickets);
router.get('/announcements', superAdminController.getAnnouncements);
router.post('/announcements', superAdminController.createAnnouncement);

// Customer Management
router.get('/customers', superAdminController.getCustomers);
router.get('/customers/:companyId', superAdminController.getCustomerDetails);
router.post('/customers/:companyId/suspend', superAdminController.suspendCustomer);
router.post('/customers/:companyId/activate', superAdminController.activateCustomer);
router.post('/customers/:companyId/change-plan', superAdminController.changeCustomerPlan);

// System Monitoring
router.get('/system-monitor', superAdminController.getSystemMonitor);

// Activity Logs
router.get('/activity-logs', superAdminController.getActivityLogs);

// Analytics
router.get('/subscriptions-analytics', superAdminController.getSubscriptionAnalytics);
router.get('/revenue-analytics', superAdminController.getRevenueAnalytics);

// Subscription Plans management
router.get('/plans', superAdminController.getPlans);
router.post('/plans', superAdminController.createPlan);
router.put('/plans/:planId', superAdminController.updatePlan);
router.delete('/plans/:planId', superAdminController.deletePlan);
router.get('/plan-assignments', superAdminController.getPlanAssignments);
router.get('/plan_assignments', superAdminController.getPlanAssignments);
router.post('/plan-assignments', superAdminController.createPlanAssignment);
router.post('/plan_assignments', superAdminController.createPlanAssignment);
router.put('/plan-assignments/:assignmentId', superAdminController.updatePlanAssignment);
router.put('/plan_assignments/:assignmentId', superAdminController.updatePlanAssignment);
router.delete('/plan-assignments/:assignmentId', superAdminController.deletePlanAssignment);
router.delete('/plan_assignments/:assignmentId', superAdminController.deletePlanAssignment);

// Settings
router.get('/settings', superAdminController.getSettings);
router.put('/settings/:key', superAdminController.updateSetting);

// User Management
router.get('/pending-users', superAdminController.getPendingUsers);
router.get('/expiring-subscriptions', superAdminController.getExpiringSubscriptions);
router.get('/users', superAdminController.getUsers);
router.put('/users/:userId', superAdminController.updateUser);
router.delete('/users/:userId', superAdminController.deleteUser);
router.post('/users/:userId/approve', superAdminController.approveUser);
router.post('/users/:userId/reject', superAdminController.rejectUser);
router.post('/users/:userId/reset-password', superAdminController.resetUserPassword);

module.exports = router;
