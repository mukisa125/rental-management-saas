const express = require('express');
const { getUnits, getUnitById, createUnit, updateUnit, deleteUnit } = require('../controllers/unitController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').get(protect, getUnits).post(protect, createUnit);
router.route('/:id').get(protect, getUnitById).put(protect, updateUnit).delete(protect, deleteUnit);

module.exports = router;
