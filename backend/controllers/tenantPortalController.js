const Tenant = require('../models/Tenant');
const Payment = require('../models/Payment');
const Maintenance = require('../models/Maintenance');
const Document = require('../models/Document');
const Unit = require('../models/Unit');
const Property = require('../models/Property');

// Get tenant's rental information
const getTenantRentalInfo = async (req, res) => {
  try {
    const userId = req.user._id;

    const tenant = await Tenant.findOne({ user: userId })
      .populate('property', 'name location')
      .populate('unit', 'unitNumber bedrooms bathrooms area')
      .populate('owner', 'name email phone');

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant record not found' });
    }

    // Calculate additional info
    const upcomingPayment = await Payment.findOne({
      tenant: tenant._id,
      status: 'pending'
    }).sort({ dueDate: 1 });

    const outstandingBalance = (await Payment.find({
      tenant: tenant._id,
      status: { $in: ['pending', 'overdue'] }
    })).reduce((sum, p) => sum + p.amount, 0);

    res.json({
      ...tenant.toObject(),
      upcomingPayment,
      outstandingBalance
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get tenant's payment history
const getTenantPaymentHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;

    const tenant = await Tenant.findOne({ user: userId });

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant record not found' });
    }

    let filter = { tenant: tenant._id };
    if (status) filter.status = status;

    const payments = await Payment.find(filter)
      .populate('unit', 'unitNumber')
      .populate('property', 'name')
      .sort({ dueDate: -1 });

    res.json(payments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get tenant's maintenance requests
const getTenantMaintenanceRequests = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;

    const tenant = await Tenant.findOne({ user: userId });

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant record not found' });
    }

    let filter = { tenant: tenant._id };
    if (status) filter.status = status;

    const requests = await Maintenance.find(filter)
      .populate('property', 'name')
      .populate('unit', 'unitNumber')
      .populate('assignedTo', 'name email')
      .populate('comments.author', 'name')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create maintenance request
const createMaintenanceRequest = async (req, res) => {
  try {
    const userId = req.user._id;
    const { category, priority, description, images } = req.body;

    const tenant = await Tenant.findOne({ user: userId });

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant record not found' });
    }

    const maintenance = await Maintenance.create({
      tenant: tenant._id,
      property: tenant.property,
      unit: tenant.unit,
      owner: tenant.owner,
      category,
      priority: priority || 'medium',
      description,
      issue: description,
      images: images || [],
      status: 'submitted'
    });

    res.status(201).json(maintenance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get tenant's documents
const getTenantDocuments = async (req, res) => {
  try {
    const userId = req.user._id;

    const tenant = await Tenant.findOne({ user: userId });

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant record not found' });
    }

    const documents = await Document.find({
      tenant: tenant._id,
      isVisible: true
    })
      .populate('uploadedBy', 'name')
      .sort({ createdAt: -1 });

    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get tenant's dashboard summary
const getTenantDashboardSummary = async (req, res) => {
  try {
    const userId = req.user._id;

    const tenant = await Tenant.findOne({ user: userId });

    if (!tenant) {
      return res.status(404).json({ message: 'Tenant record not found' });
    }

    // Get upcoming payment
    const upcomingPayment = await Payment.findOne({
      tenant: tenant._id,
      status: 'pending'
    }).sort({ dueDate: 1 });

    // Get outstanding balance
    const pendingPayments = await Payment.find({
      tenant: tenant._id,
      status: { $in: ['pending', 'overdue'] }
    });

    const outstandingBalance = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

    // Get active maintenance requests
    const activeMaintenanceCount = await Maintenance.countDocuments({
      tenant: tenant._id,
      status: { $ne: 'completed' }
    });

    // Get lease information
    const daysRemainingOnLease = Math.ceil(
      (new Date(tenant.leaseEnd) - new Date()) / (1000 * 60 * 60 * 24)
    );

    res.json({
      currentRent: tenant.rentAmount,
      nextDueDate: upcomingPayment?.dueDate || null,
      outstandingBalance,
      activeMaintenanceRequests: activeMaintenanceCount,
      daysRemainingOnLease,
      leaseEndDate: tenant.leaseEnd
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add comment to maintenance request
const addMaintenanceComment = async (req, res) => {
  try {
    const userId = req.user._id;
    const { maintenanceId } = req.params;
    const { comment } = req.body;

    const maintenance = await Maintenance.findById(maintenanceId);

    if (!maintenance) {
      return res.status(404).json({ message: 'Maintenance request not found' });
    }

    // Check if user owns this maintenance request or is assigned
    const tenant = await Tenant.findOne({ user: userId });
    if (tenant._id.toString() !== maintenance.tenant.toString() && 
        userId.toString() !== maintenance.assignedTo?.toString() &&
        userId.toString() !== maintenance.owner.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    maintenance.comments.push({
      author: userId,
      comment
    });

    await maintenance.save();
    
    const updatedMaintenance = await maintenance.populate('comments.author', 'name email');
    res.json(updatedMaintenance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single maintenance request with full details
const getMaintenanceRequestDetail = async (req, res) => {
  try {
    const userId = req.user._id;
    const { maintenanceId } = req.params;

    const maintenance = await Maintenance.findById(maintenanceId)
      .populate('tenant', 'fullName email phone')
      .populate('property', 'name address')
      .populate('unit', 'unitNumber')
      .populate('assignedTo', 'name email phone')
      .populate('comments.author', 'name email');

    if (!maintenance) {
      return res.status(404).json({ message: 'Maintenance request not found' });
    }

    // Check authorization
    const tenant = await Tenant.findOne({ user: userId });
    if (tenant._id.toString() !== maintenance.tenant.toString() &&
        userId.toString() !== maintenance.assignedTo?.toString() &&
        userId.toString() !== maintenance.owner.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(maintenance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTenantRentalInfo,
  getTenantPaymentHistory,
  getTenantMaintenanceRequests,
  createMaintenanceRequest,
  getTenantDocuments,
  getTenantDashboardSummary,
  addMaintenanceComment,
  getMaintenanceRequestDetail
};
