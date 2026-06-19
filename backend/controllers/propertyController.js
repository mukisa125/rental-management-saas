const Property = require('../models/Property');
const Unit = require('../models/Unit');

// @desc    Get all properties
// @route   GET /api/properties
// @access  Private
const getProperties = async (req, res) => {
  try {
    const properties = await Property.find({ owner: req.user._id })
      .populate('owner', 'name email')
      .sort('-createdAt');
    res.json(properties);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single property
// @route   GET /api/properties/:id
// @access  Private
const getPropertyById = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id).populate('owner', 'name email');
    
    if (property) {
      // Check if user owns the property
      if (property.owner._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to access this property' });
      }
      res.json(property);
    } else {
      res.status(404).json({ message: 'Property not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new property
// @route   POST /api/properties
// @access  Private
const createProperty = async (req, res) => {
  try {
    console.log('Creating property with data:', req.body);
    console.log('User:', req.user);
    
    if (!req.user || !req.user._id) {
      console.error('No user found in request');
      return res.status(401).json({ message: 'User not authenticated' });
    }

    const propertyData = {
      name: req.body.name,
      location: req.body.location,
      description: req.body.description || '',
      totalUnits: req.body.totalUnits || 0,
      status: req.body.status || 'active',
      owner: req.user._id,
    };

    console.log('Property data to save:', propertyData);

    const property = await Property.create(propertyData);
    console.log('Property created successfully:', property);

    res.status(201).json(property);
  } catch (error) {
    console.error('Error creating property:', error);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      message: error.message,
      error: error.errors ? Object.keys(error.errors).reduce((acc, key) => {
        acc[key] = error.errors[key].message;
        return acc;
      }, {}) : {}
    });
  }
};

// @desc    Update property
// @route   PUT /api/properties/:id
// @access  Private
const updateProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (property) {
      // Check if user owns the property
      if (property.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this property' });
      }
      
      property.name = req.body.name || property.name;
      property.location = req.body.location || property.location;
      property.description = req.body.description || property.description;
      property.totalUnits = req.body.totalUnits || property.totalUnits;
      property.occupiedUnits = req.body.occupiedUnits || property.occupiedUnits;
      property.status = req.body.status || property.status;
      property.image = req.body.image || property.image;

      const updatedProperty = await property.save();
      res.json(updatedProperty);
    } else {
      res.status(404).json({ message: 'Property not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete property
// @route   DELETE /api/properties/:id
// @access  Private
const deleteProperty = async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);

    if (property) {
      // Check if user owns the property
      if (property.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to delete this property' });
      }
      
      // Also delete all units associated with this property
      await Unit.deleteMany({ property: req.params.id });
      await property.deleteOne();
      res.json({ message: 'Property removed' });
    } else {
      res.status(404).json({ message: 'Property not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
};
