const express = require('express');
const { protect, authorize } = require('../middleware/rbacMiddleware');
const {
  getOwnerProperties,
  getOwnerPropertyById,
  getOwnerFinancialSummary,
  getOwnerMaintenanceRequests,
  getOwnerRevenueTrend,
  getOwnerOccupancyMetrics,
  getAllOwners,
  createOwner
} = require('../controllers/ownerController');

const router = express.Router();

// Manager-only routes - must come first
router.post('/create', protect, authorize('manager'), createOwner);
router.get('/all', protect, authorize('manager'), getAllOwners);

// All owner routes require authentication and owner role
router.use(protect);
router.use(authorize('manager', 'owner'));

// Properties
router.get('/properties', getOwnerProperties);
router.get('/properties/:id', getOwnerPropertyById);

// Financial data
router.get('/financial-summary', getOwnerFinancialSummary);
router.get('/revenue-trend', getOwnerRevenueTrend);

// Metrics
router.get('/occupancy-metrics', getOwnerOccupancyMetrics);

// Maintenance
router.get('/maintenance', getOwnerMaintenanceRequests);

module.exports = router;
