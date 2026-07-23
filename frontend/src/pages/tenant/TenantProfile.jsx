import { useEffect, useState } from 'react';
import { Camera, Lock, Save, UserRound } from 'lucide-react';
import { tenantPortalAPI } from '../../services/api';
import {
  PageHeader,
  resolveAvatar,
  safeText,
  TenantErrorState,
  TenantLoadingState,
  TenantPanel
} from './TenantPortalUI';

export default function TenantProfile() {
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    whatsAppNumber: '',
    avatar: '',
    idNumber: '',
    emergencyContact: { name: '', phone: '', relationship: '' }
  });
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadProfile = async () => {
      try {
        setLoading(true);
        const response = await tenantPortalAPI.getProfile();
        const user = response.data?.user || {};
        const tenant = response.data?.tenant || {};
        if (!cancelled) {
          setProfile({
            fullName: tenant.fullName || user.name || '',
            email: tenant.email || user.email || '',
            phone: tenant.phone || user.phone || '',
            whatsAppNumber: user.whatsAppNumber || '',
            avatar: user.avatar || tenant.photo?.base64 || '',
            idNumber: tenant.idNumber || '',
            emergencyContact: {
              name: tenant.emergencyContact?.name || '',
              phone: tenant.emergencyContact?.phone || '',
              relationship: tenant.emergencyContact?.relationship || ''
            }
          });
          setError('');
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError?.response?.data?.message || 'Unable to load profile.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = (key, value) => setProfile((current) => ({ ...current, [key]: value }));
  const updateEmergency = (key, value) => setProfile((current) => ({
    ...current,
    emergencyContact: { ...current.emergencyContact, [key]: value }
  }));

  const handleAvatarUpload = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateField('avatar', String(reader.result || ''));
    reader.onerror = () => setError('Unable to read selected image.');
    reader.readAsDataURL(file);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (password.newPassword && password.newPassword !== password.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        ...profile,
        name: profile.fullName,
        ...(password.newPassword ? {
          currentPassword: password.currentPassword,
          newPassword: password.newPassword
        } : {})
      };
      const response = await tenantPortalAPI.updateProfile(payload);
      setMessage(response.data?.message || 'Profile updated successfully');
      setError('');
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to save profile.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <TenantLoadingState message="Loading profile..." />;

  return (
    <form onSubmit={saveProfile} className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader
        title="Profile"
        subtitle="Manage your personal details and password."
        action={(
          <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      />

      {error && <TenantErrorState message={error} />}
      {message && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</div>}

      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.9fr]">
        <TenantPanel title="Personal Information">
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <div className="sm:col-span-2 flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              {resolveAvatar(profile.avatar) ? (
                <img src={resolveAvatar(profile.avatar)} alt={profile.fullName || 'Tenant'} className="h-20 w-20 rounded-full border border-slate-200 object-cover" />
              ) : (
                <span className="grid h-20 w-20 place-items-center rounded-full bg-blue-50 text-blue-600">
                  <UserRound className="h-9 w-9" />
                </span>
              )}
              <div>
                <p className="text-sm font-black text-slate-950">{safeText(profile.fullName, 'Tenant')}</p>
                <p className="mt-1 text-sm font-medium text-slate-500">{safeText(profile.email)}</p>
                <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">
                  <Camera className="h-4 w-4" />
                  Change Photo
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                </label>
              </div>
            </div>

            <Input label="Full Name" value={profile.fullName} onChange={(value) => updateField('fullName', value)} />
            <Input label="Email Address" type="email" value={profile.email} onChange={(value) => updateField('email', value)} />
            <Input label="Phone Number" value={profile.phone} onChange={(value) => updateField('phone', value)} />
            <Input label="WhatsApp Number" value={profile.whatsAppNumber} onChange={(value) => updateField('whatsAppNumber', value)} />
            <Input label="National ID / Passport Number" value={profile.idNumber} onChange={(value) => updateField('idNumber', value)} />
            <Input label="Emergency Contact Name" value={profile.emergencyContact.name} onChange={(value) => updateEmergency('name', value)} />
            <Input label="Emergency Contact Phone" value={profile.emergencyContact.phone} onChange={(value) => updateEmergency('phone', value)} />
            <Input label="Emergency Contact Relationship" value={profile.emergencyContact.relationship} onChange={(value) => updateEmergency('relationship', value)} />
          </div>
        </TenantPanel>

        <TenantPanel title="Change Password">
          <div className="space-y-4 p-5">
            <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <Lock className="h-5 w-5 text-blue-600" />
              <p className="text-sm font-semibold text-slate-600">Leave password fields empty to keep your current password.</p>
            </div>
            <Input label="Current Password" type="password" value={password.currentPassword} onChange={(value) => setPassword((current) => ({ ...current, currentPassword: value }))} />
            <Input label="New Password" type="password" value={password.newPassword} onChange={(value) => setPassword((current) => ({ ...current, newPassword: value }))} />
            <Input label="Confirm New Password" type="password" value={password.confirmPassword} onChange={(value) => setPassword((current) => ({ ...current, confirmPassword: value }))} />
          </div>
        </TenantPanel>
      </section>

      <TenantPanel title="Rental Assignment">
        <div className="p-5 text-sm font-medium leading-6 text-slate-600">
          Your property, unit assignment, lease rent, and landlord link are controlled by your landlord. Contact your landlord if these details need to change.
        </div>
      </TenantPanel>
    </form>
  );
}

function Input({ label, value, onChange, type = 'text' }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-slate-700">{label}</span>
      <input
        type={type}
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
      />
    </label>
  );
}
