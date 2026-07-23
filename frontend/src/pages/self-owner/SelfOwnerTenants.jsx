import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Eye, FileText, Filter, Pencil, Plus, Search, Trash2, UserCheck, UserRound, UserRoundX, WalletCards, X } from 'lucide-react';
import api from '../../services/api';
import { formatUGX } from '../../utils/currency';
import TenantWizard from './TenantWizard';
import { showToast } from '../../utils/toast';

const asNumber = (value) => Number(value) || 0;
const getId = (value) => String(value?._id || value || '');
const initials = (name = '') => name.split(' ').map((item) => item[0]).join('').slice(0, 2).toUpperCase() || 'T';
const formatDate = (value) => {
  if (!value) return 'Not provided';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not provided' : date.toLocaleDateString();
};
const dateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
};
const formatGender = (value) => ({ male: 'Male', female: 'Female', other: 'Other', prefer_not_to_say: 'Prefer not to say' }[value] || 'Not provided');
const formatStatus = (value) => ({ active: 'Active', inactive: 'Inactive', pending: 'Pending', terminated: 'Evicted', renewed: 'Renewed' }[value] || value || 'Active');
const tenantPhotoSrc = (tenant) => {
  const base64 = tenant?.photo?.base64;
  if (!base64) return '';
  return String(base64).startsWith('data:') ? base64 : `data:${tenant.photo?.contentType || 'image/webp'};base64,${base64}`;
};
const attachmentImageSrc = (attachment) => {
  if (!attachment || !String(attachment.contentType || '').startsWith('image/') || !attachment.base64) return '';
  return String(attachment.base64).startsWith('data:')
    ? attachment.base64
    : `data:${attachment.contentType || 'image/webp'};base64,${attachment.base64}`;
};
const attachmentMap = (tenant) => (tenant.identityAttachments || []).reduce((map, attachment) => {
  if (attachment?.documentType) map[attachment.documentType] = attachment;
  return map;
}, {});
const daysRemaining = (date) => Math.ceil((new Date(date) - new Date()) / 86400000);
const relationName = (relation, fallback = 'Not assigned') => relation?.name || relation?.unitNumber || fallback;
const tenantToForm = (tenant) => ({
  _id: tenant._id,
  fullName: tenant.fullName || '',
  phone: tenant.phone || '',
  email: tenant.email || '',
  idNumber: tenant.idNumber || '',
  gender: tenant.gender || '',
  dateOfBirth: dateInput(tenant.dateOfBirth),
  occupation: tenant.occupation || '',
  emergencyContactName: tenant.emergencyContact?.name || '',
  emergencyContactPhone: tenant.emergencyContact?.phone || '',
  property: getId(tenant.property),
  unit: getId(tenant.unit),
  leaseStart: dateInput(tenant.leaseStart),
  leaseEnd: dateInput(tenant.leaseEnd),
  rentAmount: tenant.rentAmount || '',
  securityDeposit: tenant.securityDeposit || '',
  status: tenant.status || 'active',
  notes: tenant.notes || '',
  photo: tenant.photo?.base64 ? { ...tenant.photo, preview: tenantPhotoSrc(tenant) } : null,
  attachments: attachmentMap(tenant),
  hasAccount: Boolean(tenant.user),
  createAccount: false,
  accountEmail: tenant.user?.email || tenant.email || '',
  accountPassword: '',
  confirmPassword: ''
});

