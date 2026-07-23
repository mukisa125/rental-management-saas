import FormField from './FormField';
import ToggleSwitch from './ToggleSwitch';
import { formatDateTime, safeText } from './settingsUtils';

export default function SecuritySettingsTab({
  data,
  passwordForm,
  onSecurityChange,
  onPasswordChange,
  onUpdatePassword,
  loginActivity,
  activeSessions,
  updatingPassword
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Change Password</h3>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          <FormField label="Current Password" type="password" value={passwordForm.currentPassword} onChange={(value) => onPasswordChange('currentPassword', value)} />
          <FormField label="New Password" type="password" value={passwordForm.newPassword} onChange={(value) => onPasswordChange('newPassword', value)} />
          <FormField label="Confirm New Password" type="password" value={passwordForm.confirmNewPassword} onChange={(value) => onPasswordChange('confirmNewPassword', value)} />
        </div>
        <button
          type="button"
          onClick={onUpdatePassword}
          disabled={updatingPassword}
          className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
        >
          {updatingPassword ? 'Updating...' : 'Update Password'}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Two-Factor Authentication</h3>
        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
          <ToggleSwitch label="Status: Enabled / Disabled" checked={data.twoFactorEnabled} onChange={(value) => onSecurityChange('twoFactorEnabled', value)} />
          <FormField label="Session Timeout (Minutes)" type="number" min={5} max={1440} value={data.sessionTimeoutMinutes} onChange={(value) => onSecurityChange('sessionTimeoutMinutes', Number(value) || 60)} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Login Activity</h3>
        {!loginActivity.length ? (
          <p className="mt-3 text-xs text-slate-500">No login activity available.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {loginActivity.map((item, index) => (
              <div key={`${item.dateTime}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                <p><span className="font-semibold text-slate-700">Device:</span> {safeText(item.device)}</p>
                <p><span className="font-semibold text-slate-700">Location:</span> {safeText(item.location)}</p>
                <p><span className="font-semibold text-slate-700">Date/Time:</span> {formatDateTime(item.dateTime)}</p>
                <p><span className="font-semibold text-slate-700">Status:</span> {safeText(item.status)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Active Sessions</h3>
        <div className="mt-3 space-y-2">
          {(activeSessions || []).map((session, index) => (
            <div key={`${session.label}-${index}`} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              <span>{safeText(session.label)}</span>
              <span className={`rounded-full px-2 py-0.5 font-semibold ${session.current ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                {session.current ? 'Current Session' : safeText(session.status, 'Active')}
              </span>
            </div>
          ))}
        </div>
        <button type="button" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
          Logout from all devices
        </button>
      </div>
    </div>
  );
}
