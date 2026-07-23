import { useEffect, useMemo, useState } from 'react';
import { X, Upload, FileText } from 'lucide-react';
import { categoryOptions, statusOptions } from './documentUtils';

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
];

const compressImageFile = (file) => new Promise((resolve) => {
  if (!file.type.startsWith('image/')) {
    resolve(file);
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      const maxWidth = 1600;
      const ratio = image.width > maxWidth ? maxWidth / image.width : 1;
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * ratio);
      canvas.height = Math.round(image.height * ratio);
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(file);
          return;
        }
        const compressedFile = new File([blob], file.name, { type: file.type, lastModified: Date.now() });
        resolve(compressedFile);
      }, file.type, 0.8);
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
});

export default function UploadDocumentModal({
  isOpen,
  mode = 'create',
  selectedDocument,
  properties,
  units,
  tenants,
  loading,
  progress,
  onClose,
  onSubmit
}) {
  const [form, setForm] = useState({
    title: selectedDocument?.title || '',
    category: selectedDocument?.category || 'System Generated',
    property: selectedDocument?.property?._id || '',
    unit: selectedDocument?.unit?._id || '',
    tenant: selectedDocument?.tenant?._id || '',
    status: selectedDocument?.status || 'Active',
    expiryDate: selectedDocument?.expiryDate ? new Date(selectedDocument.expiryDate).toISOString().slice(0, 10) : '',
    notes: selectedDocument?.notes || ''
  });
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setForm({
      title: selectedDocument?.title || '',
      category: selectedDocument?.category || 'System Generated',
      property: selectedDocument?.property?._id || '',
      unit: selectedDocument?.unit?._id || '',
      tenant: selectedDocument?.tenant?._id || '',
      status: selectedDocument?.status || 'Active',
      expiryDate: selectedDocument?.expiryDate ? new Date(selectedDocument.expiryDate).toISOString().slice(0, 10) : '',
      notes: selectedDocument?.notes || ''
    });
    setFile(null);
    setError('');
  }, [isOpen, selectedDocument]);

  const buttonLabel = mode === 'replace' ? 'Replace Document' : 'Upload Document';

  const propertyUnits = useMemo(() => {
    if (!form.property) return units;
    return (units || []).filter((unit) => {
      const unitProperty = unit?.property;
      const unitPropertyId = typeof unitProperty === 'object' ? unitProperty?._id : unitProperty;
      return String(unitPropertyId || '') === String(form.property);
    });
  }, [form.property, units]);

  if (!isOpen) return null;

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (mode === 'create' && !file) {
      setError('Please choose a file to upload.');
      return;
    }

    if (file && !ACCEPTED_TYPES.includes(file.type)) {
      setError('Unsupported file type. Please upload PDF, image, DOC, or DOCX.');
      return;
    }

    const compressed = file ? await compressImageFile(file) : null;
    onSubmit({ ...form, file: compressed });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
          <h3 className="text-base font-black text-slate-900">{buttonLabel}</h3>
          <button onClick={onClose} className="rounded-md p-2 hover:bg-slate-200"><X className="h-4 w-4 text-slate-700" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5">
          <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label>
              <span className="mb-1 block text-xs font-semibold text-slate-600">Document Name</span>
              <input value={form.title} onChange={(event) => update('title', event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" required />
            </label>

            <label>
              <span className="mb-1 block text-xs font-semibold text-slate-600">Category</span>
              <select value={form.category} onChange={(event) => update('category', event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                {categoryOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-xs font-semibold text-slate-600">Property</span>
              <select value={form.property} onChange={(event) => update('property', event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="">Select Property</option>
                {(properties || []).map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-xs font-semibold text-slate-600">Related Unit</span>
              <select value={form.unit} onChange={(event) => update('unit', event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="">Select Unit</option>
                {(propertyUnits || []).map((item) => <option key={item._id} value={item._id}>{item.unitNumber}</option>)}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-xs font-semibold text-slate-600">Related Tenant</span>
              <select value={form.tenant} onChange={(event) => update('tenant', event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="">Select Tenant</option>
                {(tenants || []).map((item) => <option key={item._id} value={item._id}>{item.fullName}</option>)}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-xs font-semibold text-slate-600">Status</span>
              <select value={form.status} onChange={(event) => update('status', event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                {statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>

            <label>
              <span className="mb-1 block text-xs font-semibold text-slate-600">Expiry Date (Optional)</span>
              <input type="date" value={form.expiryDate} onChange={(event) => update('expiryDate', event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>

            <label className="md:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-slate-600">Notes</span>
              <textarea value={form.notes} onChange={(event) => update('notes', event.target.value)} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </label>

            <label className="md:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-slate-600">File Upload</span>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onChange={(event) => setFile(event.target.files?.[0] || null)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
              <p className="mt-1 text-xs text-slate-500">PDF, JPG, JPEG, PNG, WEBP, DOC, DOCX. Images are compressed before upload.</p>
            </label>
          </div>

          {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p> : null}
          {loading ? (
            <div className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
              Uploading... {Math.max(0, Math.min(100, Math.round(progress || 0)))}%
            </div>
          ) : null}
          </div>

          <div className="sticky bottom-0 mt-4 flex flex-wrap gap-2 border-t border-slate-200 bg-white pt-3">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">
              {mode === 'replace' ? <FileText className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
              {loading ? 'Processing...' : buttonLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
