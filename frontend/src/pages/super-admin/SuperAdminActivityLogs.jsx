import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const SuperAdminActivityLogs = () => {
  const { token } = useAuth();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterAction, setFilterAction] = useState('');

  useEffect(() => {
    fetchActivities();
  }, [page, filterAction]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 50 };
      if (filterAction) params.action = filterAction;
      const response = await api.get('/super-admin/activity-logs', { params });
      setActivities(response.data.activities || []);
      setTotalPages(response.data.pagination?.pages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  const getStatusColor = (status) => {
    if (status === 'success') return 'bg-green-100 text-green-800';
    if (status === 'failure') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Activity Logs</h1>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Filter by Action</label>
        <input
          type="text"
          value={filterAction}
          onChange={(e) => {
            setFilterAction(e.target.value);
            setPage(1);
          }}
          placeholder="Search actions..."
          className="w-full px-4 py-2 border rounded"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">User</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Action</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Entity</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">IP Address</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((activity) => (
              <tr key={activity._id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4 text-sm">{activity.user?.name || 'Unknown'}</td>
                <td className="px-6 py-4 text-sm">{activity.action}</td>
                <td className="px-6 py-4 text-sm">{activity.entity}</td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded text-sm font-semibold ${getStatusColor(activity.status)}`}>
                    {activity.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  {new Date(activity.createdAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{activity.ipAddress}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex justify-center gap-2">
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
        >
          Previous
        </button>
        <span className="px-4 py-2">Page {page} of {totalPages}</span>
        <button
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default SuperAdminActivityLogs;
