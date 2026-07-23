import FormField from './FormField';
import ToggleSwitch from './ToggleSwitch';

const alertKeys = [
  ['rentPaymentAlerts', 'Rent Payment Alerts'],
  ['overdueRentAlerts', 'Overdue Rent Alerts'],
  ['maintenanceRequestAlerts', 'Maintenance Request Alerts'],
  ['leaseExpiryAlerts', 'Lease Expiry Alerts'],
  ['tenantRegistrationAlerts', 'Tenant Registration Alerts'],
  ['documentExpiryAlerts', 'Document Expiry Alerts'],
  ['invoiceGeneratedAlerts', 'Invoice Generated Alerts'],
  ['failedPaymentAlerts', 'Failed Payment Alerts']
];

export default function NotificationSettingsTab({ data, warnings, onChange }) {
  return (
    <div className="space-y-4">
      {!warnings?.whatsappApiNotConfigured ? null : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
          WhatsApp API not configured. Preference can still be saved.
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Notification Channels</h3>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <ToggleSwitch label="Email Notifications" checked={data.emailNotifications} onChange={(value) => onChange('emailNotifications', value)} />
          <ToggleSwitch label="SMS Notifications" checked={data.smsNotifications} onChange={(value) => onChange('smsNotifications', value)} />
          <ToggleSwitch label="WhatsApp Notifications" checked={data.whatsappNotifications} onChange={(value) => onChange('whatsappNotifications', value)} />
          <ToggleSwitch label="In-App Notifications" checked={data.inAppNotifications} onChange={(value) => onChange('inAppNotifications', value)} />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <FormField label="WhatsApp Number" value={data.whatsappNumber} onChange={(value) => onChange('whatsappNumber', value)} />
          <FormField label="Notification Email" type="email" value={data.notificationEmail} onChange={(value) => onChange('notificationEmail', value)} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Alert Preferences</h3>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          {alertKeys.map(([key, label]) => (
            <ToggleSwitch key={key} label={label} checked={data[key]} onChange={(value) => onChange(key, value)} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Summary Notifications</h3>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
          <ToggleSwitch label="Daily Summary" checked={data.dailySummary} onChange={(value) => onChange('dailySummary', value)} />
          <ToggleSwitch label="Weekly Summary" checked={data.weeklySummary} onChange={(value) => onChange('weeklySummary', value)} />
          <ToggleSwitch label="Monthly Summary" checked={data.monthlySummary} onChange={(value) => onChange('monthlySummary', value)} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Property Rules</h3>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Save your property rules notice here. When updated, it is sent to all your active tenants and appears in their notification bell.
        </p>
        <div className="mt-3">
          <FormField
            label="Rules Notice"
            textarea
            value={data.propertyRulesNotice}
            onChange={(value) => onChange('propertyRulesNotice', value)}
            placeholder="Example: Keep common areas clean, no loud music after 10 PM, report maintenance issues immediately."
          />
        </div>
      </div>
    </div>
  );
}
