const Unit = require('../models/Unit');
const Property = require('../models/Property');

// @desc    Get all units
// @route   GET /api/units
// @access  Private
const getUnits = async (req, res) => {
  try {
    const { property, status } = req.query;
    
    let query = {};
    if (property) query.property = property;
    if (status) query.status = status;

    const units = await Unit.find(query)
      .populate('property', 'name location')
      .populate('currentTenant', 'fullName email')
      .sort('unitNumber');
    
    res.json(units);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single unit
// @route   GET /api/units/:id
// @access  Private
const getUnitById = async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id)
      .populate('property', 'name location')
      .populate('currentTenant', 'fullName email phone');
    
    if (unit) {
      res.json(unit);
    } else {
      res.status(404).json({ message: 'Unit not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new unit
// @route   POST /api/units
// @access  Private
const createUnit = async (req, res) => {
  try {
    const { property } = req.body;

    // Check if property exists
    const propertyDoc = await Property.findById(property);
    if (!propertyDoc) {
      return res.status(400).json({ message: 'Property not found' });
    }

    const unit = await Unit.create(req.body);

    // Update property total units
    propertyDoc.totalUnits += 1;
    propertyDoc.vacantUnits += 1;
    await propertyDoc.save();

    res.status(201).json(unit);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update unit
// @route   PUT /api/units/:id
// @access  Private
const updateUnit = async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id);

    if (unit) {
      unit.unitNumber = req.body.unitNumber || unit.unitNumber;
      unit.rentAmount = req.body.rentAmount || unit.rentAmount;
      unit.bedrooms = req.body.bedrooms || unit.bedrooms;
      unit.bathrooms = req.body.bathrooms || unit.bathrooms;
      unit.area = req.body.area || unit.area;
      unit.status = req.body.status || unit.status;

      const updatedUnit = await unit.save();
      res.json(updatedUnit);
    } else {
      res.status(404).json({ message: 'Unit not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete unit
// @route   DELETE /api/units/:id
// @access  Private
const deleteUnit = async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id);

    if (unit) {
      // Update property total units
      const property = await Property.findById(unit.property);
      if (property) {
        property.totalUnits = Math.max(0, property.totalUnits - 1);
        if (unit.status === 'vacant') {
          property.vacantUnits = Math.max(0, property.vacantUnits - 1);
        }
        await property.save();
      }

      await unit.deleteOne();
      res.json({ message: 'Unit removed' });
    } else {
      res.status(404).json({ message: 'Unit not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getUnits,
  getUnitById,
  createUnit,
  updateUnit,
  deleteUnit,
};
