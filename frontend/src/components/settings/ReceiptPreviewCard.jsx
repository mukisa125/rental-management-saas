import { formatMoney, safeText } from './settingsUtils';

export default function ReceiptPreviewCard({ business, receipts }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900">Live Receipt Preview</h3>
      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
        <p className="font-bold text-slate-900">{safeText(business?.businessName, 'Your Business Name')}</p>
        <p>{safeText(business?.address, 'Business Address')}</p>
        <p>{safeText(business?.phone, 'Phone')} · {safeText(business?.email, 'Email')}</p>
        <hr className="my-2 border-slate-200" />
        <p><span className="font-semibold">Receipt:</span> {safeText(receipts?.receiptPrefix, 'RCPT')}-0001</p>
        <p><span className="font-semibold">Date:</span> {new Date().toLocaleDateString('en-UG')}</p>
        <p><span className="font-semibold">Tenant:</span> Sample Tenant</p>
        <p><span className="font-semibold">Property:</span> Sample Property / Unit A1</p>
        <p><span className="font-semibold">Payment For:</span> Monthly Rent</p>
        <p><span className="font-semibold">Amount:</span> {formatMoney(750000, 'UGX')}</p>
        <p><span className="font-semibold">Balance:</span> {receipts?.showBalanceOnReceipt ? formatMoney(0, 'UGX') : 'Hidden'}</p>
        <p><span className="font-semibold">QR:</span> {receipts?.showQrVerificationCode ? '[QR Placeholder]' : 'Disabled'}</p>
        <p className="mt-2 text-slate-500">{safeText(receipts?.receiptFooterMessage, 'Thank you for your payment.')}</p>
      </div>
    </div>
  );
}
