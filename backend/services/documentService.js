const PDFDocument = require('pdfkit');
const Document = require('../models/Document');

const toDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toISOString().slice(0, 10);
};

const toMoney = (value) => {
  const amount = Number(value) || 0;
  return amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const normalizeBase64 = (value = '') => String(value).replace(/^data:[^;]+;base64,/, '').trim();

const sanitizeFileName = (value = 'document') => {
  const cleaned = String(value)
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
  return cleaned || 'document';
};

const buildPdfBuffer = ({ title, subtitle, lines = [] }) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ margin: 48, size: 'A4' });
  const chunks = [];

  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  doc.fontSize(18).text(title || 'Document');
  if (subtitle) {
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#666666').text(subtitle);
    doc.fillColor('#000000');
  }

  doc.moveDown(1);
  lines.forEach((line) => {
    doc.fontSize(11).text(line || '-');
    doc.moveDown(0.2);
  });

  doc.moveDown(0.8);
  doc.fontSize(9).fillColor('#666666').text(`Generated: ${new Date().toISOString()}`);
  doc.end();
});

const createDocumentRecord = async ({
  ownerContext,
  title,
  category = 'System Generated',
  documentType = 'attachment',
  sourceModule = 'system',
  sourceAction = 'generated',
  description = '',
  status = 'Active',
  accessLevel = 'private',
  visibleToTenant = false,
  related = {},
  file = {},
  notes = ''
}) => {
  if (!ownerContext?.company || !ownerContext?.uploadedBy) {
    throw new Error('ownerContext with company and uploadedBy is required.');
  }

  const base64 = normalizeBase64(file.base64 || file.fileBase64 || '');
  const buffer = Buffer.isBuffer(file.buffer) ? file.buffer : (base64 ? Buffer.from(base64, 'base64') : null);
  if (!buffer && !file.fileUrl) {
    throw new Error('Document requires file content or a fileUrl.');
  }

  const mimeType = String(file.mimeType || file.contentType || (buffer ? 'application/pdf' : '')).trim();
  const extensionByMimeType = {
    'application/pdf': 'pdf',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx'
  };
  const extension = extensionByMimeType[mimeType] || 'txt';
  const baseName = sanitizeFileName(file.fileName || title || 'document');
  const fileName = baseName.endsWith(`.${extension}`) ? baseName : `${baseName}.${extension}`;

  const docData = {
    company: ownerContext.company,
    uploadedBy: ownerContext.uploadedBy,
    generatedBy: ownerContext.generatedBy || ownerContext.uploadedBy,
    tenant: related.tenant,
    property: related.property,
    unit: related.unit,
    payment: related.payment,
    invoice: related.invoice,
    maintenance: related.maintenance,
    reportId: related.reportId,
    title,
    documentName: title,
    category,
    documentType,
    sourceModule,
    sourceAction,
    fileUrl: String(file.fileUrl || '').trim(),
    fileData: buffer || undefined,
    fileBase64: base64 || (buffer ? buffer.toString('base64') : ''),
    fileName,
    originalName: String(file.originalName || fileName),
    fileType: extension === 'jpg' ? 'jpg' : extension,
    mimeType,
    size: Number(file.size || (buffer ? buffer.length : 0)) || 0,
    description,
    status,
    visibleToTenant,
    isVisible: true,
    accessLevel,
    generatedAt: new Date(),
    notes
  };

  if (ownerContext.owner) {
    docData.owner = ownerContext.owner;
  }

  return Document.create(docData);
};

