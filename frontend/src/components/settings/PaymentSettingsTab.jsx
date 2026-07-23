import FormField from './FormField';
import ToggleSwitch from './ToggleSwitch';

const SectionCard = ({ title, children }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <h3 className="text-sm font-bold text-slate-900">{title}</h3>
    <div className="mt-3 space-y-3">{children}</div>
  </div>
);

export default function PaymentSettingsTab({ data, onChange }) {
  const setMethod = (key, field, value) => onChange(key, { ...(data[key] || {}), [field]: value });

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <SectionCard title="Payment Methods">
        <ToggleSwitch label="Cash" checked={data.cash?.enabled} onChange={(value) => setMethod('cash', 'enabled', value)} />
        <ToggleSwitch label="MTN Mobile Money" checked={data.mtnMobileMoney?.enabled} onChange={(value) => setMethod('mtnMobileMoney', 'enabled', value)} />
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <FormField label="MTN Number" value={data.mtnMobileMoney?.number} onChange={(value) => setMethod('mtnMobileMoney', 'number', value)} />
          <FormField label="MTN Account Name (Optional)" value={data.mtnMobileMoney?.accountName} onChange={(value) => setMethod('mtnMobileMoney', 'accountName', value)} />
        </div>
        <ToggleSwitch label="Airtel Money" checked={data.airtelMoney?.enabled} onChange={(value) => setMethod('airtelMoney', 'enabled', value)} />
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <FormField label="Airtel Number" value={data.airtelMoney?.number} onChange={(value) => setMethod('airtelMoney', 'number', value)} />
          <FormField label="Airtel Account Name (Optional)" value={data.airtelMoney?.accountName} onChange={(value) => setMethod('airtelMoney', 'accountName', value)} />
        </div>
        <ToggleSwitch label="Bank Transfer" checked={data.bankTransfer?.enabled} onChange={(value) => setMethod('bankTransfer', 'enabled', value)} />
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <FormField label="Bank Name" value={data.bankTransfer?.bankName} onChange={(value) => setMethod('bankTransfer', 'bankName', value)} />
          <FormField label="Account Name" value={data.bankTransfer?.accountName} onChange={(value) => setMethod('bankTransfer', 'accountName', value)} />
          <FormField label="Account Number" value={data.bankTransfer?.accountNumber} onChange={(value) => setMethod('bankTransfer', 'accountNumber', value)} />
          <FormField label="Branch (Optional)" value={data.bankTransfer?.branch} onChange={(value) => setMethod('bankTransfer', 'branch', value)} />
        </div>
        <ToggleSwitch label="Card / Online Payment" checked={data.cardOnlinePayment?.enabled} onChange={(value) => setMethod('cardOnlinePayment', 'enabled', value)} />
      </SectionCard>

      <SectionCard title="Payment Preferences">
        <FormField
          label="Default Payment Method"
          value={data.defaultMethod}
          onChange={(value) => onChange('defaultMethod', value)}
          options={[
            { value: 'cash', label: 'Cash' },
            { value: 'mtnMobileMoney', label: 'MTN Mobile Money' },
            { value: 'airtelMoney', label: 'Airtel Money' },
            { value: 'bankTransfer', label: 'Bank Transfer' },
            { value: 'cardOnlinePayment', label: 'Card / Online Payment' }
          ]}
        />
        <ToggleSwitch label="Allow Partial Payments" checked={data.allowPartialPayments} onChange={(value) => onChange('allowPartialPayments', value)} />
        <ToggleSwitch label="Allow Advance Payments" checked={data.allowAdvancePayments} onChange={(value) => onChange('allowAdvancePayments', value)} />
        <FormField label="Payment Grace Period (Days)" type="number" value={data.gracePeriodDays} onChange={(value) => onChange('gracePeriodDays', Number(value) || 0)} min={0} />
        <FormField
          label="Late Payment Fee Type"
          value={data.lateFeeType}
          onChange={(value) => onChange('lateFeeType', value)}
          options={[{ value: 'fixed', label: 'Fixed Amount' }, { value: 'percentage', label: 'Percentage' }]}
        />
        <FormField label="Late Payment Fee Amount" type="number" value={data.lateFeeAmount} onChange={(value) => onChange('lateFeeAmount', Number(value) || 0)} min={0} />
        <ToggleSwitch label="Show Payment Fee Tips" checked={data.showPaymentFeeTips} onChange={(value) => onChange('showPaymentFeeTips', value)} />
        <ToggleSwitch label="Require Payment Reference" checked={data.requirePaymentReference} onChange={(value) => onChange('requirePaymentReference', value)} />
      </SectionCard>
    </div>
  );
}