export default function SelfOwnerTenants() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await api.get('/self-owner/tenants', { params: { limit: 100 } });
      setTenants(response.data?.tenants || []);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load tenants.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  const filtered = useMemo(() => tenants.filter((tenant) => {
    const matches = `${tenant.fullName} ${tenant.phone} ${tenant.email} ${tenant.unit?.unitNumber}`.toLowerCase().includes(search.toLowerCase());
    return matches && (!status || tenant.status === status);
  }), [tenants, search, status]);
  const stats = useMemo(() => ({
    total: tenants.length,
    active: tenants.filter((tenant) => tenant.status === 'active').length,
    inactive: tenants.filter((tenant) => tenant.status === 'inactive').length,
    evicted: tenants.filter((tenant) => ['terminated', 'evicted'].includes(tenant.status)).length,
    rent: tenants.filter((tenant) => tenant.status === 'active').reduce((sum, tenant) => sum + asNumber(tenant.rentAmount), 0),
    outstanding: tenants.reduce((sum, tenant) => sum + asNumber(tenant.outstandingBalance), 0),
    expiring: tenants.filter((tenant) => {
      if (!tenant.leaseEnd) return false;
      const days = daysRemaining(tenant.leaseEnd);
      return days >= 0 && days <= 30;
    }).length
  }), [tenants]);

  const loadTenantOptions = async () => {
    const [propertiesResponse, unitsResponse] = await Promise.all([
      api.get('/self-owner/properties', { params: { limit: 100 } }),
      api.get('/self-owner/units', { params: { limit: 100 } })
    ]);
    setProperties(propertiesResponse.data?.properties || []);
    setUnits(unitsResponse.data?.units || []);
  };
  const openWizard = async () => {
    try {
      await loadTenantOptions();
      setShowWizard(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to prepare the tenant form.');
    }
  };
  const openEditor = async (tenant) => {
    try {
      await loadTenantOptions();
      setEditing(tenant);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to prepare the tenant form.');
    }
  };
  const saveTenant = async (payload) => {
    try {
      await api.post('/self-owner/tenants', payload);
      setShowWizard(false);
      await load();
      showToast('Settings saved successfully');
    } catch (requestError) {
      const message = requestError.response?.data?.message || 'Unable to add tenant.';
      setError(message);
      showToast(message, 'error');
      throw requestError;
    }
  };
  const updateTenant = async (payload) => {
    if (!editing) return;
    try {
      await api.put(`/self-owner/tenants/${editing._id}`, payload);
      setEditing(null);
      await load();
      showToast('Settings saved successfully');
    } catch (requestError) {
      const message = requestError.response?.data?.message || 'Unable to update tenant.';
      setError(message);
      showToast(message, 'error');
      throw requestError;
    }
  };
  const deleteTenant = async (tenant) => {
    if (!window.confirm(`Delete ${tenant.fullName}? This will release their allocated unit.`)) return;
    try {
      await api.delete(`/self-owner/tenants/${tenant._id}`);
      await load();
      showToast('Settings saved successfully');
    } catch (requestError) {
      const message = requestError.response?.data?.message || 'Unable to delete tenant.';
      setError(message);
      showToast(message, 'error');
    }
  };

  return (
    <div className="mx-auto max-w-[1480px] space-y-5">
      <header>
        <h1 className="text-3xl font-bold text-slate-950">Tenants</h1>
        <p className="mt-1 text-slate-500">Manage all your tenants</p>
      </header>
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={UserRound} tone="blue" label="Total Tenants" value={stats.total} note="All your tenants" />
        <Metric icon={UserCheck} tone="green" label="Active Tenants" value={stats.active} note={`${stats.total ? Math.round((stats.active / stats.total) * 100) : 0}% Active`} />
        <Metric icon={UserRound} tone="amber" label="Inactive Tenants" value={stats.inactive} note={`${stats.total ? Math.round((stats.inactive / stats.total) * 100) : 0}% Inactive`} />
        <Metric icon={UserRoundX} tone="red" label="Evicted Tenants" value={stats.evicted} note={`${stats.total ? Math.round((stats.evicted / stats.total) * 100) : 0}% Evicted`} />
      </section>
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <label className="relative min-w-0 flex-1 sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by tenant name, phone, email or unit..." className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
          </label>
          <button type="button" onClick={openWizard} className="ml-auto inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"><Plus className="h-4 w-4" />Add Tenant</button>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="terminated">Evicted</option>
          </select>
          <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"><Filter className="h-4 w-4" />Filter</button>
        </div>
        <div className="responsive-table">
          <table className="text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-5 py-4">Tenant</th>
                <th className="px-5 py-4">Property / Unit</th>
                <th className="px-5 py-4">Phone</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Lease Period</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="px-5 py-12 text-center text-slate-500">Loading tenants...</td></tr>
              ) : filtered.length ? (
                filtered.map((tenant) => (
                  <TenantRow key={tenant._id} tenant={tenant} onView={() => setViewing(tenant)} onEdit={() => openEditor(tenant)} onDelete={() => deleteTenant(tenant)} />
                ))
              ) : (
                <tr><td colSpan="7" className="px-5 py-12 text-center text-slate-500">No tenants match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
          <span>Showing {filtered.length} of {tenants.length} tenants</span>
          <span>Page 1 of 1</span>
        </footer>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Summary icon={WalletCards} tone="green" label="Monthly Rent Collected" value={formatUGX(stats.rent)} note="From active tenants" />
        <Summary icon={WalletCards} tone="red" label="Outstanding Balance" value={formatUGX(stats.outstanding)} note="From all tenants" />
        <Summary icon={UserRound} tone="blue" label="Avg. Monthly Rent" value={formatUGX(stats.total ? Math.round(stats.rent / stats.total) : 0)} note="Per tenant" />
        <Summary icon={CalendarClock} tone="amber" label="Lease Expiring Soon" value={`${stats.expiring} Tenants`} note="Within next 30 days" />
      </section>
      {showWizard && <TenantWizard properties={properties} units={units} onClose={() => setShowWizard(false)} onSave={saveTenant} />}
      {viewing && <TenantModal tenant={viewing} onClose={() => setViewing(null)} />}
      {editing && (
        <TenantWizard
          key={editing._id}
          properties={properties}
          units={units}
          initialForm={tenantToForm(editing)}
          allocationLocked
          showStatus
          title={`Edit ${editing.fullName || 'Tenant'}`}
          description="Update the selected tenant profile, attachments, account access, and lease details."
          submitLabel="Save Changes"
          onClose={() => setEditing(null)}
          onSave={updateTenant}
        />
      )}
    </div>
  );
}

