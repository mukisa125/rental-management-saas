import { useCallback, useEffect, useMemo, useState } from 'react';
import { selfOwnerAPI } from '../../services/api';
import SaveButton from './SaveButton';
import SettingsTabs from './SettingsTabs';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';
import SuccessToast from './SuccessToast';
import ProfileSettingsTab from './ProfileSettingsTab';
import BusinessSettingsTab from './BusinessSettingsTab';
import PaymentSettingsTab from './PaymentSettingsTab';
import ReceiptInvoiceSettingsTab from './ReceiptInvoiceSettingsTab';
import NotificationSettingsTab from './NotificationSettingsTab';
import RentLeaseSettingsTab from './RentLeaseSettingsTab';
import DocumentSettingsTab from './DocumentSettingsTab';
import SecuritySettingsTab from './SecuritySettingsTab';
import SubscriptionSettingsTab from './SubscriptionSettingsTab';
import PreferencesSettingsTab from './PreferencesSettingsTab';
import { defaultSettingsState, settingsTabs } from './settingsUtils';

const mergeSettings = (incoming = {}) => ({
  ...defaultSettingsState,
  ...incoming,
  profile: { ...defaultSettingsState.profile, ...(incoming.profile || {}) },
  business: { ...defaultSettingsState.business, ...(incoming.business || {}) },
  payments: { ...defaultSettingsState.payments, ...(incoming.payments || {}) },
  receiptsInvoices: { ...defaultSettingsState.receiptsInvoices, ...(incoming.receiptsInvoices || incoming.receipts || {}) },
  notifications: { ...defaultSettingsState.notifications, ...(incoming.notifications || {}) },
  rentLease: { ...defaultSettingsState.rentLease, ...(incoming.rentLease || incoming['rent-lease'] || {}) },
  documents: { ...defaultSettingsState.documents, ...(incoming.documents || {}) },
  security: { ...defaultSettingsState.security, ...(incoming.security || {}) },
  subscriptionSnapshot: { ...defaultSettingsState.subscriptionSnapshot, ...(incoming.subscriptionSnapshot || {}) },
  preferences: { ...defaultSettingsState.preferences, ...(incoming.preferences || {}) }
});

const saveMap = {
  profile: (payload) => selfOwnerAPI.updateSettingsProfile(payload),
  business: (payload) => selfOwnerAPI.updateSettingsBusiness(payload),
  payments: (payload) => selfOwnerAPI.updateSettingsPayments(payload),
  receipts: (payload) => selfOwnerAPI.updateSettingsReceipts(payload),
  notifications: (payload) => selfOwnerAPI.updateSettingsNotifications(payload),
  rentLease: (payload) => selfOwnerAPI.updateSettingsRentLease(payload),
  documents: (payload) => selfOwnerAPI.updateSettingsDocuments(payload),
  security: (payload) => selfOwnerAPI.updateSettingsSecurity(payload),
  preferences: (payload) => selfOwnerAPI.updateSettingsPreferences(payload)
};