const generatePaymentReceiptDocument = async ({ ownerContext, payment, tenant, property, unit }) => {
  const title = `Payment Receipt ${payment.receiptNumber || payment._id}`;
  const pdf = await buildPdfBuffer({
    title,
    subtitle: 'System Generated Payment Receipt',
    lines: [
      `Receipt: ${payment.receiptNumber || 'N/A'}`,
      `Tenant: ${tenant?.fullName || 'N/A'}`,
      `Property: ${property?.name || 'N/A'}`,
      `Unit: ${unit?.unitNumber || 'N/A'}`,
      `Date: ${toDate(payment.paymentDate || payment.paidDate || payment.createdAt)}`,
      `Amount Paid: ${toMoney(payment.amountPaid || payment.amount)}`,
      `Remaining Balance: ${toMoney(payment.remainingBalance)}`,
      `Method: ${payment.paymentMethod || 'N/A'}`,
      `Reference: ${payment.paymentReference || payment.transactionId || 'N/A'}`
    ]
  });

  return createDocumentRecord({
    ownerContext,
    title,
    category: 'Payment Receipts',
    documentType: 'receipt',
    sourceModule: 'payment',
    sourceAction: 'recorded',
    description: 'Automatically generated payment receipt.',
    accessLevel: 'tenant',
    visibleToTenant: true,
    related: {
      tenant: tenant?._id || payment.tenant,
      property: property?._id || payment.property,
      unit: unit?._id || payment.unit,
      payment: payment._id,
      invoice: payment._id
    },
    file: {
      buffer: pdf,
      mimeType: 'application/pdf',
      fileName: `receipt_${payment.receiptNumber || payment._id}`
    }
  });
};

const generateMonthlyAssessmentDocument = async ({ ownerContext, tenant, property, unit, billingMonth, dueDate, invoice }) => {
  const title = `Monthly Assessment ${tenant?.fullName || ''} ${billingMonth || ''}`.trim();
  const pdf = await buildPdfBuffer({
    title,
    subtitle: 'System Generated Monthly Assessment',
    lines: [
      `Tenant: ${tenant?.fullName || 'N/A'}`,
      `Property: ${property?.name || 'N/A'}`,
      `Unit: ${unit?.unitNumber || 'N/A'}`,
      `Billing Month: ${billingMonth || 'N/A'}`,
      `Due Date: ${toDate(dueDate || invoice?.dueDate)}`,
      `Rent: ${toMoney(invoice?.monthlyRent)}`,
      `Previous Balance: ${toMoney(invoice?.previousBalance)}`,
      `Penalties: ${toMoney(invoice?.penalties)}`,
      `Total Due: ${toMoney(invoice?.amount)}`
    ]
  });

  return createDocumentRecord({
    ownerContext,
    title,
    category: 'Monthly Assessments',
    documentType: 'invoice',
    sourceModule: 'monthly_assessment',
    sourceAction: 'generated',
    description: 'Monthly tenant rent assessment.',
    accessLevel: 'tenant',
    visibleToTenant: true,
    related: {
      tenant: tenant?._id,
      property: property?._id,
      unit: unit?._id,
      invoice: invoice?._id
    },
    file: {
      buffer: pdf,
      mimeType: 'application/pdf',
      fileName: `monthly_assessment_${tenant?._id || 'tenant'}_${billingMonth || 'period'}`
    }
  });
};

const generateMaintenanceApprovalDocument = async ({ ownerContext, maintenance, tenant, property, unit }) => {
  const title = `Maintenance ${maintenance.requestId || maintenance._id} Approved`;
  const pdf = await buildPdfBuffer({
    title,
    subtitle: 'System Generated Maintenance Approval',
    lines: [
      `Request: ${maintenance.requestId || maintenance._id}`,
      `Issue: ${maintenance.issue || maintenance.description || 'N/A'}`,
      `Priority: ${maintenance.priority || 'N/A'}`,
      `Tenant: ${tenant?.fullName || 'N/A'}`,
      `Property: ${property?.name || 'N/A'}`,
      `Unit: ${unit?.unitNumber || 'N/A'}`,
      `Technician: ${maintenance.technicianName || 'N/A'}`,
      `Estimated Cost: ${toMoney(maintenance.estimatedCost)}`,
      `Approved At: ${toDate(maintenance.approvedAt || new Date())}`
    ]
  });

  return createDocumentRecord({
    ownerContext,
    title,
    category: 'Maintenance Documents',
    documentType: 'report',
    sourceModule: 'maintenance',
    sourceAction: 'approved',
    description: 'Maintenance approval record.',
    accessLevel: 'tenant',
    visibleToTenant: true,
    related: {
      tenant: tenant?._id || maintenance.tenant,
      property: property?._id || maintenance.property,
      unit: unit?._id || maintenance.unit,
      maintenance: maintenance._id
    },
    file: {
      buffer: pdf,
      mimeType: 'application/pdf',
      fileName: `maintenance_approved_${maintenance.requestId || maintenance._id}`
    }
  });
};

