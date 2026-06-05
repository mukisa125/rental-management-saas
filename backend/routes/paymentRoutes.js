const express = require('express');
const { getPayments, getPaymentById, createPayment, updatePayment, deletePayment, getPaymentStats } = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').get(protect, getPayments).post(protect, createPayment);
router.route('/stats').get(protect, getPaymentStats);
router.route('/:id').get(protect, getPaymentById).put(protect, updatePayment).delete(protect, deletePayment);

module.exports = router;
