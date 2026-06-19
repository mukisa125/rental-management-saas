const Document = require('../models/Document');
const Tenant = require('../models/Tenant');
const Property = require('../models/Property');

// Get documents for a tenant
const getTenantDocuments = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const userId = req.user._id;

    // Verify authorization
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    // Only owner, manager, or the tenant can view
    if (tenant.owner.toString() !== userId.toString() &&
        req.user.role !== 'manager' &&
        tenant.user?.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const documents = await Document.find({
      tenant: tenantId,
      isVisible: true
    })
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get documents for a property
const getPropertyDocuments = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const userId = req.user._id;

    // Verify authorization
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    if (property.owner.toString() !== userId.toString() && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const documents = await Document.find({
      property: propertyId,
      isVisible: true
    })
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Upload document
const uploadDocument = async (req, res) => {
  try {
    const { tenantId, title, documentType, fileUrl, fileType, description } = req.body;
    const userId = req.user._id;

    // Verify authorization
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ message: 'Tenant not found' });
    }

    if (tenant.owner.toString() !== userId.toString() && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Not authorized to upload documents' });
    }

    const document = await Document.create({
      tenant: tenantId,
      property: tenant.property,
      unit: tenant.unit,
      owner: tenant.owner,
      title,
      documentType,
      fileUrl,
      fileType,
      description,
      uploadedBy: userId
    });

    res.status(201).json(document);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete document
const deleteDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user._id;

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Only owner or manager can delete
    if (document.owner.toString() !== userId.toString() && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Document.findByIdAndDelete(documentId);
    res.json({ message: 'Document deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getTenantDocuments,
  getPropertyDocuments,
  uploadDocument,
  deleteDocument
};
