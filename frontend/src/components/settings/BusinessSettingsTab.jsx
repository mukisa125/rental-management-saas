import { Upload } from 'lucide-react';
import FormField from './FormField';
import BusinessPreviewCard from './BusinessPreviewCard';
import ReceiptPreviewCard from './ReceiptPreviewCard';
import { businessTypes, fileToDataUrl } from './settingsUtils';

const acceptedImageTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

const UploadControl = ({ label, value, onChange }) => (
  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <div className="mt-2 flex items-center gap-3">
      {value ? <img src={value} alt={label} className="h-12 w-12 rounded-lg border border-slate-200 object-cover" /> : <div className="h-12 w-12 rounded-lg border border-dashed border-slate-300 bg-white" />}
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
        <Upload className="h-3.5 w-3.5" />
        Upload
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file || !acceptedImageTypes.has(file.type.toLowerCase()) || file.size > 2 * 1024 * 1024) return;
            const encoded = await fileToDataUrl(file);
            onChange(encoded);
          }}
        />
      </label>
      <button type="button" onClick={() => onChange('')} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">Remove</button>
    </div>
  </div>
);

export default function BusinessSettingsTab({ business, receipts, onChange }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-10">
      <div className="space-y-4 xl:col-span-7">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <FormField label="Business / Landlord Name" value={business.businessName} onChange={(value) => onChange('businessName', value)} />
            <FormField
              label="Business Type"
              value={business.businessType}
              onChange={(value) => onChange('businessType', value)}
              options={businessTypes.map((item) => ({ value: item, label: item }))}
            />
            <FormField label="Registration / ID (Optional)" value={business.registrationId} onChange={(value) => onChange('registrationId', value)} />
            <FormField label="Business Email" type="email" value={business.email} onChange={(value) => onChange('email', value)} />
            <FormField label="Business Phone" value={business.phone} onChange={(value) => onChange('phone', value)} />
            <FormField label="WhatsApp Number" value={business.whatsappNumber} onChange={(value) => onChange('whatsappNumber', value)} />
            <FormField label="Business Address" value={business.address} onChange={(value) => onChange('address', value)} />
            <FormField label="City / Town" value={business.city} onChange={(value) => onChange('city', value)} />
            <FormField label="District" value={business.district} onChange={(value) => onChange('district', value)} />
            <FormField label="Country" value={business.country} onChange={(value) => onChange('country', value)} />
            <FormField label="Working Hours" value={business.workingHours} onChange={(value) => onChange('workingHours', value)} />
            <FormField label="Primary Color" type="color" value={business.primaryColor} onChange={(value) => onChange('primaryColor', value)} />
            <FormField label="Secondary Color" type="color" value={business.secondaryColor} onChange={(value) => onChange('secondaryColor', value)} />
            <div className="md:col-span-2">
              <FormField label="Business Description" textarea value={business.description} onChange={(value) => onChange('description', value)} />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <UploadControl label="Business Logo" value={business.logo} onChange={(value) => onChange('logo', value)} />
            <UploadControl label="Favicon / Icon (Optional)" value={business.favicon} onChange={(value) => onChange('favicon', value)} />
          </div>
        </div>
      </div>
      <div className="space-y-4 xl:col-span-3">
        <BusinessPreviewCard business={business} />
        <ReceiptPreviewCard business={business} receipts={receipts} />
      </div>
    </div>
  );
}
