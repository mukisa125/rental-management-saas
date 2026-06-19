const express = require('express');
const { protect, authorize } = require('../middleware/rbacMiddleware');
const {
  getTenantRentalInfo,
  getTenantPaymentHistory,
  getTenantMaintenanceRequests,
  createMaintenanceRequest,
  getTenantDocuments,
  getTenantDashboardSummary,
  addMaintenanceComment,
  getMaintenanceRequestDetail
} = require('../controllers/tenantPortalController');

const router = express.Router();

// All tenant routes require authentication and tenant role
router.use(protect);
router.use(authorize('manager', 'tenant'));

// Dashboard
router.get('/dashboard', getTenantDashboardSummary);

// Rental information
router.get('/rental-info', getTenantRentalInfo);

// Payments
router.get('/payments', getTenantPaymentHistory);

// Maintenance requests
router.get('/maintenance', getTenantMaintenanceRequests);
router.post('/maintenance', createMaintenanceRequest);
router.get('/maintenance/:maintenanceId', getMaintenanceRequestDetail);
router.post('/maintenance/:maintenanceId/comments', addMaintenanceComment);

// Documents
router.get('/documents', getTenantDocuments);

module.exports = router;