function Metric({ icon: Icon, tone, label, value, note }) {
  const colors = { blue: 'bg-blue-50 text-blue-600', green: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', red: 'bg-rose-50 text-rose-600' };
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <span className={`grid h-14 w-14 place-items-center rounded-full ${colors[tone]}`}><Icon className="h-6 w-6" /></span>
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
          <p className={`mt-1 text-xs font-semibold ${tone === 'green' ? 'text-emerald-600' : tone === 'amber' ? 'text-amber-600' : tone === 'red' ? 'text-rose-600' : 'text-slate-500'}`}>{note}</p>
        </div>
      </div>
    </article>
  );
}

function Summary({ icon: Icon, tone, label, value, note }) {
  const colors = { green: 'bg-emerald-50 text-emerald-600', red: 'bg-rose-50 text-rose-600', blue: 'bg-blue-50 text-blue-600', amber: 'bg-amber-50 text-amber-600' };
  return (
    <article className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm font-medium text-slate-600">{label}</p>
        <p className="mt-2 text-xl font-bold text-slate-950">{value}</p>
        <p className="mt-1 text-xs text-slate-500">{note}</p>
      </div>
      <span className={`grid h-12 w-12 place-items-center rounded-full ${colors[tone]}`}><Icon className="h-5 w-5" /></span>
    </article>
  );
}

