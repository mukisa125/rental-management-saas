const Property = require('../models/Property');
const Tenant = require('../models/Tenant');
const Unit = require('../models/Unit');
const Payment = require('../models/Payment');
const Maintenance = require('../models/Maintenance');
const User = require('../models/User');

// Get owner's properties only
const getOwnerProperties = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const properties = await Property.find({ owner: ownerId })
      .populate('manager', 'name email')
      .populate('owner', 'name email');

    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get owner's property by ID
const getOwnerPropertyById = async (req, res) => {
  try {
    const { id } = req.params;
    const ownerId = req.user._id;

    const property = await Property.findOne({ _id: id, owner: ownerId })
      .populate('manager', 'name email')
      .populate('owner', 'name email');

    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    res.json(property);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get owner's financial summary
const getOwnerFinancialSummary = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    }

    // Get owner's properties
    const properties = await Property.find({ owner: ownerId });
    const propertyIds = properties.map(p => p._id);

    // Get payments statistics
    const payments = await Payment.find({
      property: { $in: propertyIds },
      ...dateFilter
    });

    const totalIncome = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingPayments = payments
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);

    const overduePayments = payments
      .filter(p => p.status === 'overdue')
      .reduce((sum, p) => sum + p.amount, 0);

    // Get maintenance costs
    const maintenanceRequests = await Maintenance.find({
      property: { $in: propertyIds },
      status: 'completed',
      ...dateFilter
    });

    const maintenanceCosts = maintenanceRequests.reduce((sum, m) => sum + (m.cost || 0), 0);

    // Get occupancy stats
    const units = await Unit.find({ property: { $in: propertyIds } });
    const occupiedCount = units.filter(u => u.status === 'occupied').length;
    const totalUnits = units.length;
    const occupancyRate = totalUnits ? (occupiedCount / totalUnits) * 100 : 0;

    res.json({
      totalIncome,
      pendingPayments,
      overduePayments,
      maintenanceCosts,
      netIncome: totalIncome - maintenanceCosts,
      occupancyRate: occupancyRate.toFixed(2),
      propertiesCount: properties.length,
      totalUnits,
      occupiedUnits: occupiedCount,
      vacantUnits: totalUnits - occupiedCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get owner's maintenance requests
const getOwnerMaintenanceRequests = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const { status, priority } = req.query;

    let filter = { owner: ownerId };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const maintenanceRequests = await Maintenance.find(filter)
      .populate('tenant', 'fullName email phone')
      .populate('property', 'name')
      .populate('unit', 'unitNumber')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    res.json(maintenanceRequests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get owner's revenue trend
const getOwnerRevenueTrend = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const properties = await Property.find({ owner: ownerId });
    const propertyIds = properties.map(p => p._id);

    const payments = await Payment.find({
      property: { $in: propertyIds },
      status: 'paid'
    });

    // Group by month
    const trendData = {};
    payments.forEach(payment => {
      const monthKey = new Date(payment.paidDate).toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!trendData[monthKey]) {
        trendData[monthKey] = 0;
      }
      trendData[monthKey] += payment.amount;
    });

    const chartData = Object.entries(trendData).map(([month, amount]) => ({
      month,
      amount
    }));

    res.json(chartData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get owner's occupancy metrics
const getOwnerOccupancyMetrics = async (req, res) => {
  try {
    const ownerId = req.user._id;
    const properties = await Property.find({ owner: ownerId });
    const propertyIds = properties.map(p => p._id);

    const metrics = [];

    for (const property of properties) {
      const units = await Unit.find({ property: property._id });
      const occupiedCount = units.filter(u => u.status === 'occupied').length;
      const totalCount = units.length;

      metrics.push({
        propertyId: property._id,
        propertyName: property.name,
        totalUnits: totalCount,
        occupiedUnits: occupiedCount,
        vacantUnits: totalCount - occupiedCount,
        occupancyRate: totalCount ? ((occupiedCount / totalCount) * 100).toFixed(2) : 0
      });
    }

    res.json(metrics);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all owners (for manager use)
const getAllOwners = async (req, res) => {
  try {
    const owners = await User.find({ role: 'owner' }).select('_id name email company phone');
    res.json(owners);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create new owner (for manager use)
const createOwner = async (req, res) => {
  try {
    const { name, email, password, phone, company } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const owner = new User({
      name,
      email,
      password,
      phone: phone || '',
      company: company || '',
      role: 'owner',
      isActive: true
    });

    await owner.save();
    res.status(201).json({ _id: owner._id, name: owner.name, email: owner.email, company: owner.company });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getOwnerProperties,
  getOwnerPropertyById,
  getOwnerFinancialSummary,
  getOwnerMaintenanceRequests,
  getOwnerRevenueTrend,
  getOwnerOccupancyMetrics,
  getAllOwners,
  createOwner
};
