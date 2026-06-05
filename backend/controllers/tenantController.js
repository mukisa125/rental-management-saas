const Tenant = require('../models/Tenant');
const Property = require('../models/Property');
const Unit = require('../models/Unit');

// @desc    Get all tenants
// @route   GET /api/tenants
// @access  Private
const getTenants = async (req, res) => {
  try {
    const tenants = await Tenant.find()
      .populate('property', 'name location')
      .populate('unit', 'unitNumber rentAmount')
      .sort('-createdAt');
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single tenant
// @route   GET /api/tenants/:id
// @access  Private
const getTenantById = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id)
      .populate('property', 'name location')
      .populate('unit', 'unitNumber rentArea bedrooms bathrooms');
    
    if (tenant) {
      res.json(tenant);
    } else {
      res.status(404).json({ message: 'Tenant not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new tenant
// @route   POST /api/tenants
// @access  Private
const createTenant = async (req, res) => {
  try {
    const { property, unit } = req.body;

    // Check if property and unit exist
    const propertyDoc = await Property.findById(property);
    const unitDoc = await Unit.findById(unit);

    if (!propertyDoc || !unitDoc) {
      return res.status(400).json({ message: 'Property or Unit not found' });
    }

    const tenant = await Tenant.create(req.body);

    // Update unit status to occupied
    unitDoc.status = 'occupied';
    unitDoc.currentTenant = tenant._id;
    await unitDoc.save();

    // Update property occupied units
    propertyDoc.occupiedUnits += 1;
    await propertyDoc.save();

    res.status(201).json(tenant);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update tenant
// @route   PUT /api/tenants/:id
// @access  Private
const updateTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);

    if (tenant) {
      tenant.fullName = req.body.fullName || tenant.fullName;
      tenant.email = req.body.email || tenant.email;
      tenant.phone = req.body.phone || tenant.phone;
      tenant.leaseStart = req.body.leaseStart || tenant.leaseStart;
      tenant.leaseEnd = req.body.leaseEnd || tenant.leaseEnd;
      tenant.status = req.body.status || tenant.status;
      tenant.emergencyContact = req.body.emergencyContact || tenant.emergencyContact;
      tenant.idNumber = req.body.idNumber || tenant.idNumber;

      const updatedTenant = await tenant.save();
      res.json(updatedTenant);
    } else {
      res.status(404).json({ message: 'Tenant not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete tenant
// @route   DELETE /api/tenants/:id
// @access  Private
const deleteTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);

    if (tenant) {
      // Update unit status back to vacant
      const unit = await Unit.findById(tenant.unit);
      if (unit) {
        unit.status = 'vacant';
        unit.currentTenant = null;
        await unit.save();
      }

      // Update property occupied units
      const property = await Property.findById(tenant.property);
      if (property) {
        property.occupiedUnits = Math.max(0, property.occupiedUnits - 1);
        await property.save();
      }

      await tenant.deleteOne();
      res.json({ message: 'Tenant removed' });
    } else {
      res.status(404).json({ message: 'Tenant not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
};