const generateMaintenanceCompletionDocument = async ({ ownerContext, maintenance, tenant, property, unit }) => {
  const title = `Maintenance ${maintenance.requestId || maintenance._id} Completed`;
  const pdf = await buildPdfBuffer({
    title,
    subtitle: 'System Generated Maintenance Completion',
    lines: [
      `Request: ${maintenance.requestId || maintenance._id}`,
      `Issue: ${maintenance.issue || maintenance.description || 'N/A'}`,
      `Tenant: ${tenant?.fullName || 'N/A'}`,
      `Property: ${property?.name || 'N/A'}`,
      `Unit: ${unit?.unitNumber || 'N/A'}`,
      `Resolution: ${maintenance.resolutionNotes || 'N/A'}`,
      `Actual Cost: ${toMoney(maintenance.actualCost || maintenance.cost)}`,
      `Completed At: ${toDate(maintenance.completedAt || new Date())}`
    ]
  });

  return createDocumentRecord({
    ownerContext,
    title,
    category: 'Maintenance Documents',
    documentType: 'report',
    sourceModule: 'maintenance',
    sourceAction: 'completed',
    description: 'Maintenance completion record.',
    accessLevel: 'tenant',
    visibleToTenant: true,
    related: {
      tenant: tenant?._id || maintenance.tenant,
      property: property?._id || maintenance.property,
      unit: unit?._id || maintenance.unit,
      maintenance: maintenance._id
    },
    file: {
      buffer: pdf,
      mimeType: 'application/pdf',
      fileName: `maintenance_completed_${maintenance.requestId || maintenance._id}`
    }
  });
};

const generateTenantProfileDocument = async ({ ownerContext, tenant, property, unit }) => {
  const title = `Tenant Profile ${tenant.fullName}`;
  const pdf = await buildPdfBuffer({
    title,
    subtitle: 'System Generated Tenant Profile',
    lines: [
      `Name: ${tenant.fullName || 'N/A'}`,
      `Phone: ${tenant.phone || 'N/A'}`,
      `Email: ${tenant.email || 'N/A'}`,
      `ID Number: ${tenant.idNumber || 'N/A'}`,
      `Lease Start: ${toDate(tenant.leaseStart)}`,
      `Lease End: ${toDate(tenant.leaseEnd)}`,
      `Rent Amount: ${toMoney(tenant.rentAmount)}`,
      `Property: ${property?.name || 'N/A'}`,
      `Unit: ${unit?.unitNumber || 'N/A'}`
    ]
  });

  return createDocumentRecord({
    ownerContext,
    title,
    category: 'Tenant Documents',
    documentType: 'tenant_doc',
    sourceModule: 'tenant_profile',
    sourceAction: 'generated',
    description: 'Tenant profile snapshot generated at onboarding.',
    related: { tenant: tenant._id, property: property?._id || tenant.property, unit: unit?._id || tenant.unit },
    file: {
      buffer: pdf,
      mimeType: 'application/pdf',
      fileName: `tenant_profile_${tenant._id}`
    }
  });
};

