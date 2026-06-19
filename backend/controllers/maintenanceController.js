const Maintenance = require('../models/Maintenance');
const Property = require('../models/Property');

// @desc    Get all maintenance requests
// @route   GET /api/maintenance
// @access  Private
const getMaintenanceRequests = async (req, res) => {
  try {
    const { status, priority, property } = req.query;
    
    let query = { owner: req.user._id };
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (property) query.property = property;

    const requests = await Maintenance.find(query)
      .populate('tenant', 'fullName email phone')
      .populate('property', 'name location')
      .populate('unit', 'unitNumber')
      .populate('assignedTo', 'name email')
      .sort('-createdAt');
    
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single maintenance request
// @route   GET /api/maintenance/:id
// @access  Private
const getMaintenanceById = async (req, res) => {
  try {
    const request = await Maintenance.findById(req.params.id)
      .populate('tenant', 'fullName email phone')
      .populate('property', 'name location')
      .populate('unit', 'unitNumber')
      .populate('assignedTo', 'name email');
    
    if (request) {
      // Check if user owns this maintenance request
      if (request.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to access this maintenance request' });
      }
      res.json(request);
    } else {
      res.status(404).json({ message: 'Maintenance request not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new maintenance request
// @route   POST /api/maintenance
// @access  Private
const createMaintenance = async (req, res) => {
  try {
    const { property } = req.body;

    // Check if property exists and belongs to user
    const propertyDoc = await Property.findById(property);
    if (!propertyDoc) {
      return res.status(400).json({ message: 'Property not found' });
    }

    if (propertyDoc.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to create maintenance requests for this property' });
    }

    const request = await Maintenance.create({
      ...req.body,
      owner: req.user._id
    });
    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update maintenance request
// @route   PUT /api/maintenance/:id
// @access  Private
const updateMaintenance = async (req, res) => {
  try {
    const request = await Maintenance.findById(req.params.id);

    if (request) {
      // Check if user owns this maintenance request
      if (request.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to update this maintenance request' });
      }

      request.issue = req.body.issue || request.issue;
      request.description = req.body.description || request.description;
      request.priority = req.body.priority || request.priority;
      request.status = req.body.status || request.status;
      request.assignedTo = req.body.assignedTo || request.assignedTo;
      request.resolutionNotes = req.body.resolutionNotes || request.resolutionNotes;
      request.images = req.body.images || request.images;

      if (req.body.status === 'resolved' || req.body.status === 'closed') {
        request.resolvedDate = new Date();
      }

      const updatedRequest = await request.save();
      res.json(updatedRequest);
    } else {
      res.status(404).json({ message: 'Maintenance request not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete maintenance request
// @route   DELETE /api/maintenance/:id
// @access  Private
const deleteMaintenance = async (req, res) => {
  try {
    const request = await Maintenance.findById(req.params.id);

    if (request) {
      // Check if user owns this maintenance request
      if (request.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'Not authorized to delete this maintenance request' });
      }

      await request.deleteOne();
      res.json({ message: 'Maintenance request removed' });
    } else {
      res.status(404).json({ message: 'Maintenance request not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMaintenanceRequests,
  getMaintenanceById,
  createMaintenance,
  updateMaintenance,
  deleteMaintenance,
};
