import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatUGX } from '../../utils/currency';

const SelfOwnerTenants = () => {
  const { token } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchTenants();
  }, [page, filterStatus]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 50 };
      if (filterStatus) params.status = filterStatus;
      const response = await api.get('/self-owner/tenants', { params });
      setTenants(response.data.tenants || []);
      setTotalPages(response.data.pagination?.pages || 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Tenants</h1>

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
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="pending">Pending</option>
          <option value="terminated">Terminated</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tenants.map((tenant) => (
          <div key={tenant._id} className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-bold mb-2">{tenant.firstName} {tenant.lastName}</h3>
            <div className="space-y-1 text-sm mb-4">
              <p><span className="font-medium">Email:</span> {tenant.email}</p>
              <p><span className="font-medium">Phone:</span> {tenant.phone}</p>
              <p><span className="font-medium">Property:</span> {tenant.property?.name}</p>
              <p><span className="font-medium">Unit:</span> {tenant.unit?.unitNumber}</p>
            </div>
            <div className="space-y-1 text-sm border-t pt-3">
              <p><span className="font-medium">Status:</span> 
                <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                  tenant.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {tenant.status}
                </span>
              </p>
              <p><span className="font-medium">Lease End:</span> {new Date(tenant.leaseEnd).toLocaleDateString()}</p>
              <p><span className="font-medium">Outstanding:</span> {formatUGX(tenant.outstandingBalance)}</p>
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

export default SelfOwnerTenants;
