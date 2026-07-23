import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';

const SuperAdminActivityLogs = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    let mounted = true;
    const fetchActivities = async () => {
      try {
        if (mounted) {
          setLoading(true);
          setError('');
        }
        const response = await api.get('/super-admin/activity-logs', { params: { page, limit: 50 } });
        if (!mounted) return;
        setActivities(Array.isArray(response.data?.activities) ? response.data.activities : []);
        setTotalPages(response.data?.pagination?.pages || 1);
      } catch (err) {
        if (mounted) {
          setError(err.response?.data?.message || err.message || 'Failed to load activity logs');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    fetchActivities();
    return () => {
      mounted = false;
    };
  }, [page]);

  const filteredActivities = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return activities.filter((activity) => {
      const matchesSearch = !search
        || String(activity.action || '').toLowerCase().includes(search)
        || String(activity.entity || '').toLowerCase().includes(search)
        || String(activity.user?.name || '').toLowerCase().includes(search)
        || String(activity.ipAddress || '').toLowerCase().includes(search);
      const matchesStatus = !statusFilter || String(activity.status || '').toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [activities, searchTerm, statusFilter]);

  const getStatusClass = (status) => {
    if (status === 'success') return 'bg-green-100 text-green-700';
    if (status === 'failure') return 'bg-red-100 text-red-700';
    return 'bg-slate-100 text-slate-700';
  };

  if (loading) return <div className="p-6 text-sm text-slate-500">Loading...</div>;
  if (error) return <div className="p-6 text-sm text-red-600">{error}</div>;

  return (
    <div className="p-6 bg-slate-50 min-h-screen space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">Activity Logs</h1>
        <p className="mt-1 text-sm text-slate-500">Track system activities for landlords, tenants, and seekers.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1 min-w-[220px]">
            <label className="mb-1 block text-xs font-semibold text-slate-500">Search</label>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search user, action, entity, IP..."
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="min-w-[180px]">
            <label className="mb-1 block text-xs font-semibold text-slate-500">Status</label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">All</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {filteredActivities.length === 0 ? (
          <div className="p-6 text-sm text-slate-500">No records found</div>
        ) : (
          <div className="responsive-table overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">User</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                  <th className="px-4 py-3 font-semibold">Entity</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredActivities.map((activity) => (
                  <tr key={activity._id} className="hover:bg-blue-50/40">
                    <td className="px-4 py-3">{activity.user?.name || 'Unknown'}</td>
                    <td className="px-4 py-3">{activity.action || 'N/A'}</td>
                    <td className="px-4 py-3">{activity.entity || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusClass(activity.status)}`}>
                        {activity.status || 'N/A'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{activity.createdAt ? new Date(activity.createdAt).toLocaleDateString() : 'N/A'}</td>
                    <td className="px-4 py-3">{activity.ipAddress || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page <= 1}
          className="rounded-md border border-slate-200 px-3 py-1 text-sm disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
        <button
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page >= totalPages}
          className="rounded-md border border-slate-200 px-3 py-1 text-sm disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default SuperAdminActivityLogs;
