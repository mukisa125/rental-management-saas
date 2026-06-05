const express = require('express');
const { getMaintenanceRequests, getMaintenanceById, createMaintenance, updateMaintenance, deleteMaintenance } = require('../controllers/maintenanceController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').get(protect, getMaintenanceRequests).post(protect, createMaintenance);
router.route('/:id').get(protect, getMaintenanceById).put(protect, updateMaintenance).delete(protect, deleteMaintenance);

module.exports = router;
