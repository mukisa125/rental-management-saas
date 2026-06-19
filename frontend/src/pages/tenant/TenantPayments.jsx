import { useEffect, useState } from 'react';
import { tenantPortalAPI } from '../../services/api';
import { DollarSign, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { formatUGX } from '../../utils/currency';

const TenantPayments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchPayments();
  }, [filterStatus]);

  const fetchPayments = async () => {
    try {
      const params = filterStatus ? { status: filterStatus } : {};
      const response = await tenantPortalAPI.getPayments(params);
      setPayments(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching payments:', error);
      setLoading(false);
    }
  };

  const handleDownloadReceipt = (payment) => {
    // Implementation for downloading receipt
    alert(`Downloading receipt for payment: ${payment.receiptNumber}`);
  };

  const handleDownloadInvoice = (payment) => {
    // Implementation for downloading invoice
    alert(`Downloading invoice for payment: ${payment._id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const statusColors = {
    paid: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    overdue: 'bg-red-100 text-red-800',
    partial: 'bg-orange-100 text-orange-800'
  };

  const totalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalPending = payments
    .filter(p => p.status === 'pending')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalOverdue = payments
    .filter(p => p.status === 'overdue')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payment History</h1>
        <p className="text-gray-600 mt-2">View and download your payment receipts and invoices</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Paid</p>
              <p className="text-2xl font-bold text-green-600 mt-2">{formatUGX(totalPaid)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600 mt-2">{formatUGX(totalPending)}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-red-600 mt-2">{formatUGX(totalOverdue)}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Filter Payments</h3>
        <div className="flex space-x-2 flex-wrap">
          <button
            onClick={() => setFilterStatus('')}
            className={`px-4 py-2 rounded-lg transition ${
              filterStatus === '' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('paid')}
            className={`px-4 py-2 rounded-lg transition ${
              filterStatus === 'paid' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Paid
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-lg transition ${
              filterStatus === 'pending' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilterStatus('overdue')}
            className={`px-4 py-2 rounded-lg transition ${
              filterStatus === 'overdue' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Overdue
          </button>
        </div>
      </div>

      {/* Payment List */}
      <div className="space-y-4">
        {payments.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Due Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Amount</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Method</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Receipt</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payments.map((payment) => (
                    <tr key={payment._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm">
                        {new Date(payment.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold">
                        {formatUGX(payment.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[payment.status]}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {payment.paymentMethod || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-gray-600">
                        {payment.receiptNumber}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex space-x-2">
                          {payment.status === 'paid' && (
                            <button
                              onClick={() => handleDownloadReceipt(payment)}
                              className="flex items-center space-x-1 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                            >
                              <Download className="w-4 h-4" />
                              <span>Receipt</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleDownloadInvoice(payment)}
                            className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                          >
                            <Download className="w-4 h-4" />
                            <span>Invoice</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No payments found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantPayments;
