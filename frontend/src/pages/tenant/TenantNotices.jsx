import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, CheckCircle2, Search, Trash2 } from 'lucide-react';
import { tenantPortalAPI } from '../../services/api';
import {
  dateLabel,
  EmptyTenantState,
  PageHeader,
  safeText,
  TenantErrorState,
  TenantLoadingState,
  TenantPanel,
  TenantStatusBadge
} from './TenantPortalUI';

const categories = [
  { value: 'all', label: 'All' },
  { value: 'rent_due', label: 'Rent' },
  { value: 'maintenance_update', label: 'Maintenance' },
  { value: 'announcement', label: 'General' },
  { value: 'lease_expiring', label: 'Lease' }
];

export default function TenantNotices() {
  const [notices, setNotices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [category, setCategory] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState('');

  useEffect(() => {
    let cancelled = false;
    const loadNotices = async () => {
      try {
        setLoading(true);
        const response = await tenantPortalAPI.getNotices({
          category,
          status,
          search: search || undefined
        });
        const list = Array.isArray(response.data) ? response.data : [];
        if (!cancelled) {
          setNotices(list);
          setSelected((current) => {
            if (!list.length) return null;
            if (!current) return list[0];
            return list.find((item) => item._id === current._id) || list[0];
          });
          setError('');
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError?.response?.data?.message || 'Unable to load notices.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const timer = window.setTimeout(loadNotices, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [category, status, search]);

  const unreadCount = useMemo(() => notices.filter((notice) => !notice.isRead).length, [notices]);

  const markRead = useCallback(async (notice) => {
    if (!notice?._id || notice.isRead) return;
    try {
      const response = await tenantPortalAPI.markNoticeRead(notice._id);
      const updatedNotice = response.data;
      setNotices((current) => current.map((item) => item._id === notice._id ? updatedNotice : item));
      setSelected((current) => current?._id === notice._id ? updatedNotice : current);
      window.dispatchEvent(new Event('tenant-notifications-updated'));
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to mark notice as read.');
    }
  }, []);

  const deleteNotice = useCallback(async (notice) => {
    if (!notice?._id) return;
    try {
      setDeletingId(notice._id);
      await tenantPortalAPI.deleteNotice(notice._id);
      setNotices((current) => current.filter((item) => item._id !== notice._id));
      setSelected((current) => current?._id === notice._id ? null : current);
      setError('');
      window.dispatchEvent(new Event('tenant-notifications-updated'));
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Unable to delete notice.');
    } finally {
      setDeletingId('');
    }
  }, []);

  useEffect(() => {
    if (!selected || selected.isRead) return undefined;
    const timer = window.setTimeout(() => markRead(selected), 400);
    return () => window.clearTimeout(timer);
  }, [markRead, selected]);

  if (loading && !notices.length) return <TenantLoadingState message="Loading notices..." />;
  if (error && !notices.length) return <TenantErrorState message={error} />;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <PageHeader title="Notices" subtitle="Important announcements from your landlord." />

      {error && <TenantErrorState message={error} />}

      <TenantPanel>
        <div className="grid gap-4 p-5 lg:grid-cols-[1fr_auto_auto]">
          <label className="flex h-11 items-center gap-3 rounded-lg border border-slate-200 px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notices..." className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400" />
          </label>
          <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500">
            {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500">
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="read">Read</option>
          </select>
        </div>
      </TenantPanel>

      <section className="grid gap-5 lg:grid-cols-[1fr_420px]">
        <TenantPanel title={`Notice List (${unreadCount} new)`}>
          <div className="space-y-3 p-5">
            {notices.length ? notices.map((notice) => (
              <button
                key={notice._id}
                type="button"
                onClick={() => setSelected(notice)}
                className={`w-full rounded-xl border p-4 text-left transition ${selected?._id === notice._id ? 'border-blue-300 bg-blue-50/70' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-black text-slate-950">
                      <Bell className="h-4 w-4 text-blue-600" />
                      {safeText(notice.title, 'Notice')}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm font-medium text-slate-500">{safeText(notice.message)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold text-slate-400">{dateLabel(notice.createdAt)}</p>
                    <div className="mt-2"><TenantStatusBadge status={notice.isRead ? 'read' : 'new'} /></div>
                    <button type="button" aria-label="Delete notice" title="Delete notice" onClick={(event) => { event.stopPropagation(); deleteNotice(notice); }} disabled={deletingId === notice._id} className="mt-2 inline-flex h-7 w-7 items-center justify-center rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-60">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </button>
            )) : <EmptyTenantState title="No notices found" description="Landlord announcements will appear here." />}
          </div>
        </TenantPanel>

        <TenantPanel title="Notice Details">
          {selected ? (
            <div className="space-y-4 p-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-wide text-blue-600">{safeText(selected.type, 'notice').replace(/_/g, ' ')}</p>
                <h2 className="mt-2 text-xl font-black text-slate-950">{safeText(selected.title, 'Notice')}</h2>
                <p className="mt-2 text-xs font-semibold text-slate-400">{dateLabel(selected.createdAt)}</p>
              </div>
              <p className="text-sm font-medium leading-7 text-slate-600">{safeText(selected.message, 'No message provided.')}</p>
              <div className="flex flex-wrap gap-3">
                <TenantStatusBadge status={selected.isRead ? 'read' : 'new'} />
                <TenantStatusBadge status={selected.priority || 'medium'} />
              </div>
              <div className="flex flex-wrap gap-2">
                {!selected.isRead && (
                  <button type="button" onClick={() => markRead(selected)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Mark as Read
                  </button>
                )}
                <button type="button" aria-label="Delete notice" title="Delete notice" onClick={() => deleteNotice(selected)} disabled={deletingId === selected._id} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-60">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5"><EmptyTenantState title="No notice selected" description="Select a notice to view details." /></div>
          )}
        </TenantPanel>
      </section>
    </div>
  );
}
