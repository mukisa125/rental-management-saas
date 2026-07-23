import { safeText } from './settingsUtils';

export default function BusinessPreviewCard({ business }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900">Business Contact Preview</h3>
      <div className="mt-3 space-y-1 text-xs text-slate-600">
        <p><span className="font-semibold text-slate-700">Phone:</span> {safeText(business?.phone)}</p>
        <p><span className="font-semibold text-slate-700">Email:</span> {safeText(business?.email)}</p>
        <p><span className="font-semibold text-slate-700">WhatsApp:</span> {safeText(business?.whatsappNumber)}</p>
        <p><span className="font-semibold text-slate-700">Address:</span> {safeText(business?.address)}</p>
        <p><span className="font-semibold text-slate-700">Working Hours:</span> {safeText(business?.workingHours)}</p>
      </div>
    </div>
  );
}
