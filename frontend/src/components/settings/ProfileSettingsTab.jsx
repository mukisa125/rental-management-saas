import { useState } from 'react';
import { AlertTriangle, Trash2, Upload } from 'lucide-react';
import FormField from './FormField';
import AccountSummaryCard from './AccountSummaryCard';
import { fileToDataUrl, safeText } from './settingsUtils';

const acceptedImageTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export default function ProfileSettingsTab({ data, onChange, onDeleteAccount }) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [uploadError, setUploadError] = useState('');

  const handlePhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!acceptedImageTypes.has(file.type.toLowerCase())) {
      setUploadError('Only JPG, PNG, or WEBP images are allowed.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Profile photo must be 2MB or smaller.');
      return;
    }
    const encoded = await fileToDataUrl(file);
    onChange('profilePhoto', encoded);
    setUploadError('');
  };

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-10">
      <div className="space-y-4 xl:col-span-7">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <FormField label="Owner / Full Name" value={data.fullName} onChange={(value) => onChange('fullName', value)} />
            <FormField label="Email Address" type="email" value={data.email} onChange={(value) => onChange('email', value)} />
            <FormField label="Phone Number" value={data.phone} onChange={(value) => onChange('phone', value)} />
            <FormField label="WhatsApp Number" value={data.whatsappNumber} onChange={(value) => onChange('whatsappNumber', value)} />
            <FormField label="Account ID" value={safeText(data.accountId)} readOnly />
            <FormField label="Role" value={safeText(data.role)} readOnly />
            <FormField label="Account Status" value={safeText(data.accountStatus)} readOnly />
            <FormField label="Member Since" value={safeText(data.memberSince ? new Date(data.memberSince).toLocaleDateString('en-UG') : '-')} readOnly />
            <FormField label="Last Login" value={safeText(data.lastLogin ? new Date(data.lastLogin).toLocaleString('en-UG') : '-')} readOnly />
          </div>
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profile Photo</p>
            <div className="mt-2 flex items-center gap-3">
              {data.profilePhoto ? (
                <img src={data.profilePhoto} alt="Profile preview" className="h-14 w-14 rounded-full border border-slate-200 object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                  {safeText(data.fullName, 'S').charAt(0).toUpperCase()}
                </div>
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                <Upload className="h-3.5 w-3.5" />
                Upload
                <input type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handlePhoto} />
              </label>
              <button type="button" onClick={() => onChange('profilePhoto', '')} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50">
                Remove
              </button>
            </div>
            {uploadError ? <p className="mt-2 text-xs font-semibold text-rose-600">{uploadError}</p> : null}
          </div>
        </div>
      </div>

      <div className="space-y-4 xl:col-span-3">
        <AccountSummaryCard profile={data} />
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
          <h3 className="text-sm font-bold text-rose-700">Danger Zone</h3>
          <p className="mt-2 text-xs text-rose-700">Deleting/deactivating your account will immediately block access to your workspace.</p>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Account
          </button>
        </div>
      </div>

      {deleteOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-sm font-bold text-slate-900">Confirm Account Deletion</p>
                <p className="mt-1 text-xs text-slate-600">Type <span className="font-bold">DELETE</span> to continue.</p>
              </div>
            </div>
            <input
              className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              value={deleteText}
              onChange={(event) => setDeleteText(event.target.value)}
              placeholder="DELETE"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteOpen(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">Cancel</button>
              <button
                type="button"
                disabled={deleteText !== 'DELETE'}
                onClick={() => {
                  onDeleteAccount();
                  setDeleteOpen(false);
                }}
                className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