function TenantRow({ tenant, onView, onEdit, onDelete }) {
  const days = tenant.leaseEnd ? daysRemaining(tenant.leaseEnd) : null;
  const leaseNote = days === null || Number.isNaN(days)
    ? 'No lease end'
    : days < 0
      ? 'Lease ended'
      : `${Math.max(0, Math.ceil(days / 30))} months remaining`;

  return (
    <tr className="border-t border-slate-100 text-slate-700">
      <td className="px-5 py-3">
        <div className="flex items-center gap-3">
          {tenantPhotoSrc(tenant) ? (
            <img src={tenantPhotoSrc(tenant)} alt={tenant.fullName || 'Tenant'} className="h-9 w-9 rounded-full border border-slate-200 object-cover" />
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-full bg-blue-50 text-xs font-bold text-blue-600">{initials(tenant.fullName)}</span>
          )}
          <div>
            <p className="font-semibold text-slate-900">{tenant.fullName || 'Unnamed tenant'}</p>
            <p className="text-xs text-slate-500">{tenant.phone || 'No phone'}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3">
        <p className="font-medium text-slate-800">{tenant.property?.name || 'Not assigned'}</p>
        <p className="mt-0.5 text-xs text-slate-500">{tenant.unit?.unitNumber || 'No unit'}</p>
      </td>
      <td className="px-5 py-3">{tenant.phone || '-'}</td>
      <td className="px-5 py-3">{tenant.email || '-'}</td>
      <td className="px-5 py-3">
        <p className="font-medium text-slate-800">{formatDate(tenant.leaseStart)} - {formatDate(tenant.leaseEnd)}</p>
        <p className={`mt-0.5 text-xs font-semibold ${days !== null && days < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{leaseNote}</p>
      </td>
      <td className="px-5 py-3"><Status status={tenant.status} /></td>
      <td className="px-5 py-3">
        <div className="flex justify-end gap-2">
          <Action label="View tenant" onClick={onView}><Eye className="h-4 w-4" /></Action>
          <Action label="Edit tenant" onClick={onEdit}><Pencil className="h-4 w-4" /></Action>
          <Action label="Delete tenant" onClick={onDelete} danger><Trash2 className="h-4 w-4" /></Action>
        </div>
      </td>
    </tr>
  );
}

function Status({ status }) {
  const styles = {
    active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    inactive: 'border-amber-200 bg-amber-50 text-amber-700',
    pending: 'border-blue-200 bg-blue-50 text-blue-700',
    renewed: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    terminated: 'border-rose-200 bg-rose-50 text-rose-700'
  };
  return <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${styles[status] || 'border-slate-200 bg-slate-50 text-slate-600'}`}>{formatStatus(status)}</span>;
}

function Action({ children, label, onClick, danger = false }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} className={`grid h-9 w-9 place-items-center rounded-md border ${danger ? 'border-rose-200 text-rose-600' : 'border-slate-200 text-slate-600'}`}>
      {children}
    </button>
  );
}

