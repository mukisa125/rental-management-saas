import ToggleSwitch from './ToggleSwitch';
import FormField from './FormField';
import { safeText } from './settingsUtils';

const docAutoKeys = [
  ['autoGeneratePaymentReceipts', 'Auto-generate Payment Receipts'],
  ['autoGenerateTenantProfileDocuments', 'Auto-generate Tenant Profile Documents'],
  ['autoGeneratePropertyProfileDocuments', 'Auto-generate Property Profile Documents'],
  ['autoGenerateUnitProfileDocuments', 'Auto-generate Unit Profile Documents'],
  ['autoGenerateMaintenanceApprovalDocuments', 'Auto-generate Maintenance Approval Documents'],
  ['autoGenerateMaintenanceCompletionDocuments', 'Auto-generate Maintenance Completion Documents'],
  ['autoGenerateMonthlyAssessmentReports', 'Auto-generate Monthly Assessment Reports'],
  ['autoGenerateLeaseDocuments', 'Auto-generate Lease Documents']
];

export default function DocumentSettingsTab({ data, storage, onChange }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-10">
      <div className="space-y-4 xl:col-span-7">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Document Generation</h3>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            {docAutoKeys.map(([key, label]) => (
              <ToggleSwitch key={key} label={label} checked={data[key]} onChange={(value) => onChange(key, value)} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Upload & Access</h3>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <ToggleSwitch label="Allow Tenant Document Uploads" checked={data.allowTenantDocumentUploads} onChange={(value) => onChange('allowTenantDocumentUploads', value)} />
            <ToggleSwitch label="Allow Tenant Maintenance Image Uploads" checked={data.allowTenantMaintenanceImageUploads} onChange={(value) => onChange('allowTenantMaintenanceImageUploads', value)} />
            <ToggleSwitch label="Show Documents to Tenant" checked={data.showDocumentsToTenant} onChange={(value) => onChange('showDocumentsToTenant', value)} />
            <ToggleSwitch label="Require Approval Before Tenant Documents Are Accepted" checked={data.requireApprovalBeforeTenantDocumentAcceptance} onChange={(value) => onChange('requireApprovalBeforeTenantDocumentAcceptance', value)} />
            <ToggleSwitch label="Document Expiry Reminders" checked={data.documentExpiryReminders} onChange={(value) => onChange('documentExpiryReminders', value)} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Document Security</h3>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <ToggleSwitch label="Watermark Documents" checked={data.watermarkDocuments} onChange={(value) => onChange('watermarkDocuments', value)} />
            <ToggleSwitch label="Prevent Document Download by Tenant" checked={data.preventDocumentDownloadByTenant} onChange={(value) => onChange('preventDocumentDownloadByTenant', value)} />
            <ToggleSwitch label="Encrypt Sensitive Documents (if supported)" checked={data.encryptSensitiveDocuments} onChange={(value) => onChange('encryptSensitiveDocuments', value)} />
            <FormField label="Send Expiry Reminder Before Days" type="number" min={1} value={data.sendExpiryReminderBeforeDays} onChange={(value) => onChange('sendExpiryReminderBeforeDays', Number(value) || 1)} />
          </div>
        </div>
      </div>
      <div className="xl:col-span-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Document Storage</h3>
          <div className="mt-3 space-y-2 text-xs text-slate-600">
            <p><span className="font-semibold text-slate-700">Generated Documents:</span> {safeText(storage?.generatedDocuments, '0')}</p>
            <p><span className="font-semibold text-slate-700">Uploaded Documents:</span> {safeText(storage?.uploadedDocuments, '0')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
