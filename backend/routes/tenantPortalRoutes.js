const express = require('express');
const { protect, authorize } = require('../middleware/rbacMiddleware');
const {
  getTenantRentalInfo,
  getTenantPaymentHistory,
  getTenantPaymentDetail,
  getTenantMaintenanceRequests,
  createMaintenanceRequest,
  getTenantDocuments,
  getTenantDocumentDetail,
  downloadTenantDocument,
  getTenantDashboardSummary,
  addMaintenanceComment,
  getMaintenanceRequestDetail,
  cancelMaintenanceRequest,
  getTenantNotices,
  markTenantNoticeRead,
  deleteTenantNotice,
  getTenantProfileDetails,
  updateTenantProfileDetails,
  getTenantSettings,
  updateTenantSettings
} = require('../controllers/tenantPortalController');

const router = express.Router();

// All tenant routes require authentication and tenant role
router.use(protect);
router.use(authorize('tenant'));

// Dashboard
router.get('/dashboard', getTenantDashboardSummary);

// Rental information
router.get('/rental-info', getTenantRentalInfo);

// Payments
router.get('/payments', getTenantPaymentHistory);
router.get('/payments/:id', getTenantPaymentDetail);

// Maintenance requests
router.get('/maintenance', getTenantMaintenanceRequests);
router.post('/maintenance', createMaintenanceRequest);
router.get('/maintenance/:maintenanceId', getMaintenanceRequestDetail);
router.post('/maintenance/:maintenanceId/comments', addMaintenanceComment);
router.patch('/maintenance/:maintenanceId/cancel', cancelMaintenanceRequest);

// Documents
router.get('/documents', getTenantDocuments);
router.get('/documents/:id', getTenantDocumentDetail);
router.get('/documents/:id/download', downloadTenantDocument);

// Notices
router.get('/notices', getTenantNotices);
router.patch('/notices/:id/read', markTenantNoticeRead);
router.delete('/notices/:id', deleteTenantNotice);

// Profile and settings
router.get('/profile', getTenantProfileDetails);
router.put('/profile', updateTenantProfileDetails);
router.get('/settings', getTenantSettings);
router.put('/settings', updateTenantSettings);

module.exports = router;
