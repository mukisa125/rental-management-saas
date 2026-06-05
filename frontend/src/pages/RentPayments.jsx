import { useState, useEffect } from 'react';
import { Plus, Search, DollarSign } from 'lucide-react';
import DataTable from '../components/DataTable';
import { paymentAPI, tenantAPI, propertyAPI } from '../services/api';

const RentPayments = () => {
  const [payments, setPayments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [formData, setFormData] = useState({
    tenant: '',
    property: '',
    unit: '',
    amount: 0,
    dueDate: '',
    paidDate: '',
    status: 'pending',
    paymentMethod: 'cash',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    try {
      const [paymentsRes, tenantsRes, propertiesRes] = await Promise.all([
        paymentAPI.getAll(statusFilter ? { status: statusFilter } : {}),
        tenantAPI.getAll(),
        propertyAPI.getAll(),
      ]);
      setPayments(paymentsRes.data);
      setTenants(tenantsRes.data);
      setProperties(propertiesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSubmit = {
        ...formData,
        status: formData.paidDate ? 'paid' : formData.status,
      };
      if (editingPayment) {
        await paymentAPI.update(editingPayment._id, dataToSubmit);
      } else {
        await paymentAPI.create(dataToSubmit);
      }
      setShowModal(false);
      setEditingPayment(null);
      setFormData({ tenant: '', property: '', unit: '', amount: 0, dueDate: '', paidDate: '', status: 'pending', paymentMethod: 'cash', notes: '' });
      fetchData();
    } catch (error) {
      console.error('Error saving payment:', error);
    }
  };

  const handleEdit = (payment) => {
    setEditingPayment(payment);
    setFormData({
      tenant: payment.tenant?._id || '',
      property: payment.property?._id || '',
      unit: payment.unit?._id || '',
      amount: payment.amount,
      dueDate: payment.dueDate?.split('T')[0] || '',
      paidDate: payment.paidDate?.split('T')[0] || '',
      status: payment.status,
      paymentMethod: payment.paymentMethod,
      notes: payment.notes || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (payment) => {
    if (window.confirm('Are you sure you want to delete this payment?')) {
      try {
        await paymentAPI.delete(payment._id);
        fetchData();
      } catch (error) {
        console.error('Error deleting payment:', error);
      }
    }
  };

  const columns = [
    {
      key: 'tenant',
      label: 'Tenant',
      render: (tenant) => tenant?.fullName || 'N/A',
    },
    {
      key: 'property',
      label: 'Property / Unit',
      render: (_, row) => `${row.property?.name || 'N/A'} / ${row.unit?.unitNumber || 'N/A'}`,
    },
    { key: 'amount', label: 'Amount (UGX)', render: (amount) => amount?.toLocaleString() || '0' },
    {
      key: 'dueDate',
      label: 'Due Date',
      render: (date) => date?.split('T')[0] || 'N/A',
    },
    {
      key: 'paidDate',
      label: 'Paid Date',
      render: (date) => date?.split('T')[0] || '-',
    },
    {
      key: 'status',
      label: 'Status',
      render: (status) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            status === 'paid'
              ? 'bg-green-100 text-green-800'
              : status === 'pending'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      ),
    },
  ];

  const filteredPayments = payments.filter(
    (payment) =>
      payment.tenant?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.property?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
        <button
          onClick={() => {
            setEditingPayment(null);
            setFormData({ tenant: '', property: '', unit: '', amount: 0, dueDate: '', paidDate: '', status: 'pending', paymentMethod: 'cash', notes: '' });
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Record Payment
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <DataTable columns={columns} data={filteredPayments} onEdit={handleEdit} onDelete={handleDelete} />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{editingPayment ? 'Edit Payment' : 'Record Payment'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tenant</label>
                  <select
                    value={formData.tenant}
                    onChange={(e) => {
                      const tenant = tenants.find((t) => t._id === e.target.value);
                      setFormData({ ...formData, tenant: e.target.value, property: tenant?.property?._id || '', unit: tenant?.unit?._id || '' });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="">Select Tenant</option>
                    {tenants.map((tenant) => (
                      <option key={tenant._id} value={tenant._id}>
                        {tenant.fullName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Property</label>
                  <select
                    value={formData.property}
                    onChange={(e) => setFormData({ ...formData, property: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="">Select Property</option>
                    {properties.map((prop) => (
                      <option key={prop._id} value={prop._id}>
                        {prop.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount (UGX)</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Paid Date</label>
                  <input
                    type="date"
                    value={formData.paidDate}
                    onChange={(e) => setFormData({ ...formData, paidDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="mobile_money">Mobile Money</option>
                    <option value="card">Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows="2"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingPayment(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                  {editingPayment ? 'Update' : 'Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RentPayments;
