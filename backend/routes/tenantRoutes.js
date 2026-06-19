const express = require('express');
const { getTenants, getTenantById, createTenant, updateTenant, deleteTenant, allocateTenant } = require('../controllers/tenantController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Allocate tenant with full setup (create account + payments)
router.post('/allocate/full', protect, allocateTenant);

router.route('/').get(protect, getTenants).post(protect, createTenant);
router.route('/:id').get(protect, getTenantById).put(protect, updateTenant).delete(protect, deleteTenant);

module.exports = router;
