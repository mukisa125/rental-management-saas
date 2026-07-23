import FormField from './FormField';
import ToggleSwitch from './ToggleSwitch';
import { safeText } from './settingsUtils';

export default function RentLeaseSettingsTab({ data, onChange }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-10">
      <div className="space-y-4 xl:col-span-7">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Rent Settings</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <FormField label="Default Rent Due Day" type="number" min={1} max={31} value={data.defaultRentDueDay} onChange={(value) => onChange('defaultRentDueDay', Number(value) || 1)} />
            <FormField label="Grace Period in Days" type="number" min={0} value={data.gracePeriodDays} onChange={(value) => onChange('gracePeriodDays', Number(value) || 0)} />
            <FormField label="Late Payment Fee" type="number" min={0} value={data.latePaymentFee} onChange={(value) => onChange('latePaymentFee', Number(value) || 0)} />
            <FormField
              label="Late Fee Type"
              value={data.latePaymentFeeType}
              onChange={(value) => onChange('latePaymentFeeType', value)}
              options={[{ value: 'fixed', label: 'Fixed' }, { value: 'percentage', label: 'Percentage' }]}
            />
            <FormField label="Default Currency" value={data.defaultCurrency} onChange={(value) => onChange('defaultCurrency', value)} />
            <FormField label="Security Deposit Amount/Months" type="number" min={0} value={data.securityDepositValue} onChange={(value) => onChange('securityDepositValue', Number(value) || 0)} />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <ToggleSwitch label="Auto Mark Overdue Rent" checked={data.autoMarkOverdueRent} onChange={(value) => onChange('autoMarkOverdueRent', value)} />
            <ToggleSwitch label="Allow Partial Payments" checked={data.allowPartialPayments} onChange={(value) => onChange('allowPartialPayments', value)} />
            <ToggleSwitch label="Allow Advance Payments" checked={data.allowAdvancePayments} onChange={(value) => onChange('allowAdvancePayments', value)} />
            <ToggleSwitch label="Security Deposit Required" checked={data.securityDepositRequired} onChange={(value) => onChange('securityDepositRequired', value)} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Lease Settings</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <FormField label="Default Lease Duration (Months)" type="number" min={1} value={data.defaultLeaseDurationMonths} onChange={(value) => onChange('defaultLeaseDurationMonths', Number(value) || 1)} />
            <FormField label="Lease Expiry Reminder (Days)" type="number" min={1} value={data.leaseExpiryReminderDays} onChange={(value) => onChange('leaseExpiryReminderDays', Number(value) || 1)} />
            <div className="md:col-span-2">
              <FormField label="Default Move-in Checklist" textarea value={data.defaultMoveInChecklist} onChange={(value) => onChange('defaultMoveInChecklist', value)} />
            </div>
            <div className="md:col-span-2">
              <FormField label="Default Move-out Checklist" textarea value={data.defaultMoveOutChecklist} onChange={(value) => onChange('defaultMoveOutChecklist', value)} />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <ToggleSwitch label="Auto-generate Lease Documents" checked={data.autoGenerateLeaseDocuments} onChange={(value) => onChange('autoGenerateLeaseDocuments', value)} />
            <ToggleSwitch label="Require Tenant ID Before Lease" checked={data.requireTenantIdBeforeLease} onChange={(value) => onChange('requireTenantIdBeforeLease', value)} />
            <ToggleSwitch label="Require LC Letter Before Lease" checked={data.requireLcLetterBeforeLease} onChange={(value) => onChange('requireLcLetterBeforeLease', value)} />
          </div>
        </div>
      </div>
      <div className="xl:col-span-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Lease Settings Preview</h3>
          <div className="mt-3 space-y-1 text-xs text-slate-600">
            <p><span className="font-semibold text-slate-700">Rent Due Day:</span> {safeText(data.defaultRentDueDay)}</p>
            <p><span className="font-semibold text-slate-700">Grace Period:</span> {safeText(data.gracePeriodDays)} days</p>
            <p><span className="font-semibold text-slate-700">Lease Duration:</span> {safeText(data.defaultLeaseDurationMonths)} months</p>
            <p><span className="font-semibold text-slate-700">Expiry Reminder:</span> {safeText(data.leaseExpiryReminderDays)} days</p>
            <p><span className="font-semibold text-slate-700">Currency:</span> {safeText(data.defaultCurrency, 'UGX')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