const registerTenantAttachmentDocuments = async ({ ownerContext, tenant, property, unit, attachments = [] }) => {
  const created = [];
  for (const attachment of attachments.filter((item) => item?.base64 && item?.contentType)) {
    const cleanedBase64 = normalizeBase64(attachment.base64);
    if (!cleanedBase64) continue;
    const label = attachment.documentType || 'attachment';

    const doc = await createDocumentRecord({
      ownerContext,
      title: `Tenant Attachment ${tenant.fullName} ${label}`,
      category: 'Tenant Documents',
      documentType: attachment.contentType.startsWith('image/') ? 'image' : 'attachment',
      sourceModule: 'tenant_profile',
      sourceAction: 'attachment_registered',
      description: `Registered tenant attachment: ${label}`,
      related: { tenant: tenant._id, property: property?._id || tenant.property, unit: unit?._id || tenant.unit },
      file: {
        base64: cleanedBase64,
        mimeType: attachment.contentType,
        fileName: attachment.originalName || `${tenant.fullName}_${label}`,
        originalName: attachment.originalName,
        size: attachment.size
      },
      status: 'Pending Review'
    });

    created.push(doc);
  }
  return created;
};

const generatePropertyProfileDocument = async ({ ownerContext, property }) => {
  const title = `Property Profile ${property.name}`;
  const pdf = await buildPdfBuffer({
    title,
    subtitle: 'System Generated Property Profile',
    lines: [
      `Name: ${property.name || 'N/A'}`,
      `Location: ${property.location || 'N/A'}`,
      `Type: ${property.propertyType || 'N/A'}`,
      `Total Units: ${property.totalUnits || 0}`,
      `Monthly Income: ${toMoney(property.monthlyIncome)}`,
      `Annual Income: ${toMoney(property.annualIncome)}`
    ]
  });

  return createDocumentRecord({
    ownerContext,
    title,
    category: 'Property Documents',
    documentType: 'property_doc',
    sourceModule: 'property_creation',
    sourceAction: 'generated',
    description: 'Property profile snapshot generated at creation.',
    related: { property: property._id },
    file: {
      buffer: pdf,
      mimeType: 'application/pdf',
      fileName: `property_profile_${property._id}`
    }
  });
};

const registerPropertyImageDocuments = async ({ ownerContext, property, propertyImages = [] }) => {
  const created = [];
  for (let index = 0; index < propertyImages.length; index += 1) {
    const image = propertyImages[index];
    if (!image?.base64 || !image?.contentType) continue;
    const cleanedBase64 = normalizeBase64(image.base64);
    if (!cleanedBase64) continue;

    const doc = await createDocumentRecord({
      ownerContext,
      title: `Property Image ${property.name} ${index + 1}`,
      category: 'Property Documents',
      documentType: 'image',
      sourceModule: 'property_creation',
      sourceAction: 'image_registered',
      description: 'Property image registered in the document library.',
      related: { property: property._id },
      file: {
        base64: cleanedBase64,
        mimeType: image.contentType,
        fileName: image.originalName || `${property.name}_image_${index + 1}`,
        originalName: image.originalName,
        size: image.size
      },
      status: 'Pending Review'
    });

    created.push(doc);
  }
  return created;
};

const generateUnitProfileDocument = async ({ ownerContext, unit, property }) => {
  const title = `Unit Profile ${unit.unitNumber}`;
  const pdf = await buildPdfBuffer({
    title,
    subtitle: 'System Generated Unit Profile',
    lines: [
      `Unit Number: ${unit.unitNumber || 'N/A'}`,
      `Property: ${property?.name || 'N/A'}`,
      `Status: ${unit.status || 'N/A'}`,
      `Rent Amount: ${toMoney(unit.rentAmount)}`,
      `Deposit Amount: ${toMoney(unit.depositAmount)}`,
      `Bedrooms: ${unit.bedrooms || 0}`,
      `Bathrooms: ${unit.bathrooms || 0}`
    ]
  });

  return createDocumentRecord({
    ownerContext,
    title,
    category: 'Unit Documents',
    documentType: 'report',
    sourceModule: 'unit_creation',
    sourceAction: 'generated',
    description: 'Unit profile snapshot generated at creation.',
    related: { property: property?._id || unit.property, unit: unit._id },
    file: {
      buffer: pdf,
      mimeType: 'application/pdf',
      fileName: `unit_profile_${unit._id}`
    }
  });
};