function TenantModal({ tenant, onClose }) {
  const photoSrc = tenantPhotoSrc(tenant);
  const attachments = attachmentMap(tenant);
  const hasAccount = Boolean(tenant.user);

  return (
    <Dialog title={tenant.fullName || 'Tenant Details'} onClose={onClose}>
      <div className="space-y-6">
        <section className="grid gap-4 md:grid-cols-4">
          <div className="grid min-h-36 place-items-center rounded-lg border-2 border-dashed border-blue-200 bg-blue-50/30 p-3 text-center text-blue-600 md:row-span-2">
            {photoSrc ? (
              <img src={photoSrc} className="h-24 w-24 rounded-full object-cover" alt={tenant.fullName || 'Tenant'} />
            ) : (
              <span className="grid h-24 w-24 place-items-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700">{initials(tenant.fullName)}</span>
            )}
            <span className="mt-2 text-sm font-semibold">Tenant Photo</span>
          </div>
          <Info label="Full Name" value={tenant.fullName} />
          <Info label="Phone Number" value={tenant.phone} />
          <Info label="Email Address" value={tenant.email} />
          <Info label="National ID / Passport" value={tenant.idNumber} />
          <Info label="Gender" value={formatGender(tenant.gender)} />
          <Info label="Date of Birth" value={formatDate(tenant.dateOfBirth)} />
          <Info label="Occupation" value={tenant.occupation} />
          <Info label="Emergency Contact Name" value={tenant.emergencyContact?.name} />
          <Info label="Emergency Contact Phone" value={tenant.emergencyContact?.phone} />
          <Info label="Property" value={relationName(tenant.property)} />
          <Info label="Unit" value={relationName(tenant.unit, 'No unit')} />
          <Info label="Lease Start Date" value={formatDate(tenant.leaseStart)} />
          <Info label="Lease End Date" value={formatDate(tenant.leaseEnd)} />
          <Info label="Monthly Rent" value={formatUGX(tenant.rentAmount)} />
          <Info label="Security Deposit" value={formatUGX(tenant.securityDeposit)} />
          <Info label="Status" value={formatStatus(tenant.status)} />
          <div className="md:col-span-2"><Info label="Notes / Additional Details" value={tenant.notes} /></div>
        </section>

        <section>
          <h3 className="font-bold text-slate-900">Identity Attachments</h3>
          <p className="mt-1 text-sm text-slate-500">Saved files for the selected tenant.</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <AttachmentPreview label="National ID Front" attachment={attachments.national_id_front} />
            <AttachmentPreview label="National ID Back" attachment={attachments.national_id_back} />
            <AttachmentPreview label="LC Letter / Recommendation" attachment={attachments.lc_letter} />
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <ReviewBox title="Tenant Account" rows={[
            ['Portal access', hasAccount ? 'Account linked' : 'No account'],
            ['Account email', tenant.user?.email || tenant.email || 'Not provided']
          ]} />
          <ReviewBox title="Lease Review" rows={[
            ['Property', tenant.property?.name || 'Not assigned'],
            ['Unit', tenant.unit?.unitNumber || 'No unit'],
            ['Lease', `${formatDate(tenant.leaseStart)} - ${formatDate(tenant.leaseEnd)}`],
            ['Outstanding balance', formatUGX(tenant.outstandingBalance)],
            ['Total paid', formatUGX(tenant.totalPaidAmount)]
          ]} />
        </section>
      </div>
    </Dialog>
  );
}

function AttachmentPreview({ label, attachment }) {
  const imageSrc = attachmentImageSrc(attachment);

  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="grid h-32 place-items-center overflow-hidden rounded-lg bg-white">
        {attachment ? (
          imageSrc ? <img src={imageSrc} alt={label} className="h-full w-full object-cover" /> : <FileText className="h-9 w-9 text-rose-500" />
        ) : (
          <span className="text-sm font-semibold text-slate-400">Not added</span>
        )}
      </div>
      <p className="mt-3 truncate text-sm font-semibold text-slate-800">{attachment?.originalName || label}</p>
      <p className="text-xs text-slate-500">{attachment ? `${Math.max(1, Math.round((attachment.size || 0) / 1024))} KB` : 'No file saved'}</p>
    </article>
  );
}

function ReviewBox({ title, rows }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="font-bold text-slate-900">{title}</h3>
      <dl className="mt-3 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
            <dd className="text-sm font-medium text-slate-800">{value || 'Not provided'}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Dialog({ title, children, footer, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 sm:p-6">
      <section className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <header className="flex shrink-0 items-start justify-between border-b border-slate-200 px-5 py-5 sm:px-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{title}</h2>
            <p className="mt-1 text-sm text-slate-500">Complete tenant profile and lease details.</p>
          </div>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">{children}</div>
        {footer && <footer className="flex shrink-0 justify-end gap-3 border-t border-slate-200 p-4">{footer}</footer>}
      </section>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="grid content-start gap-1.5">
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      <p className="min-h-10 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800">{value || 'Not provided'}</p>
    </div>
  );
}
