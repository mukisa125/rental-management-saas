import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import api from '../../services/api';
import { showToast } from '../../utils/toast';

export default function SelfOwnerNotices() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState('');

  const loadNotices = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/self-owner/notices', { params: { documentType: 'notice', limit: 100 } });
      const list = Array.isArray(data?.documents) ? data.documents : Array.isArray(data?.items) ? data.items : Array.isArray(data?.notices) ? data.notices : [];
      setNotices(list);
      setError('');
    } catch (requestError) {
      setNotices([]);
      setError(requestError?.response?.data?.message || 'Unable to load notices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadNotices(); }, []);

  const submitGeneralNotice = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      setError('Title and message are required.');
      return;
    }
    try {
      setSaving(true);
      setError('');
      const response = await api.post('/self-owner/notices', {
        title: form.title.trim(),
        description: form.description.trim(),
        sourceModule: 'system',
        sourceAction: 'general_notice',
        category: 'System Generated',
        documentType: 'notice',
        accessLevel: 'tenant',
        visibleToTenant: true
      });
      setDialogOpen(false);
      setForm({ title: '', description: '' });
      const recipients = Number(response.data?.noticeRecipientCount) || 0;
      showToast(recipients ? `Notice sent to ${recipients} tenant${recipients === 1 ? '' : 's'}.` : 'Notice saved. No linked tenants were found.');
      await loadNotices();
    } catch (requestError) {
      const message = requestError?.response?.data?.message || 'Failed to send notice.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteNotice = async (noticeId) => {
    if (!noticeId) return;
    if (!window.confirm('Delete this notice?')) return;
    try {
      setDeletingId(noticeId);
      await api.delete(`/self-owner/notices/${noticeId}`);
      showToast('Notice deleted.');
      await loadNotices();
    } catch (requestError) {
      showToast(requestError?.response?.data?.message || 'Failed to delete notice.', 'error');
    } finally {
      setDeletingId('');
    }
  };

  return <div className="min-h-full bg-[#f8fbff] p-6 lg:p-8">
    <p className="text-sm font-semibold text-blue-600">Dashboard / Notices</p>
    <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-2xl font-black text-slate-950">Notices</h2>
      <button type="button" onClick={() => setDialogOpen(true)} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700">General Notice</button>
    </div>
    {error && !dialogOpen ? <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
    <div className="mt-6 space-y-3">
      {loading ? <article className="rounded-lg border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500">Loading notices...</article> : null}
      {!loading && notices.map((notice) => <article key={notice._id} className="rounded-lg border border-slate-200 bg-white p-5"><div className="flex items-start justify-between gap-3"><h3 className="font-black text-slate-900">{notice.title || 'Untitled notice'}</h3><button type="button" aria-label="Delete notice" title="Delete notice" disabled={deletingId === notice._id} onClick={() => deleteNotice(notice._id)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-60"><Trash2 className="h-4 w-4" /></button></div><p className="mt-2 text-sm text-slate-600">{notice.description || notice.notes || '-'}</p></article>)}
      {!loading && !error && !notices.length ? <article className="rounded-lg border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500">No notices found.</article> : null}
    </div>
    {!dialogOpen ? null : (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
        <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900">Send General Notice</h3>
            <button type="button" onClick={() => setDialogOpen(false)} className="rounded-md px-2 py-1 text-sm font-bold text-slate-500 hover:bg-slate-100">✕</button>
          </div>
          {error ? <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
          <label className="mb-3 block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Title</span>
            <input value={form.title} onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" placeholder="Enter notice title" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Message</span>
            <textarea value={form.description} onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))} className="min-h-[140px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" placeholder="Write your notice to all tenants" />
          </label>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={() => setDialogOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="button" onClick={submitGeneralNotice} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? 'Sending...' : 'Send Notice'}</button>
          </div>
        </div>
      </div>
    )}
  </div>;
}
