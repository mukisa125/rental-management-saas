import { useState } from 'react';
import { Plus } from 'lucide-react';
import SuperAdminTablePage from '../../components/super-admin/SuperAdminTablePage';
import api from '../../services/api';
import { showToast } from '../../utils/toast';

const initialForm = {
  companyName: '',
  ownerName: '',
  email: '',
  password: '',
  phone: '',
  address: ''
};

const SuperAdminLandlords = () => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [createdLogin, setCreatedLogin] = useState(null);

  const closeDialog = () => {
    setShowAddDialog(false);
    setSaving(false);
    setForm(initialForm);
    setCreatedLogin(null);
  };

  const handleCreateLandlord = async (event) => {
    event.preventDefault();
    if (!form.companyName.trim() || !form.ownerName.trim() || !form.email.trim() || !form.password.trim()) {
      showToast('Please fill in company, owner name, email, and password', 'error');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        companyName: form.companyName.trim(),
        ownerName: form.ownerName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.phone.trim(),
        address: form.address.trim(),
        role: 'self_owner'
      };
      const registerResponse = await api.post('/auth/register-company', payload);
      const userId = registerResponse?.data?.user?._id;
      if (userId) {
        try {
          await api.post(`/super-admin/users/${userId}/approve`);
        } catch (approveError) {
          if (approveError?.response?.status !== 400) {
            throw approveError;
          }
        }
      }

      setCreatedLogin({
        email: payload.email,
        password: payload.password,
        loginUrl: '/login'
      });
      setRefreshKey((prev) => prev + 1);
      showToast('Settings saved successfully', 'success');
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to create landlord account', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SuperAdminTablePage
        endpoint="/super-admin/landlords"
        dataKey="landlords"
        title="Landlords"
        subtitle="Landlord accounts, plans, and portfolio activity."
        enableUserActions
        enableApprovalActions
        approveOnActivate
        userIdKey="id"
        refreshKey={refreshKey}
        toolbarActions={(
          <button
            type="button"
            onClick={() => setShowAddDialog(true)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Landlord / Self Owner
          </button>
        )}
        searchPlaceholder="Search landlords by name, email, phone..."
        statusLabel="Subscription Status"
        statusField="subscriptionStatus"
        statusOptions={[
          { label: 'Active', value: 'active' },
          { label: 'Trial', value: 'trial' },
          { label: 'Suspended', value: 'suspended' },
          { label: 'Expired', value: 'expired' },
          { label: 'Cancelled', value: 'cancelled' }
        ]}
        columns={[
          { key: 'landlordName', label: 'Landlord Name' },
          { key: 'displayName', label: 'Business / Display Name' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone' },
          { key: 'approvalStatus', label: 'Approval Status' },
          { key: 'whatsAppNumber', label: 'WhatsApp Number' },
          { key: 'location', label: 'Location' },
          { key: 'subscriptionPlan', label: 'Subscription Plan' },
          { key: 'subscriptionStatus', label: 'Subscription Status' },
          { key: 'properties', label: 'Properties', type: 'number' },
          { key: 'units', label: 'Units', type: 'number' },
          { key: 'occupiedUnits', label: 'Occupied Units', type: 'number' },
          { key: 'vacantUnits', label: 'Vacant Units', type: 'number' },
          { key: 'tenants', label: 'Tenants', type: 'number' },
          { key: 'status', label: 'Status' },
          { key: 'joinedDate', label: 'Joined Date', type: 'date' },
          { key: 'lastLogin', label: 'Last Login', type: 'date' }
        ]}
      />

      {showAddDialog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-2xl max-h-[88vh] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sa-modal-pop">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-5">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Add Landlord / Self Owner</h3>
                <p className="text-sm text-slate-500">Create landlord details and login credentials.</p>
              </div>
              <button
                type="button"
                onClick={closeDialog}
                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            {!createdLogin ? (
              <form onSubmit={handleCreateLandlord} className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Company Name</label>
                    <input
                      value={form.companyName}
                      onChange={(event) => setForm((prev) => ({ ...prev, companyName: event.target.value }))}
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                      placeholder="Company / Business name"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Owner Name</label>
                    <input
                      value={form.ownerName}
                      onChange={(event) => setForm((prev) => ({ ...prev, ownerName: event.target.value }))}
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                      placeholder="Landlord full name"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Email (Login)</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                      placeholder="owner@email.com"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Password (Login)</label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                      placeholder="Set temporary password"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Phone</label>
                    <input
                      value={form.phone}
                      onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                      placeholder="Phone number"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-500">Address / Location</label>
                    <input
                      value={form.address}
                      onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                      placeholder="Address / location"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {saving ? 'Creating...' : 'Create Landlord'}
                  </button>
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-5 space-y-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                  Landlord account created and approved successfully.
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <p><span className="font-semibold">Login URL:</span> {createdLogin.loginUrl}</p>
                  <p><span className="font-semibold">Email:</span> {createdLogin.email}</p>
                  <p><span className="font-semibold">Password:</span> {createdLogin.password}</p>
                </div>
                <button
                  type="button"
                  onClick={closeDialog}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
};

export default SuperAdminLandlords;
