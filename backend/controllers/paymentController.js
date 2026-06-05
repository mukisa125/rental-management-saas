const Payment = require('../models/Payment');
const Tenant = require('../models/Tenant');

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private
const getPayments = async (req, res) => {
  try {
    const { status, tenant, property } = req.query;
    
    let query = {};
    if (status) query.status = status;
    if (tenant) query.tenant = tenant;
    if (property) query.property = property;

    const payments = await Payment.find(query)
      .populate('tenant', 'fullName email phone')
      .populate('property', 'name location')
      .populate('unit', 'unitNumber')
      .sort('-createdAt');
    
    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single payment
// @route   GET /api/payments/:id
// @access  Private
const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('tenant', 'fullName email phone')
      .populate('property', 'name location')
      .populate('unit', 'unitNumber');
    
    if (payment) {
      res.json(payment);
    } else {
      res.status(404).json({ message: 'Payment not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new payment
// @route   POST /api/payments
// @access  Private
const createPayment = async (req, res) => {
  try {
    const payment = await Payment.create({
      ...req.body,
      status: req.body.paidDate ? 'paid' : 'pending',
    });

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update payment
// @route   PUT /api/payments/:id
// @access  Private
const updatePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (payment) {
      payment.amount = req.body.amount || payment.amount;
      payment.dueDate = req.body.dueDate || payment.dueDate;
      payment.paidDate = req.body.paidDate || payment.paidDate;
      payment.status = req.body.status || payment.status;
      payment.paymentMethod = req.body.paymentMethod || payment.paymentMethod;
      payment.notes = req.body.notes || payment.notes;

      const updatedPayment = await payment.save();
      res.json(updatedPayment);
    } else {
      res.status(404).json({ message: 'Payment not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete payment
// @route   DELETE /api/payments/:id
// @access  Private
const deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (payment) {
      await payment.deleteOne();
      res.json({ message: 'Payment removed' });
    } else {
      res.status(404).json({ message: 'Payment not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get dashboard stats
// @route   GET /api/payments/stats
// @access  Private
const getPaymentStats = async (req, res) => {
  try {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const monthlyRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'paid',
          paidDate: { $gte: currentMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]);

    const collected = await Payment.countDocuments({ status: 'paid' });
    const pending = await Payment.countDocuments({ status: 'pending' });
    const overdue = await Payment.countDocuments({ status: 'overdue' });

    res.json({
      monthlyRevenue: monthlyRevenue[0]?.total || 0,
      collected,
      pending,
      overdue
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  getPaymentStats,
};