const generateReportExportDocument = async ({ ownerContext, reportType, report }) => {
  const title = `Report Export ${reportType || 'summary'}`;
  const pdf = await buildPdfBuffer({
    title,
    subtitle: 'System Generated Report Snapshot',
    lines: [
      `Report Type: ${reportType || 'N/A'}`,
      `Period: ${report?.period || 'N/A'}`,
      `Total Revenue: ${toMoney(report?.totalRevenue)}`,
      `Total Properties: ${report?.totalProperties || 0}`,
      `Total Units: ${report?.totalUnits || 0}`,
      `Occupancy Rate: ${report?.occupancyRate || 0}%`,
      `Active Tenants: ${report?.activeTenants || 0}`,
      `Maintenance Requests: ${report?.totalRequests || 0}`
    ]
  });

  return createDocumentRecord({
    ownerContext,
    title,
    category: 'Reports',
    documentType: 'report',
    sourceModule: 'report_export',
    sourceAction: 'generated',
    description: 'Generated report snapshot from self owner reports endpoint.',
    related: { reportId: `${reportType || 'report'}-${Date.now()}` },
    file: {
      buffer: pdf,
      mimeType: 'application/pdf',
      fileName: `report_${reportType || 'summary'}_${Date.now()}`
    }
  });
};

const listOwnerDocuments = async ({ ownerContext, filters = {}, page = 1, limit = 25 }) => {
  const query = { company: ownerContext.company, deletedAt: null };
  if (ownerContext.owner) query.owner = ownerContext.owner;

  if (filters.category) query.category = filters.category;
  if (filters.status) query.status = filters.status;
  if (filters.sourceModule) query.sourceModule = filters.sourceModule;
  if (filters.documentType) query.documentType = filters.documentType;
  if (filters.tenant) query.tenant = filters.tenant;
  if (filters.property) query.property = filters.property;
  if (filters.unit) query.unit = filters.unit;

  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      query.createdAt.$lte = end;
    }
  }

  if (filters.search) {
    const search = new RegExp(String(filters.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [
      { title: search },
      { documentName: search },
      { fileName: search },
      { description: search },
      { sourceAction: search }
    ];
  }

  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 25));

  const [items, total] = await Promise.all([
    Document.find(query)
      .select('-fileData -fileBase64')
      .populate('tenant', 'fullName')
      .populate('property', 'name')
      .populate('unit', 'unitNumber')
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit),
    Document.countDocuments(query)
  ]);

  return {
    items,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.max(1, Math.ceil(total / safeLimit))
    }
  };
};

const getOwnerDocumentById = async ({ ownerContext, documentId, includeContent = false }) => {
  const select = includeContent ? '' : '-fileData -fileBase64';
  const query = { company: ownerContext.company, _id: documentId, deletedAt: null };
  if (ownerContext.owner) query.owner = ownerContext.owner;
  return Document.findOne(query)
    .select(select)
    .populate('tenant', 'fullName')
    .populate('property', 'name')
    .populate('unit', 'unitNumber')
    .populate('uploadedBy', 'name email');
};

const softDeleteOwnerDocument = async ({ ownerContext, documentId }) => {
  const query = { company: ownerContext.company, _id: documentId, deletedAt: null };
  if (ownerContext.owner) query.owner = ownerContext.owner;
  return Document.updateOne(
    query,
    { $set: { deletedAt: new Date() } }
  );
};

module.exports = {
  createDocumentRecord,
  generatePaymentReceiptDocument,
  generateMonthlyAssessmentDocument,
  generateMaintenanceApprovalDocument,
  generateMaintenanceCompletionDocument,
  generateTenantProfileDocument,
  registerTenantAttachmentDocuments,
  generatePropertyProfileDocument,
  registerPropertyImageDocuments,
  generateUnitProfileDocument,
  generateReportExportDocument,
  listOwnerDocuments,
  getOwnerDocumentById,
  softDeleteOwnerDocument
};
