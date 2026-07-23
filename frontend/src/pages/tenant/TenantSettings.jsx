import { useEffect, useState } from 'react';
import { Bell, Globe2, Lock, Moon, Save } from 'lucide-react';
import { tenantPortalAPI } from '../../services/api';
import { PageHeader, TenantErrorState, TenantLoadingState, TenantPanel } from './TenantPortalUI';

const Toggle = ({ label, checked, onChange }) => (
  <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3">
    <span className="text-sm font-bold text-slate-700">{label}</span>
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
  </label>
);

export default function TenantSettings() {
  const [settings, setSettings] = useState({
    notificationPreferences: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      inAppNotifications: true
    },
    tenantSettings: {
      theme: 'light',
      language: 'English',
      paymentReminders: {
        enabled: true,
        timing: '3_days',
        channels: { email: true, sms: false, whatsapp: false }
      }
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadSettings = async () => {
      try {
        setLoading(true);
        const response = await tenantPortalAPI.getSettings();
        if (!cancelled) {
          setSettings((current) => ({
            notificationPreferences: {
              ...current.notificationPreferences,
              ...(response.data?.notificationPreferences || {})
            },
            tenantSettings: {
              ...current.tenantSettings,
              ...(response.data?.tenantSettings || {}),
              paymentReminders: {
                ...current.tenantSettings.paymentReminders,
                ...(response.data?.tenantSettings?.paymentReminders || {}),
                channels: {
                  ...current.tenantSettings.paymentReminders.channels,
                  ...(response.data?.tenantSettings?.paymentReminders?.channels || {})
                }
              }
            }
          }));
          setError('');
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError?.response?.data?.message || 'Unable to load settings.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateNotifications = (key, value) => {
    setSettings((current) => ({
      ...current,
      notificationPreferences: { ...current.notificationPreferences, [key]: value }
    }));
  };

  const updateTenantSettings = (key, value) => {
    setSettings((current) => ({
      ...current,
      tenantSettings: { ...current.tenantSettings, [key]: value }
    }));
  };

  const updateReminder = (key, value) => {
    setSettings((current) => ({
      ...current,
      tenantSettings: {
        ...current.tenantSettings,
        paymentReminders: { ...current.tenantSettings.paymentReminders, [key]: value }
      }
    }));
  };

  const updateReminderChannel = (key, value) => {
    setSettings((current) => ({
      ...current,
      tenantSettings: {
        ...current.tenantSettings,
        paymentReminders: {
          ...current.tenantSettings.paymentReminders,
          channels: { ...current.tenantSettings.paymentReminders.channels, [key]: value }
        }
      }
    }));
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      const response = await tenantPortalAPI.updateSettings(settings);
      setMessage(response.data?.message || 'Settings saved successfully');
      setError('');
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <TenantLoadingState message="Loading settings..." />;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader
        title="Settings"
        subtitle="Manage notification preferences, theme, language, and payment reminders."
        action={(
          <button type="button" onClick={saveSettings} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        )}
      />

      {error && <TenantErrorState message={error} />}
      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</div>}

      <section className="grid gap-5 lg:grid-cols-2">
        <TenantPanel title="Notification Preferences">
          <div className="grid gap-3 p-5">
            <Toggle label="Email Notifications" checked={settings.notificationPreferences.emailNotifications} onChange={(value) => updateNotifications('emailNotifications', value)} />
            <Toggle label="SMS Notifications" checked={settings.notificationPreferences.smsNotifications} onChange={(value) => updateNotifications('smsNotifications', value)} />
            <Toggle label="Push Notifications" checked={settings.notificationPreferences.pushNotifications} onChange={(value) => updateNotifications('pushNotifications', value)} />
            <Toggle label="In-app Notifications" checked={settings.notificationPreferences.inAppNotifications} onChange={(value) => updateNotifications('inAppNotifications', value)} />
          </div>
        </TenantPanel>

        <TenantPanel title="Theme">
          <div className="grid gap-3 p-5 sm:grid-cols-3">
            {['light', 'dark', 'system'].map((theme) => (
              <button
                key={theme}
                type="button"
                onClick={() => updateTenantSettings('theme', theme)}
                className={`rounded-xl border px-4 py-4 text-left text-sm font-black capitalize ${settings.tenantSettings.theme === theme ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
              >
                <Moon className="mb-3 h-5 w-5" />
                {theme}
              </button>
            ))}
          </div>
        </TenantPanel>
      </section>

      <TenantPanel title="Language">
        <div className="p-5">
          <label className="block max-w-xl">
            <span className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700">
              <Globe2 className="h-4 w-4 text-blue-600" />
              Language
            </span>
            <select value={settings.tenantSettings.language} onChange={(event) => updateTenantSettings('language', event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500">
              <option value="English">English</option>
            </select>
          </label>
        </div>
      </TenantPanel>

      <TenantPanel title="Payment Reminders">
        <div className="grid gap-5 p-5 lg:grid-cols-2">
          <div className="space-y-3">
            <Toggle label="Remind me before due date" checked={settings.tenantSettings.paymentReminders.enabled} onChange={(value) => updateReminder('enabled', value)} />
            <label className="block rounded-xl border border-slate-200 bg-white px-4 py-3">
              <span className="mb-2 block text-sm font-bold text-slate-700">Reminder Timing</span>
              <select value={settings.tenantSettings.paymentReminders.timing} onChange={(event) => updateReminder('timing', event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500">
                <option value="1_day">1 day before</option>
                <option value="3_days">3 days before</option>
                <option value="7_days">7 days before</option>
              </select>
            </label>
          </div>
          <div className="space-y-3">
            <Toggle label="Send reminder via Email" checked={settings.tenantSettings.paymentReminders.channels.email} onChange={(value) => updateReminderChannel('email', value)} />
            <Toggle label="Send reminder via SMS" checked={settings.tenantSettings.paymentReminders.channels.sms} onChange={(value) => updateReminderChannel('sms', value)} />
            <Toggle label="Send reminder via WhatsApp" checked={settings.tenantSettings.paymentReminders.channels.whatsapp} onChange={(value) => updateReminderChannel('whatsapp', value)} />
          </div>
        </div>
      </TenantPanel>

      <TenantPanel title="Privacy and Security">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-blue-600">
              <Lock className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-black text-slate-950">Password and account security</p>
              <p className="text-sm font-medium text-slate-500">Change your password from your profile page.</p>
            </div>
          </div>
          <a href="/tenant/profile" className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-black text-blue-600 hover:bg-blue-50">Open Profile</a>
        </div>
      </TenantPanel>
    </div>
  );
}