export default function SelfOwnerSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [settings, setSettings] = useState(defaultSettingsState);
  const [warnings, setWarnings] = useState({ whatsappApiNotConfigured: false });
  const [usage, setUsage] = useState({});
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loginActivity, setLoginActivity] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [documentStorage, setDocumentStorage] = useState({ generatedDocuments: 0, uploadedDocuments: 0 });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await selfOwnerAPI.getSettings();
      const payload = response?.data || {};
      setSettings(mergeSettings(payload.settings));
      setWarnings(payload.warnings || { whatsappApiNotConfigured: false });
      setUsage(payload.usage || {});
      setPaymentHistory(payload.paymentHistory || []);
      setLoginActivity(payload.loginActivity || []);
      setActiveSessions(payload.activeSessions || []);
      setDocumentStorage(payload.documentStorage || { generatedDocuments: 0, uploadedDocuments: 0 });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadSettings();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadSettings]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(() => setSuccess(''), 2600);
    return () => clearTimeout(timer);
  }, [success]);

  const savePayload = useMemo(() => {
    if (activeTab === 'profile') return settings.profile;
    if (activeTab === 'business') return settings.business;
    if (activeTab === 'payments') return settings.payments;
    if (activeTab === 'receipts') return settings.receiptsInvoices;
    if (activeTab === 'notifications') return settings.notifications;
    if (activeTab === 'rentLease') return settings.rentLease;
    if (activeTab === 'documents') return settings.documents;
    if (activeTab === 'security') return settings.security;
    if (activeTab === 'preferences') return settings.preferences;
    return null;
  }, [activeTab, settings]);

  const updateSection = (section, field, value) => {
    setSettings((previous) => ({ ...previous, [section]: { ...(previous[section] || {}), [field]: value } }));
  };

  const handleSave = async () => {
    const saveAction = saveMap[activeTab];
    if (!saveAction || !savePayload) return;
    setSaving(true);
    setError('');
    try {
      await saveAction(savePayload);
      setSuccess('Settings saved successfully');
      if (activeTab === 'profile') {
        await loadSettings();
      }
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    setUpdatingPassword(true);
    setError('');
    try {
      await selfOwnerAPI.updateSettingsPassword(passwordForm);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
      setSuccess('Password updated successfully');
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || 'Failed to update password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setError('');
    try {
      await selfOwnerAPI.deleteSelfOwnerAccount({ confirmation: 'DELETE' });
      setSuccess('Account deactivated successfully');
    } catch (requestError) {
      setError(requestError?.response?.data?.message || requestError.message || 'Failed to deactivate account');
    }
  };

  if (loading) return <LoadingState />;
  if (error && !settings?.profile?.accountId) return <ErrorState message={error} onRetry={loadSettings} />;

  return (
    <div className="min-h-screen space-y-4 bg-slate-50 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Settings</h1>
          <p className="mt-1 text-sm text-slate-600">Manage your account, business, payments, notifications, and preferences.</p>
        </div>
        <SaveButton onClick={handleSave} loading={saving} disabled={!saveMap[activeTab]} label={saveMap[activeTab] ? 'Save Changes' : 'No Save Required'} />
      </header>

      {error ? <ErrorState message={error} onRetry={loadSettings} /> : null}
      <SettingsTabs tabs={settingsTabs} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === 'profile' ? (
        <ProfileSettingsTab
          data={settings.profile}
          onChange={(field, value) => updateSection('profile', field, value)}
          onDeleteAccount={handleDeleteAccount}
        />
      ) : null}
      {activeTab === 'business' ? (
        <BusinessSettingsTab
          business={settings.business}
          receipts={settings.receiptsInvoices}
          onChange={(field, value) => updateSection('business', field, value)}
        />
      ) : null}
      {activeTab === 'payments' ? (
        <PaymentSettingsTab data={settings.payments} onChange={(field, value) => updateSection('payments', field, value)} />
      ) : null}
      {activeTab === 'receipts' ? (
        <ReceiptInvoiceSettingsTab
          data={settings.receiptsInvoices}
          business={settings.business}
          onChange={(field, value) => updateSection('receiptsInvoices', field, value)}
        />
      ) : null}
      {activeTab === 'notifications' ? (
        <NotificationSettingsTab
          data={settings.notifications}
          warnings={warnings}
          onChange={(field, value) => updateSection('notifications', field, value)}
        />
      ) : null}
      {activeTab === 'rentLease' ? (
        <RentLeaseSettingsTab data={settings.rentLease} onChange={(field, value) => updateSection('rentLease', field, value)} />
      ) : null}
      {activeTab === 'documents' ? (
        <DocumentSettingsTab
          data={settings.documents}
          storage={documentStorage}
          onChange={(field, value) => updateSection('documents', field, value)}
        />
      ) : null}
      {activeTab === 'security' ? (
        <SecuritySettingsTab
          data={settings.security}
          passwordForm={passwordForm}
          onSecurityChange={(field, value) => updateSection('security', field, value)}
          onPasswordChange={(field, value) => setPasswordForm((previous) => ({ ...previous, [field]: value }))}
          onUpdatePassword={handleUpdatePassword}
          loginActivity={loginActivity}
          activeSessions={activeSessions}
          updatingPassword={updatingPassword}
        />
      ) : null}
      {activeTab === 'subscription' ? (
        <SubscriptionSettingsTab subscription={settings.subscriptionSnapshot} usage={usage} paymentHistory={paymentHistory} />
      ) : null}
      {activeTab === 'preferences' ? (
        <PreferencesSettingsTab
          data={settings.preferences}
          onChange={(field, value) => updateSection('preferences', field, value)}
          onReset={() => setSettings((previous) => ({ ...previous, preferences: defaultSettingsState.preferences }))}
        />
      ) : null}

      <SuccessToast message={success} />
    </div>
  );
}
