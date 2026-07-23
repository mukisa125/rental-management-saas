import { formatDateTime, safeText } from './settingsUtils';

export default function AccountSummaryCard({ profile }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-slate-900">Account Summary</h3>
      <div className="mt-3 space-y-2 text-xs text-slate-600">
        <p><span className="font-semibold text-slate-700">Member Since:</span> {formatDateTime(profile?.memberSince)}</p>
        <p><span className="font-semibold text-slate-700">Last Login:</span> {formatDateTime(profile?.lastLogin)}</p>
        <p><span className="font-semibold text-slate-700">Account Status:</span> {safeText(profile?.accountStatus, 'Active')}</p>
        <p><span className="font-semibold text-slate-700">Role:</span> {safeText(profile?.role, 'self_owner')}</p>
        <p><span className="font-semibold text-slate-700">Account ID:</span> {safeText(profile?.accountId)}</p>
      </div>
    </div>
  );
}
