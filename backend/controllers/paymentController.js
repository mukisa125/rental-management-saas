const Payment = require('../models/Payment');
const Tenant = require('../models/Tenant');
const Property = require('../models/Property');
const mongoose = require('mongoose');
const { refreshOverduePayments, paymentForLabel, checkPaymentDuplicate } = require('../services/paymentTrackingService');

// @desc    Get all payments
// @route   GET /api/payments
// @access  Private
const getPayments = async (req, res) => {
  try {
    const ownerScope = { owner: req.user._id };

    // Refresh overdue status before returning data so the caller sees accurate statuses
    await refreshOverduePayments(ownerScope);

    const { status, tenant, property } = req.query;

    const query = { ...ownerScope };
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
      // Check if user owns this payment
      if (payment.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to access this payment' });
      }
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
    const { property } = req.body;

    // Check if property exists and belongs to user
    const propertyDoc = await Property.findById(property);
    if (!propertyDoc) {
      return res.status(400).json({ message: 'Property not found' });
    }

    if (propertyDoc.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to create payments for this property' });
    }

    const amount = Math.max(0, Number(req.body.amount) || 0);
    const amountPaid = Math.max(0, Number(req.body.amountPaid) || 0);
    const balance = Math.max(0, amount - amountPaid);

    // Auto-generate paymentFor from dueDate / current date when caller omits it
    const refDate = req.body.dueDate ? new Date(req.body.dueDate) : new Date();
    const rawPaymentFor = String(req.body.paymentFor || '').trim();
    const paymentFor = rawPaymentFor.slice(0, 60) ||
      paymentForLabel({ month: refDate.getMonth() + 1, year: refDate.getFullYear() });

    // Duplicate guard — block if a live payment for the same period already exists
    const duplicate = await checkPaymentDuplicate(
      { owner: req.user._id },
      req.body.tenant,
      paymentFor
    );
    if (duplicate) {
      return res.status(409).json({
        message: `A payment for "${paymentFor}" already exists for this tenant.`,
        existingPaymentId: duplicate._id
      });
    }

    let status = 'pending';
    if (req.body.paidDate || amountPaid >= amount) {
      status = 'paid';
    } else if (amountPaid > 0) {
      status = 'partial';
    }

    const payment = await Payment.create({
      ...req.body,
      amount,
      amountPaid,
      balance,
      remainingBalance: balance,
      paymentFor,
      status,
      owner: req.user._id
    });

    res.status(201).json(payment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update payment (records or adjusts a payment)
// @route   PUT /api/payments/:id
// @access  Private
const updatePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Check if user owns this payment
    if (payment.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this payment' });
    }

    // Update simple editable fields
    if (req.body.amount !== undefined) payment.amount = Math.max(0, Number(req.body.amount) || 0);
    if (req.body.dueDate !== undefined) payment.dueDate = req.body.dueDate;
    if (req.body.paymentMethod !== undefined) payment.paymentMethod = req.body.paymentMethod;
    if (req.body.notes !== undefined) payment.notes = req.body.notes;
    if (req.body.paymentFor !== undefined) payment.paymentFor = req.body.paymentFor;
    if (req.body.paymentReference !== undefined) payment.paymentReference = req.body.paymentReference;

    // Smart status + balance logic when amountPaid is being recorded
    if (req.body.amountPaid !== undefined) {
      const amountPaid = Math.max(0, Number(req.body.amountPaid) || 0);
      const amount = payment.amount;

      payment.amountPaid = amountPaid;
      payment.balance = Math.max(0, amount - amountPaid);
      payment.remainingBalance = payment.balance;

      if (amountPaid >= amount) {
        // Fully paid
        payment.status = 'paid';
        payment.paidDate = payment.paidDate || req.body.paidDate || new Date();
      } else if (amountPaid > 0) {
        // Partial payment — status depends on whether dueDate has passed
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDay = new Date(payment.dueDate);
        dueDay.setHours(0, 0, 0, 0);
        payment.status = dueDay < today ? 'overdue' : 'partial';
      }
      // amountPaid === 0 keeps existing status; refreshOverduePayments will
      // handle the pending → overdue transition based on dueDate.
    } else {
      // No amountPaid supplied — allow manual status / paidDate override
      if (req.body.paidDate !== undefined) payment.paidDate = req.body.paidDate;
      if (req.body.status !== undefined) payment.status = req.body.status;
    }

    const updatedPayment = await payment.save();
    res.json(updatedPayment);
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
      // Check if user owns this payment
      if (payment.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to delete this payment' });
      }

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
    const ownerScope = { owner: req.user._id };

    // Refresh overdue status before counting so stats reflect today's reality
    await refreshOverduePayments(ownerScope);

    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const monthlyRevenue = await Payment.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(req.user._id),
          status: 'paid',
          paidDate: { $gte: currentMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amountPaid' }
        }
      }
    ]);

    const [collected, pending, overdue] = await Promise.all([
      Payment.countDocuments({ ...ownerScope, status: 'paid' }),
      Payment.countDocuments({ ...ownerScope, status: 'pending' }),
      Payment.countDocuments({ ...ownerScope, status: 'overdue' })
    ]);

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
