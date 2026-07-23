import { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Check, ChevronLeft, ChevronRight, Copy, Download, Eye, Home, Link2, Pencil, Search, Share2, Trash2, Users, Wrench, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { formatUGX } from '../../utils/currency';
import { showToast } from '../../utils/toast';

const PAGE_SIZE = 10;
const asNumber = (value) => Number(value) || 0;

export default function SelfOwnerUnits() {
  const [searchParams] = useSearchParams();
  const [units, setUnits] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [applicationAction, setApplicationAction] = useState('');
  const [notice, setNotice] = useState('');
  const handledNotificationApplication = useRef('');
  const requestedApplicationId = searchParams.get('application');

  const loadUnits = async () => {
    setLoading(true);
    try {
      const applicationsRequest = api.get('/self-owner/tenant-applications').catch((requestError) => {
        // The applications route is an enhancement to the Units page. Keep the core
        // units screen usable while an older backend is restarting or being deployed.
        if (requestError.response?.status === 404) return { data: { applications: [] } };
        throw requestError;
      });
      const [unitsResponse, tenantsResponse, applicationsResponse] = await Promise.all([
        api.get('/self-owner/units', { params: { limit: 100 } }),
        api.get('/self-owner/tenants', { params: { limit: 100 } }),
        applicationsRequest,
      ]);
      setUnits(unitsResponse.data?.units || []);
      setTenants(tenantsResponse.data?.tenants || []);
      setApplications(applicationsResponse.data?.applications || []);
      setError('');
    } catch (requestError) { setError(requestError.response?.data?.message || 'Unable to load units.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { const timer = window.setTimeout(() => { void loadUnits(); }, 0); return () => window.clearTimeout(timer); }, []);

  const properties = useMemo(() => [...new Map(units.filter((unit) => unit.property?._id).map((unit) => [unit.property._id, unit.property])).values()], [units]);
  const summary = useMemo(() => ({ total: units.length, occupied: units.filter((unit) => unit.status === 'occupied').length, vacant: units.filter((unit) => unit.status === 'vacant').length, maintenance: units.filter((unit) => unit.status === 'maintenance').length }), [units]);
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return units.filter((unit) => {
      const matchesSearch = !query || `${unit.unitNumber} ${unit.property?.name || ''} ${unit.currentTenant?.fullName || ''}`.toLowerCase().includes(query);
      return matchesSearch && (!propertyFilter || unit.property?._id === propertyFilter) && (!statusFilter || unit.status === statusFilter);
    }).toSorted((left, right) => {
      if (sort === 'rent-high') return asNumber(right.rentAmount) - asNumber(left.rentAmount);
      if (sort === 'rent-low') return asNumber(left.rentAmount) - asNumber(right.rentAmount);
      if (sort === 'unit') return String(left.unitNumber).localeCompare(String(right.unitNumber));
      return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
    });
  }, [units, search, propertyFilter, statusFilter, sort]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleUnits = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => { const timer = window.setTimeout(() => setPage(1), 0); return () => window.clearTimeout(timer); }, [search, propertyFilter, statusFilter, sort]);
  useEffect(() => {
    if (!requestedApplicationId || loading || handledNotificationApplication.current === requestedApplicationId) return undefined;
    const application = applications.find((item) => item._id === requestedApplicationId);
    const applicationUnitId = application?.unit?._id || application?.unit;
    const unit = units.find((item) => item._id === applicationUnitId);
    if (!application || !unit) return undefined;
    handledNotificationApplication.current = requestedApplicationId;
    const timer = window.setTimeout(() => setSelected(unit), 0);
    return () => window.clearTimeout(timer);
  }, [applications, loading, requestedApplicationId, units]);

  const saveUnit = async (event) => {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    try { await api.put(`/self-owner/units/${editing._id}`, editing); setEditing(null); await loadUnits(); showToast('Settings saved successfully'); }
    catch (requestError) { const message = requestError.response?.data?.message || 'Unable to update unit.'; setError(message); showToast(message, 'error'); }
    finally { setSaving(false); }
  };
  const deleteUnit = async (unit) => {
    if (!window.confirm(`Delete unit ${unit.unitNumber}?`)) return;
    try { await api.delete(`/self-owner/units/${unit._id}`); await loadUnits(); showToast('Settings saved successfully'); }
    catch (requestError) { const message = requestError.response?.data?.message || 'Unable to delete unit.'; setError(message); showToast(message, 'error'); }
  };
  const exportUnits = () => {
    const header = ['Unit Name', 'Property', 'Monthly Rent', 'Tenant', 'Status'];
    const rows = filtered.map((unit) => [unit.unitNumber, unit.property?.name || '', asNumber(unit.rentAmount), unit.currentTenant?.fullName || '', unit.status]);
    const csv = [header, ...rows].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'units.csv'; link.click(); URL.revokeObjectURL(url);
  };
  const applicationUrl = (application) => `${window.location.origin}/tenant-application/${application.token}`;
  const copyApplicationLink = async (application) => {
    const url = applicationUrl(application);
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable.');
      await navigator.clipboard.writeText(url);
      setNotice('Tenant application link copied. You can now send it to the tenant.');
      showToast('Settings saved successfully');
    } catch { window.prompt('Copy this tenant application link:', url); }
  };
  const shareApplicationLink = async (application) => {
    const url = applicationUrl(application);
    if (!navigator.share) {
      await copyApplicationLink(application);
      setNotice('Sharing is not available on this device, so the link was copied instead.');
      showToast('Settings saved successfully');
      return;
    }
    try {
      await navigator.share({ title: 'Tenant application', text: 'Complete your tenant application for this unit.', url });
      setNotice('Tenant application link shared.');
      showToast('Settings saved successfully');
    } catch (shareError) {
      if (shareError.name !== 'AbortError') await copyApplicationLink(application);
    }
  };
  const generateApplicationLink = async (unit) => {
    setApplicationAction(`link-${unit._id}`);
    try {
      const response = await api.post(`/self-owner/units/${unit._id}/tenant-application-link`);
      await copyApplicationLink(response.data.application);
      await loadUnits();
    } catch (requestError) { const message = requestError.response?.data?.message || 'Unable to create a tenant application link.'; setError(message); showToast(message, 'error'); }
    finally { setApplicationAction(''); }
  };
  const approveApplication = async (application) => {
    if (!window.confirm(`Approve ${application.fullName}'s application and allocate Unit ${application.unit?.unitNumber || selected?.unitNumber}?`)) return;
    setApplicationAction(`approve-${application._id}`);
    try {
      await api.post(`/self-owner/tenant-applications/${application._id}/approve`);
      setNotice(`${application.fullName} has been added as a tenant and the unit is now occupied.`);
      showToast('Settings saved successfully');
      setSelected(null);
      await loadUnits();
      window.dispatchEvent(new Event('tenant-applications-updated'));
    } catch (requestError) { const message = requestError.response?.data?.message || 'Unable to approve this application.'; setError(message); showToast(message, 'error'); }
    finally { setApplicationAction(''); }
  };
  const rejectApplication = async (application) => {
    if (!window.confirm(`Delete ${application.fullName}'s pending application?`)) return;
    setApplicationAction(`reject-${application._id}`);
    try { await api.post(`/self-owner/tenant-applications/${application._id}/reject`); await loadUnits(); window.dispatchEvent(new Event('tenant-applications-updated')); showToast('Settings saved successfully'); }
    catch (requestError) { const message = requestError.response?.data?.message || 'Unable to delete this application.'; setError(message); showToast(message, 'error'); }
    finally { setApplicationAction(''); }
  };

  return <div className="mx-auto max-w-[1480px] space-y-6">
    <header><h1 className="text-3xl font-bold text-slate-950">Units</h1><p className="mt-1 text-base text-slate-500">Manage all units across your properties</p></header>
    {error && <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{error}</p>}
    {notice && <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"><Check className="h-4 w-4" />{notice}</p>}
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric icon={Building2} tone="blue" value={summary.total} label="Total Units" note={`Across ${properties.length} properties`} /><Metric icon={Users} tone="green" value={summary.occupied} label="Occupied Units" note={summary.total ? `${Math.round((summary.occupied / summary.total) * 100)}% Occupancy rate` : 'No units yet'} /><Metric icon={Home} tone="amber" value={summary.vacant} label="Vacant Units" note={summary.total ? `${Math.round((summary.vacant / summary.total) * 100)}% of total` : 'No units yet'} /><Metric icon={Wrench} tone="violet" value={summary.maintenance} label="Under Maintenance" note={summary.total ? `${Math.round((summary.maintenance / summary.total) * 100)}% of total` : 'No units yet'} /></section>
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="grid gap-3 border-b border-slate-100 p-4 lg:grid-cols-[1.25fr_0.9fr_0.8fr_0.65fr_auto]"><SearchField value={search} onChange={setSearch} /><select value={propertyFilter} onChange={(event) => setPropertyFilter(event.target.value)} className="unit-filter"><option value="">All Properties</option>{properties.map((property) => <option key={property._id} value={property._id}>{property.name}</option>)}</select><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="unit-filter"><option value="">All Statuses</option><option value="occupied">Occupied</option><option value="vacant">Vacant</option><option value="maintenance">Under Maintenance</option><option value="reserved">Reserved</option></select><select value={sort} onChange={(event) => setSort(event.target.value)} className="unit-filter"><option value="newest">Sort: Newest</option><option value="unit">Sort: Unit name</option><option value="rent-high">Rent: High to low</option><option value="rent-low">Rent: Low to high</option></select><button type="button" onClick={exportUnits} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"><Download className="h-4 w-4" />Export</button></div><div className="responsive-table"><table className="text-left text-sm"><thead className="border-b-2 border-slate-300 bg-slate-50 text-xs font-semibold uppercase text-slate-500"><tr><th className="px-5 py-4">Unit Name</th><th className="px-5 py-4">Property</th><th className="px-5 py-4">Unit Type</th><th className="px-5 py-4">Monthly Rent</th><th className="px-5 py-4">Tenant</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan="7" className="px-5 py-12 text-center text-slate-500">Loading units...</td></tr> : visibleUnits.length ? visibleUnits.map((unit) => <UnitRow key={unit._id} unit={unit} onView={() => setSelected(unit)} onEdit={() => setEditing({ ...unit })} onDelete={() => deleteUnit(unit)} />) : <tr><td colSpan="7" className="px-5 py-12 text-center text-slate-500">No units match these filters.</td></tr>}</tbody></table></div><footer className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 px-5 py-4"><p className="text-sm text-slate-500">Showing {filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} units</p><Pagination page={page} pages={pageCount} onChange={setPage} /></footer></section>
    {selected && <UnitView unit={selected} focusedApplicationId={requestedApplicationId} applications={applications.filter((application) => (application.unit?._id || application.unit) === selected._id)} applicationAction={applicationAction} onCreateLink={() => generateApplicationLink(selected)} onCopyLink={copyApplicationLink} onShareLink={shareApplicationLink} onApprove={approveApplication} onReject={rejectApplication} onClose={() => setSelected(null)} />}{editing && <UnitEditor key={editing._id} unit={editing} tenants={tenants} setUnit={setEditing} saving={saving} onClose={() => setEditing(null)} onSave={saveUnit} />}
  </div>;
}

function Metric({ icon: Icon, tone, value, label, note }) { const colors = { blue: 'bg-blue-50 text-blue-600', green: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600', violet: 'bg-violet-50 text-violet-600' }; const noteColors = { blue: 'text-slate-500', green: 'text-emerald-600', amber: 'text-amber-600', violet: 'text-violet-600' }; return <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-4"><span className={`grid h-14 w-14 place-items-center rounded-full ${colors[tone]}`}><Icon className="h-6 w-6" /></span><div><p className="text-2xl font-bold text-slate-950">{value}</p><p className="mt-1 text-sm font-semibold text-slate-800">{label}</p><p className={`mt-1 text-xs font-medium ${noteColors[tone]}`}>{note}</p></div></div></article>; }
function SearchField({ value, onChange }) { return <label className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search units..." className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" /></label>; }
function UnitRow({ unit, onView, onEdit, onDelete }) { return <tr className="border-b border-slate-100 text-slate-700 last:border-0"><td className="px-5 py-3.5 font-bold text-slate-900">{unit.unitNumber}</td><td className="px-5 py-3.5">{unit.property?.name || 'Unassigned'}</td><td className="px-5 py-3.5">{unit.bedrooms ? `${unit.bedrooms} Bedroom${unit.bedrooms > 1 ? 's' : ''}` : 'Unit'}</td><td className="px-5 py-3.5 font-medium text-slate-900">{formatUGX(unit.rentAmount)}</td><td className="px-5 py-3.5">{unit.currentTenant?.fullName || <span className="text-slate-400">-</span>}</td><td className="px-5 py-3.5"><Status status={unit.status} /></td><td className="px-5 py-3.5"><div className="flex justify-end gap-2"><Action label="View unit" onClick={onView}><Eye className="h-4 w-4" /></Action><Action label="Edit unit" onClick={onEdit}><Pencil className="h-4 w-4" /></Action><Action label="Delete unit" onClick={onDelete} danger><Trash2 className="h-4 w-4" /></Action></div></td></tr>; }
function Status({ status }) { const states = { occupied: 'border-emerald-200 bg-emerald-50 text-emerald-700', vacant: 'border-amber-200 bg-amber-50 text-amber-700', maintenance: 'border-violet-200 bg-violet-50 text-violet-700', reserved: 'border-blue-200 bg-blue-50 text-blue-700' }; const labels = { occupied: 'Occupied', vacant: 'Vacant', maintenance: 'Under Maintenance', reserved: 'Reserved' }; return <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${states[status] || 'border-slate-200 bg-slate-50 text-slate-600'}`}>{labels[status] || status}</span>; }
function Action({ children, label, onClick, danger = false }) { return <button type="button" title={label} aria-label={label} onClick={onClick} className={`grid h-9 w-9 place-items-center rounded-md border ${danger ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'border-slate-200 text-blue-600 hover:bg-blue-50'}`}>{children}</button>; }
function Pagination({ page, pages, onChange }) { return <div className="flex items-center gap-1"><button type="button" disabled={page === 1} onClick={() => onChange(page - 1)} className="pagination-button"><ChevronLeft className="h-4 w-4" /></button>{Array.from({ length: Math.min(pages, 5) }, (_, index) => index + 1).map((number) => <button type="button" key={number} onClick={() => onChange(number)} className={`pagination-button ${page === number ? 'border-blue-600 bg-blue-600 text-white' : ''}`}>{number}</button>)}<button type="button" disabled={page === pages} onClick={() => onChange(page + 1)} className="pagination-button"><ChevronRight className="h-4 w-4" /></button></div>; }
function UnitView({ unit, applications, focusedApplicationId, applicationAction, onCreateLink, onCopyLink, onShareLink, onApprove, onReject, onClose }) {
  const activeLink = applications.find((application) => application.status === 'open' && new Date(application.expiresAt) > new Date());
  const pendingApplications = applications.filter((application) => application.status === 'pending').toSorted((left, right) => Number(right._id === focusedApplicationId) - Number(left._id === focusedApplicationId));
  const canInvite = unit.status === 'vacant' && !unit.currentTenant;

  return <Modal title={`Unit ${unit.unitNumber}`} onClose={onClose}><div className="grid gap-4 sm:grid-cols-2">
    <Detail label="Property" value={unit.property?.name || 'Unassigned'} />
    <Detail label="Status" value={<Status status={unit.status} />} />
    <Detail label="Monthly rent" value={formatUGX(unit.rentAmount)} />
    <Detail label="Tenant" value={unit.currentTenant?.fullName || 'Vacant'} />
    <div className="sm:col-span-2"><Detail label="Description" value={unit.description || 'No unit description added.'} /></div>

    <section className="sm:col-span-2 rounded-xl border border-blue-100 bg-blue-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="font-bold text-slate-900">Tenant application link</h3><p className="mt-1 text-sm text-slate-600">Send a secure form to a prospective tenant. Submitted applications stay pending until you approve them.</p></div>
        {canInvite ? activeLink ? <div className="flex flex-wrap gap-2"><button type="button" onClick={() => onShareLink(activeLink)} className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"><Share2 className="h-4 w-4" />Share</button><button type="button" onClick={() => onCopyLink(activeLink)} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"><Copy className="h-4 w-4" />Copy link</button></div> : <button type="button" disabled={applicationAction === `link-${unit._id}`} onClick={onCreateLink} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"><Link2 className="h-4 w-4" />{applicationAction === `link-${unit._id}` ? 'Creating...' : 'Create link'}</button> : <span className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-500">Available when vacant</span>}
      </div>
      {canInvite && activeLink && <div className="mt-4 flex items-center gap-2 rounded-lg border border-blue-100 bg-white p-2"><input readOnly value={`${window.location.origin}/tenant-application/${activeLink.token}`} className="min-w-0 flex-1 bg-transparent px-2 py-1 text-xs text-slate-600 outline-none" aria-label="Tenant application link" /><button type="button" onClick={() => onShareLink(activeLink)} className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-blue-600 hover:bg-blue-50" aria-label="Share tenant application link"><Share2 className="h-4 w-4" /></button><button type="button" onClick={() => onCopyLink(activeLink)} className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-blue-600 hover:bg-blue-50" aria-label="Copy tenant application link"><Copy className="h-4 w-4" /></button></div>}
      {!canInvite && <p className="mt-3 text-xs font-medium text-slate-500">Set this unit to Vacant before creating an invitation link.</p>}
    </section>

    {pendingApplications.map((application) => <section key={application._id} className={`sm:col-span-2 rounded-xl border bg-amber-50/70 p-4 ${application._id === focusedApplicationId ? 'border-amber-400 ring-2 ring-amber-100' : 'border-amber-200'}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 gap-4">
          {application.photo?.base64 && application.photo.contentType?.startsWith('image/') && <img src={`data:${application.photo.contentType};base64,${application.photo.base64}`} alt={`${application.fullName}'s profile`} className="h-16 w-16 rounded-full border border-amber-200 object-cover" />}
          <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-900">Application from {application.fullName}</h3><span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Pending approval</span></div><p className="mt-1 text-sm text-slate-600">Submitted {formatDate(application.submittedAt)}</p></div>
        </div>
        <div className="flex gap-2"><button type="button" disabled={applicationAction === `reject-${application._id}`} onClick={() => onReject(application)} className="rounded-md border border-rose-200 bg-white px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60">{applicationAction === `reject-${application._id}` ? 'Deleting...' : 'Delete application'}</button><button type="button" disabled={applicationAction === `approve-${application._id}`} onClick={() => onApprove(application)} className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"><Check className="h-4 w-4" />{applicationAction === `approve-${application._id}` ? 'Approving...' : 'Approve & allocate'}</button></div>
      </div>
      <dl className="mt-5 grid gap-x-5 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3"><TenantLabel label="Phone" value={application.phone || 'Not provided'} /><TenantLabel label="Email" value={application.email || 'Not provided'} /><TenantLabel label="ID number" value={application.idNumber || 'Not provided'} /><TenantLabel label="Gender" value={application.gender || 'Not provided'} /><TenantLabel label="Date of birth" value={formatDate(application.dateOfBirth)} /><TenantLabel label="Occupation" value={application.occupation || 'Not provided'} /><TenantLabel label="Emergency contact" value={[application.emergencyContact?.name, application.emergencyContact?.phone].filter(Boolean).join(' · ') || 'Not provided'} /><TenantLabel label="Lease" value={`${formatDate(application.leaseStart)} to ${formatDate(application.leaseEnd)}`} /><TenantLabel label="Monthly rent" value={formatUGX(application.rentAmount)} /><TenantLabel label="Security deposit" value={formatUGX(application.securityDeposit)} /><TenantLabel label="Tenant account" value={application.createAccount ? 'Requested' : 'Not requested'} /><TenantLabel label="Identity attachments" value={`${application.identityAttachments?.length || 0} file(s)`} /></dl>
      {application.identityAttachments?.length > 0 && <div className="mt-4 rounded-lg border border-amber-100 bg-white/70 px-3 py-2"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Attached identity documents</p><p className="mt-1 text-sm text-slate-700">{application.identityAttachments.map((attachment) => attachment.originalName || attachment.documentType).join(', ')}</p></div>}
      {application.notes && <div className="mt-4 rounded-lg border border-amber-100 bg-white/70 px-3 py-2"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Applicant notes</p><p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{application.notes}</p></div>}
    </section>)}
  </div></Modal>;
}
function UnitEditor({ unit, tenants, setUnit, saving, onClose, onSave }) { const [tenantId, setTenantId] = useState(unit.currentTenant?._id || ''); const selectedTenant = tenants.find((tenant) => tenant._id === tenantId); const update = (key, value) => setUnit((current) => ({ ...current, [key]: value })); const footer = <><button type="button" onClick={onClose} className="rounded-md border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Cancel</button><button form="unit-edit-form" disabled={saving} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Saving...' : 'Save Changes'}</button></>; return <Modal title={`Edit Unit ${unit.unitNumber}`} onClose={onClose} footer={footer}><form id="unit-edit-form" onSubmit={onSave} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><Field label="Unit name" value={unit.unitNumber} onChange={(value) => update('unitNumber', value)} /><Field label="Monthly rent (UGX)" type="number" value={unit.rentAmount} onChange={(value) => update('rentAmount', value)} /><Field label="Deposit (UGX)" type="number" value={unit.depositAmount} onChange={(value) => update('depositAmount', value)} /><Field label="Bedrooms" type="number" value={unit.bedrooms} onChange={(value) => update('bedrooms', value)} /><label className="grid gap-1.5 sm:col-span-2"><span className="text-sm font-semibold text-slate-700">Tenant</span><select value={tenantId} onChange={(event) => setTenantId(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"><option value="">Select a tenant to view details</option>{tenants.map((tenant) => <option key={tenant._id} value={tenant._id}>{tenant.fullName} {tenant.unit?.unitNumber ? `- Unit ${tenant.unit.unitNumber}` : ''}</option>)}</select></label>{selectedTenant && <TenantDetails tenant={selectedTenant} />}{!selectedTenant && <p className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">Select a tenant to see their contact, lease, and rent details.</p>}<label className="grid gap-1.5 sm:col-span-2"><span className="text-sm font-semibold text-slate-700">Status</span><select value={unit.status} onChange={(event) => update('status', event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500"><option value="vacant">Vacant</option><option value="maintenance">Under Maintenance</option><option value="reserved">Reserved</option></select></label><label className="grid gap-1.5 sm:col-span-2"><span className="text-sm font-semibold text-slate-700">Unit description</span><textarea value={unit.description || ''} onChange={(event) => update('description', event.target.value)} className="min-h-28 rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" /></label></div></form></Modal>; }
function TenantDetails({ tenant }) { return <section className="sm:col-span-2 rounded-lg border border-blue-100 bg-blue-50/60 p-4"><p className="text-sm font-bold text-slate-900">Tenant details</p><dl className="mt-3 grid gap-3 sm:grid-cols-2"><TenantLabel label="Full name" value={tenant.fullName || 'Not provided'} /><TenantLabel label="Phone" value={tenant.phone || 'Not provided'} /><TenantLabel label="Email" value={tenant.email || 'Not provided'} /><TenantLabel label="Monthly rent" value={formatUGX(tenant.rentAmount)} /><TenantLabel label="Lease start" value={formatDate(tenant.leaseStart)} /><TenantLabel label="Lease end" value={formatDate(tenant.leaseEnd)} /></dl></section>; }
function TenantLabel({ label, value }) { return <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{value}</dd></div>; }
function formatDate(value) { return value ? new Date(value).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not provided'; }
function Modal({ title, children, footer, onClose }) { return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 sm:p-6"><section className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]"><header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4"><h2 className="text-xl font-bold text-slate-900">{title}</h2><button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button></header><div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>{footer && <footer className="flex shrink-0 justify-end gap-3 border-t border-slate-200 bg-white px-5 py-4">{footer}</footer>}</section></div>; }
function Detail({ label, value }) { return <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><div className="mt-1 text-sm font-semibold text-slate-800">{value}</div></div>; }
function Field({ label, type = 'text', value, onChange }) { return <label className="grid gap-1.5"><span className="text-sm font-semibold text-slate-700">{label}</span><input type={type} value={value ?? ''} onChange={(event) => onChange(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" /></label>; }
