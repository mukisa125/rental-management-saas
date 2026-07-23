const Tenant = require('../models/Tenant');
const Property = require('../models/Property');
const Unit = require('../models/Unit');
const User = require('../models/User');
const Payment = require('../models/Payment');

// @desc    Get all tenants
// @route   GET /api/tenants
// @access  Private
const getTenants = async (req, res) => {
  try {
    const tenants = await Tenant.find({ owner: req.user._id })
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
      // Check if user owns this tenant
      if (tenant.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to access this tenant' });
      }
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

    // Check if property and unit exist and belong to user
    const propertyDoc = await Property.findById(property);
    const unitDoc = await Unit.findById(unit);

    if (!propertyDoc || !unitDoc) {
      return res.status(400).json({ message: 'Property or Unit not found' });
    }

    // Check if user owns this property
    if (propertyDoc.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to add tenants to this property' });
    }

    const tenant = await Tenant.create({
      ...req.body,
      owner: req.user._id
    });

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
      // Check if user owns this tenant
      if (tenant.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this tenant' });
      }

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

// @desc    Allocate tenant with account creation and payment setup
// @route   POST /api/tenants/allocate/full
// @access  Private
const allocateTenant = async (req, res) => {
  try {
    const { fullName, email, phone, password, property, unit, leaseStart, leaseEnd, rentAmount, securityDeposit, emergencyContact, idNumber, createPaymentRecords } = req.body;

    // Validate required fields
    if (!fullName || !email || !phone || !password || !property || !unit || !leaseStart || !leaseEnd || !rentAmount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Check if property and unit exist
    const propertyDoc = await Property.findById(property);
    const unitDoc = await Unit.findById(unit);

    if (!propertyDoc || !unitDoc) {
      return res.status(400).json({ message: 'Property or Unit not found' });
    }

    // Check if user owns this property
    if (propertyDoc.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to add tenants to this property' });
    }

    // Check if unit is already occupied
    if (unitDoc.status === 'occupied') {
      return res.status(400).json({ message: 'Unit is already occupied' });
    }

    // Create tenant user account
    const tenantUser = await User.create({
      name: fullName,
      email: email.toLowerCase(),
      password: password,
      phone: phone,
      role: 'tenant',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${fullName.replace(/\s+/g, '')}`,
      isActive: true
    });

    // Create tenant record
    const tenant = await Tenant.create({
      user: tenantUser._id,
      fullName: fullName,
      email: email.toLowerCase(),
      phone: phone,
      property: property,
      unit: unit,
      owner: req.user._id,
      leaseStart: leaseStart,
      leaseEnd: leaseEnd,
      rentAmount: rentAmount,
      securityDeposit: securityDeposit || 0,
      status: 'active',
      emergencyContact: emergencyContact,
      idNumber: idNumber
    });

    // Update unit status to occupied
    unitDoc.status = 'occupied';
    unitDoc.currentTenant = tenant._id;
    unitDoc.owner = req.user._id;
    await unitDoc.save();

    // Update property occupied units
    propertyDoc.occupiedUnits += 1;
    await propertyDoc.save();

    // Create payment records if requested
    let payments = [];
    if (createPaymentRecords) {
      const numMonths = parseInt(createPaymentRecords) || 12;
      const companyId = req.company?._id || req.user.company;

      for (let month = 0; month < numMonths; month++) {
        const dueDate = new Date(leaseStart);
        dueDate.setMonth(dueDate.getMonth() + month + 1);

        // Set due date to the last day of the billing month
        dueDate.setDate(1);
        dueDate.setDate(0); // Last day of previous month = first day of next month - 1

        const paymentYear = dueDate.getFullYear();
        const paymentMonth = dueDate.getMonth() + 1; // getMonth() is 0-indexed
        const paymentPeriodStr = `${paymentYear}-${String(paymentMonth).padStart(2, '0')}`;
        const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        payments.push({
          tenant: tenant._id,
          property: property,
          unit: unit,
          owner: req.user._id,
          company: companyId,
          amount: rentAmount,
          amountPaid: 0,
          balance: rentAmount,
          remainingBalance: rentAmount,
          dueDate: dueDate,
          paymentFor: `Rent for ${MONTH_NAMES[paymentMonth - 1]} ${paymentYear}`,
          paymentPeriod: { month: paymentMonth, year: paymentYear },
          paymentPeriodStr: paymentPeriodStr,
          paymentMonth: paymentMonth,
          paymentYear: paymentYear,
          status: 'pending',
          paymentMethod: 'bank_transfer',
          isGenerated: true,
          generatedFrom: 'tenant_allocation'
        });
      }
      await Payment.insertMany(payments);
    }

    // Populate tenant with related data
    const populatedTenant = await Tenant.findById(tenant._id)
      .populate('user', 'name email phone role')
      .populate('property', 'name location')
      .populate('unit', 'unitNumber rentAmount');

    res.status(201).json({
      message: 'Tenant allocated successfully with account created',
      tenant: populatedTenant,
      user: tenantUser,
      paymentsCreated: payments.length
    });
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
      // Check if user owns this tenant
      if (tenant.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to delete this tenant' });
      }

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
  allocateTenant
};
