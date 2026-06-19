import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatUGX } from '../../utils/currency';

const SelfOwnerMaintenance = () => {
  const { token } = useAuth();
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchMaintenance();
  }, [page, filterStatus]);

  const fetchMaintenance = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 50 };
      if (filterStatus) params.status = filterStatus;
      const response = await api.get('/self-owner/maintenance', { params });
      setMaintenance(response.data.maintenance || []);
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
    if (status === 'completed') return 'bg-green-100 text-green-800';
    if (status === 'in_progress') return 'bg-blue-100 text-blue-800';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority) => {
    if (priority === 'urgent') return 'text-red-600';
    if (priority === 'high') return 'text-orange-600';
    if (priority === 'medium') return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Maintenance Requests</h1>

      <div className="mb-4">
        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 border rounded"
        >
          <option value="">All Status</option>
          <option value="submitted">Submitted</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="space-y-4">
        {maintenance.map((request) => (
          <div key={request._id} className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold">{request.category}</h3>
                <p className="text-gray-600 text-sm">{request.issue}</p>
              </div>
              <div className="text-right">
                <span className={`px-3 py-1 rounded text-sm font-semibold ${getStatusColor(request.status)}`}>
                  {request.status}
                </span>
                <p className={`text-sm font-semibold mt-2 ${getPriorityColor(request.priority)}`}>
                  {request.priority.toUpperCase()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded mb-4 text-sm">
              <div>
                <p className="text-gray-600">Property</p>
                <p className="font-semibold">{request.property?.name}</p>
              </div>
              <div>
                <p className="text-gray-600">Unit</p>
                <p className="font-semibold">{request.unit?.unitNumber}</p>
              </div>
              <div>
                <p className="text-gray-600">Estimated Cost</p>
                <p className="font-semibold">{formatUGX(request.estimatedCost)}</p>
              </div>
              <div>
                <p className="text-gray-600">Actual Cost</p>
                <p className="font-semibold text-green-600">{formatUGX(request.cost)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm border-t pt-4">
              <div>
                <p className="text-gray-600">Submitted</p>
                <p className="font-semibold">{new Date(request.submittedDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-gray-600">Expected Completion</p>
                <p className="font-semibold">
                  {request.expectedCompletionDate ? new Date(request.expectedCompletionDate).toLocaleDateString() : '-'}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Assigned To</p>
                <p className="font-semibold">{request.vendor?.name || '-'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-6 flex justify-center gap-2">
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

export default SelfOwnerMaintenance;
