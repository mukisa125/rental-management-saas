const MISSING_TEXTS = new Set(['', 'undefined', 'null', 'nan']);

const isMissing = (value) => {
  if (value === undefined || value === null) return true;
  const text = String(value).trim().toLowerCase();
  return MISSING_TEXTS.has(text);
};

export const safeText = (value, fallback = '-') => {
  if (isMissing(value)) return fallback;
  return String(value).trim();
};

export const safeNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export const safeDate = (value, fallback = '-') => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString('en-UG');
};

export const safeDateTime = (value, fallback = '-') => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString('en-UG');
};

export const formatFileSize = (value) => {
  const size = safeNumber(value, 0);
  if (size <= 0) return '-';
  if (size < 1024) return `${Math.round(size)} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const MIME_TO_TYPE = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPG',
  'image/jpg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WEBP',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/msword': 'DOC'
};

const EXT_TO_TYPE = {
  pdf: 'PDF',
  jpg: 'JPG',
  jpeg: 'JPG',
  png: 'PNG',
  webp: 'WEBP',
  docx: 'DOCX',
  doc: 'DOC'
};

const SOURCE_TO_RELATED = {
  payment: 'Payment',
  maintenance: 'Maintenance',
  unit_creation: 'Unit',
  unit: 'Unit',
  property_creation: 'Property',
  property: 'Property',
  tenant_profile: 'Tenant',
  tenant: 'Tenant',
  monthly_assessment: 'Report',
  report_export: 'Report',
  system: 'Manual Upload',
  manual_upload: 'Manual Upload'
};

const normalizeFileToken = (value) => safeText(value, '').replace(/\.(other|undefined|null)$/i, '').trim();

export const getDocumentName = (document) => {
  const name = safeText(document?.title || document?.documentName, '');
  if (name) return name;

  const original = getOriginalFileName(document);
  if (original && original !== 'Unknown file') {
    return original.replace(/\.[a-z0-9]+$/i, '').trim() || 'Untitled Document';
  }

  return 'Untitled Document';
};

export const getOriginalFileName = (document) => {
  const raw = normalizeFileToken(document?.originalName || document?.fileName);
  if (!raw) return 'Unknown file';
  return raw;
};

export const getFileType = (document) => {
  const mimeType = String(document?.contentType || document?.mimeType || '').toLowerCase();
  if (mimeType && MIME_TO_TYPE[mimeType]) return MIME_TO_TYPE[mimeType];

  const direct = String(document?.fileType || '').trim().toLowerCase();
  if (direct && direct !== 'other' && EXT_TO_TYPE[direct]) return EXT_TO_TYPE[direct];

  const fileName = getOriginalFileName(document);
  const extension = fileName.includes('.') ? fileName.split('.').pop().toLowerCase() : '';
  if (extension && EXT_TO_TYPE[extension]) return EXT_TO_TYPE[extension];

  return 'FILE';
};

export const getFileSize = (document) => formatFileSize(document?.size || document?.fileSize || 0);

export const getDocumentCategory = (document) => safeText(document?.category, 'System Generated');

export const getDocumentStatus = (document) => {
  const raw = safeText(document?.status, 'Active');
  return raw === 'Verified' ? 'Generated' : raw;
};

export const getRelatedText = (document) => {
  const moduleKey = String(document?.sourceModule || '').toLowerCase();
  if (SOURCE_TO_RELATED[moduleKey]) return SOURCE_TO_RELATED[moduleKey];

  if (document?.payment) return 'Payment';
  if (document?.maintenance) return 'Maintenance';
  if (document?.tenant) return 'Tenant';
  if (document?.unit) return 'Unit';
  if (document?.property) return 'Property';
  if (document?.reportId) return 'Report';

  return 'Manual Upload';
};

export const getPropertyUnitText = (document) => {
  const propertyName = safeText(document?.property?.name, '-');
  const unitNumber = safeText(document?.unit?.unitNumber, '');
  return {
    propertyName,
    unitLabel: unitNumber ? `Unit: ${unitNumber}` : propertyName === '-' ? '-' : 'No unit'
  };
};

export const getTenantName = (document) => safeText(document?.tenant?.fullName, '-');

export const formatDate = (value) => {
  if (!value) return { date: '-', time: '-' };
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return { date: '-', time: '-' };
  return {
    date: parsed.toLocaleDateString('en-UG'),
    time: parsed.toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })
  };
};

export const inferFileKind = (document) => {
  const fileType = getFileType(document);

  if (fileType === 'PDF') return 'pdf';
  if (['JPG', 'PNG', 'WEBP'].includes(fileType)) return 'image';
  if (['DOC', 'DOCX'].includes(fileType)) return 'word';
  return 'other';
};

export const categoryTabs = [
  'All Documents',
  'Tenant Documents',
  'Property Documents',
  'Unit Documents',
  'Lease Agreements',
  'Payment Receipts',
  'Maintenance Documents',
  'Monthly Assessments',
  'Legal / Ownership',
  'System Generated'
];

export const defaultPagination = { page: 1, pages: 1, total: 0, limit: 25 };

export const defaultSummary = {
  totalDocuments: 0,
  tenantDocuments: 0,
  propertyDocuments: 0,
  unitDocuments: 0,
  leaseAgreements: 0,
  paymentReceipts: 0,
  maintenanceDocuments: 0,
  expiringSoon: 0
};

export const statusOptions = ['Active', 'Generated', 'Pending Review', 'Expiring Soon', 'Expired', 'Rejected'];

export const sourceOptions = [
  'tenant_profile',
  'property_creation',
  'unit_creation',
  'payment',
  'maintenance',
  'monthly_assessment',
  'report_export',
  'manual_upload',
  'system'
];

export const categoryOptions = categoryTabs.filter((item) => item !== 'All Documents');
