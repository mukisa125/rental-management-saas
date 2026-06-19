const express = require('express');
const { protect, authorize } = require('../middleware/rbacMiddleware');
const superAdminController = require('../controllers/superAdminController');

const router = express.Router();

// All routes require authentication and super_admin role
router.use(protect);
router.use(authorize('super_admin'));

// Dashboard
router.get('/dashboard', superAdminController.getDashboard);

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
