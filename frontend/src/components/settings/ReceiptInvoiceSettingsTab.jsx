import FormField from './FormField';
import ToggleSwitch from './ToggleSwitch';
import ReceiptPreviewCard from './ReceiptPreviewCard';

export default function ReceiptInvoiceSettingsTab({ data, business, onChange }) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-10">
      <div className="space-y-4 xl:col-span-7">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Receipt Settings</h3>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <FormField label="Receipt Header Name" value={data.receiptHeaderName} onChange={(value) => onChange('receiptHeaderName', value)} />
            <FormField label="Receipt Prefix" value={data.receiptPrefix} onChange={(value) => onChange('receiptPrefix', value)} />
            <FormField label="Invoice Prefix" value={data.invoicePrefix} onChange={(value) => onChange('invoicePrefix', value)} />
            <FormField label="Default Receipt Status" value={data.defaultReceiptStatus} onChange={(value) => onChange('defaultReceiptStatus', value)} />
            <div className="md:col-span-2">
              <FormField label="Receipt Footer Message" textarea value={data.receiptFooterMessage} onChange={(value) => onChange('receiptFooterMessage', value)} />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <ToggleSwitch label="Show QR Verification Code" checked={data.showQrVerificationCode} onChange={(value) => onChange('showQrVerificationCode', value)} />
            <ToggleSwitch label="Show Owner Contact on Receipt" checked={data.showOwnerContactOnReceipt} onChange={(value) => onChange('showOwnerContactOnReceipt', value)} />
            <ToggleSwitch label="Show Balance on Receipt" checked={data.showBalanceOnReceipt} onChange={(value) => onChange('showBalanceOnReceipt', value)} />
            <ToggleSwitch label="Show Signature on Receipt" checked={data.showSignatureOnReceipt} onChange={(value) => onChange('showSignatureOnReceipt', value)} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900">Invoice Settings</h3>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            <ToggleSwitch label="Auto-generate Monthly Invoices" checked={data.autoGenerateMonthlyInvoices} onChange={(value) => onChange('autoGenerateMonthlyInvoices', value)} />
            <FormField label="Invoice Due Day" type="number" value={data.invoiceDueDay} onChange={(value) => onChange('invoiceDueDay', Number(value) || 1)} min={1} max={31} />
            <ToggleSwitch label="Show Tenant Balance" checked={data.showTenantBalance} onChange={(value) => onChange('showTenantBalance', value)} />
            <ToggleSwitch label="Show Payment Instructions" checked={data.showPaymentInstructions} onChange={(value) => onChange('showPaymentInstructions', value)} />
          </div>
        </div>
      </div>
      <div className="xl:col-span-3">
        <ReceiptPreviewCard business={business} receipts={data} />
      </div>
    </div>
  );
}
