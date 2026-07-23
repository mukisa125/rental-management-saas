import { useEffect, useState } from 'react';
import api from '../../services/api';
import { showToast } from '../../utils/toast';

const defaultForm = {
  title: '',
  message: '',
  audience: 'all_users'
};

const SuperAdminAnnouncements = () => {
  const [form, setForm] = useState(defaultForm);
  const [announcements, setAnnouncements] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchAnnouncements = async () => {
      try {
        const response = await api.get('/super-admin/announcements');
        if (mounted) {
          setAnnouncements(Array.isArray(response.data?.announcements) ? response.data.announcements : []);
        }
      } catch {
        if (mounted) {
          setAnnouncements([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    fetchAnnouncements();
    return () => {
      mounted = false;
    };
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await api.get('/super-admin/announcements');
      setAnnouncements(Array.isArray(response.data?.announcements) ? response.data.announcements : []);
    } catch {
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.message.trim()) {
      showToast('Please add both title and message', 'error');
      return;
    }
    try {
      setSaving(true);
      await api.post('/super-admin/announcements', form);
      showToast('Settings saved successfully', 'success');
      setForm(defaultForm);
      loadAnnouncements();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to send announcement', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-6 space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Announcements</h1>
        <p className="mt-1 text-sm text-slate-500">Send notices to all users, landlords, tenants, or property seekers.</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
        <input
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          placeholder="Announcement title"
        />
        <textarea
          value={form.message}
          onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[120px]"
          placeholder="Announcement message"
        />
        <select
          value={form.audience}
          onChange={(event) => setForm((prev) => ({ ...prev, audience: event.target.value }))}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="all_users">All Users</option>
          <option value="landlords">Landlords Only</option>
          <option value="tenants">Tenants Only</option>
          <option value="property_seekers">Property Seekers Only</option>
        </select>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
        >
          {saving ? 'Sending...' : 'Send Announcement'}
        </button>
      </form>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-3">Recent Announcements</h2>
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : announcements.length === 0 ? (
          <p className="text-sm text-slate-500">No records found</p>
        ) : (
          <div className="space-y-3">
            {announcements.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                <p className="font-semibold text-slate-900">{item.title || 'N/A'}</p>
                <p className="text-sm text-slate-600 mt-1">{item.message || 'N/A'}</p>
                <p className="text-xs text-slate-500 mt-2">
                  Audience: {item.audience || 'all_users'} - {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'N/A'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminAnnouncements;
