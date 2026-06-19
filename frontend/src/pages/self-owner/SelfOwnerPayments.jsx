import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { formatUGX } from '../../utils/currency';

const SelfOwnerPayments = () => {
  const { token } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchPayments();
  }, [page, filterStatus]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const params = { page, limit: 50 };
      if (filterStatus) params.status = filterStatus;
      const response = await api.get('/self-owner/payments', { params });
      setPayments(response.data.payments || []);
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
    if (status === 'paid') return 'bg-green-100 text-green-800';
    if (status === 'overdue') return 'bg-red-100 text-red-800';
    if (status === 'pending') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Payments</h1>

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
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      <div className="responsive-table bg-white rounded-lg shadow">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold">Tenant</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Amount</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Due Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Paid Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold">Receipt</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment._id} className="border-b hover:bg-gray-50">
                <td className="px-6 py-4">{payment.tenant?.firstName} {payment.tenant?.lastName}</td>
                <td className="px-6 py-4 font-semibold">{formatUGX(payment.amount)}</td>
                <td className="px-6 py-4 text-sm">{new Date(payment.dueDate).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-sm">
                  {payment.paidDate ? new Date(payment.paidDate).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-3 py-1 rounded text-sm font-semibold ${getStatusColor(payment.status)}`}>
                    {payment.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  {payment.receiptNumber && (
                    <a href="#" className="text-blue-600 hover:underline">
                      {payment.receiptNumber}
                    </a>
                  )}
                </td>
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

export default SelfOwnerPayments;
