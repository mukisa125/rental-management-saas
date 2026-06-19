import { useState, useEffect } from 'react';
import { Plus, Search, UserPlus } from 'lucide-react';
import DataTable from '../components/DataTable';
import { tenantAPI, propertyAPI, unitAPI } from '../services/api';
import { formatUGX } from '../utils/currency';

const Tenants = () => {
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [allocateLoading, setAllocateLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    property: '',
    unit: '',
    leaseStart: '',
    leaseEnd: '',
    status: 'active',
  });

  const [allocateFormData, setAllocateFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    property: '',
    unit: '',
    leaseStart: '',
    leaseEnd: '',
    rentAmount: '',
    securityDeposit: '',
    emergencyContact: '',
    idNumber: '',
    createPaymentRecords: '12',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [tenantsRes, propertiesRes, unitsRes] = await Promise.all([
        tenantAPI.getAll(),
        propertyAPI.getAll(),
        unitAPI.getAll(),
      ]);
      setTenants(tenantsRes.data);
      setProperties(propertiesRes.data);
      setUnits(unitsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTenant) {
        await tenantAPI.update(editingTenant._id, formData);
      } else {
        await tenantAPI.create(formData);
      }
      setShowModal(false);
      setEditingTenant(null);
      setFormData({ fullName: '', email: '', phone: '', property: '', unit: '', leaseStart: '', leaseEnd: '', status: 'active' });
      fetchData();
    } catch (error) {
      console.error('Error saving tenant:', error);
      alert(error.response?.data?.message || 'Error saving tenant');
    }
  };

  const handleAllocateSubmit = async (e) => {
    e.preventDefault();
    
    // Validate passwords match
    if (allocateFormData.password !== allocateFormData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      setAllocateLoading(true);
      const response = await tenantAPI.allocateWithAccount({
        fullName: allocateFormData.fullName,
        email: allocateFormData.email,
        phone: allocateFormData.phone,
        password: allocateFormData.password,
        property: allocateFormData.property,
        unit: allocateFormData.unit,
        leaseStart: allocateFormData.leaseStart,
        leaseEnd: allocateFormData.leaseEnd,
        rentAmount: parseFloat(allocateFormData.rentAmount),
        securityDeposit: parseFloat(allocateFormData.securityDeposit || 0),
        emergencyContact: allocateFormData.emergencyContact,
        idNumber: allocateFormData.idNumber,
        createPaymentRecords: allocateFormData.createPaymentRecords
      });

      alert(`Tenant allocated successfully! Account created for ${allocateFormData.email}`);
      setShowAllocateModal(false);
      setAllocateFormData({
        fullName: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        property: '',
        unit: '',
        leaseStart: '',
        leaseEnd: '',
        rentAmount: '',
        securityDeposit: '',
        emergencyContact: '',
        idNumber: '',
        createPaymentRecords: '12',
      });
      fetchData();
    } catch (error) {
      console.error('Error allocating tenant:', error);
      alert(error.response?.data?.message || 'Error allocating tenant');
    } finally {
      setAllocateLoading(false);
    }
  };

  const handleEdit = (tenant) => {
    setEditingTenant(tenant);
    setFormData({
      fullName: tenant.fullName,
      email: tenant.email,
      phone: tenant.phone,
      property: tenant.property?._id || '',
      unit: tenant.unit?._id || '',
      leaseStart: tenant.leaseStart?.split('T')[0] || '',
      leaseEnd: tenant.leaseEnd?.split('T')[0] || '',
      status: tenant.status,
    });
    setShowModal(true);
  };

  const handleDelete = async (tenant) => {
    if (window.confirm('Are you sure you want to delete this tenant?')) {
      try {
        await tenantAPI.delete(tenant._id);
        fetchData();
      } catch (error) {
        console.error('Error deleting tenant:', error);
      }
    }
  };

  const columns = [
    { key: 'fullName', label: 'Tenant Name' },
    {
      key: 'property',
      label: 'Property / Unit',
      render: (_, row) => `${row.property?.name || 'N/A'} / ${row.unit?.unitNumber || 'N/A'}`,
    },
    { key: 'phone', label: 'Phone' },
    {
      key: 'leaseEnd',
      label: 'Lease End',
      render: (date) => date?.split('T')[0] || 'N/A',
    },
    {
      key: 'status',
      label: 'Status',
      render: (status) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            status === 'active'
              ? 'bg-green-100 text-green-800'
              : status === 'inactive'
              ? 'bg-gray-100 text-gray-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      ),
    },
  ];

  const filteredTenants = tenants.filter(
    (tenant) =>
      tenant.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.email.toLowerCase().includes(searchTerm.toLowerCase())
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
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setAllocateFormData({
                fullName: '',
                email: '',
                phone: '',
                password: '',
                confirmPassword: '',
                property: '',
                unit: '',
                leaseStart: '',
                leaseEnd: '',
                rentAmount: '',
                securityDeposit: '',
                emergencyContact: '',
                idNumber: '',
                createPaymentRecords: '12',
              });
              setShowAllocateModal(true);
            }}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <UserPlus className="w-5 h-5 mr-2" />
            Quick Allocate
          </button>
          <button
            onClick={() => {
              setEditingTenant(null);
              setFormData({ fullName: '', email: '', phone: '', property: '', unit: '', leaseStart: '', leaseEnd: '', status: 'active' });
              setShowModal(true);
            }}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Tenant
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <DataTable columns={columns} data={filteredTenants} onEdit={handleEdit} onDelete={handleDelete} />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{editingTenant ? 'Edit Tenant' : 'Add New Tenant'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="">Select Unit</option>
                    {units
                      .filter((u) => !formData.property || u.property?._id === formData.property)
                      .map((unit) => (
                        <option key={unit._id} value={unit._id}>
                          {unit.unitNumber}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lease Start</label>
                  <input
                    type="date"
                    value={formData.leaseStart}
                    onChange={(e) => setFormData({ ...formData, leaseStart: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lease End</label>
                  <input
                    type="date"
                    value={formData.leaseEnd}
                    onChange={(e) => setFormData({ ...formData, leaseEnd: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingTenant(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                  {editingTenant ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAllocateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Quick Allocate Tenant</h2>
            <p className="text-gray-600 mb-6 text-sm">Create tenant account, assign property/unit, and set up payments automatically</p>
            <form onSubmit={handleAllocateSubmit}>
              <div className="grid grid-cols-2 gap-4">
                {/* Account Information */}
                <div className="col-span-2">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">Account Information</h3>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={allocateFormData.fullName}
                    onChange={(e) => setAllocateFormData({ ...allocateFormData, fullName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                  <input
                    type="email"
                    value={allocateFormData.email}
                    onChange={(e) => setAllocateFormData({ ...allocateFormData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone *</label>
                  <input
                    type="tel"
                    value={allocateFormData.phone}
                    onChange={(e) => setAllocateFormData({ ...allocateFormData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ID Number</label>
                  <input
                    type="text"
                    value={allocateFormData.idNumber}
                    onChange={(e) => setAllocateFormData({ ...allocateFormData, idNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                  <input
                    type="password"
                    value={allocateFormData.password}
                    onChange={(e) => setAllocateFormData({ ...allocateFormData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label>
                  <input
                    type="password"
                    value={allocateFormData.confirmPassword}
                    onChange={(e) => setAllocateFormData({ ...allocateFormData, confirmPassword: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                {/* Property & Lease Information */}
                <div className="col-span-2">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">Property & Lease</h3>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Property *</label>
                  <select
                    value={allocateFormData.property}
                    onChange={(e) => setAllocateFormData({ ...allocateFormData, property: e.target.value })}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit *</label>
                  <select
                    value={allocateFormData.unit}
                    onChange={(e) => setAllocateFormData({ ...allocateFormData, unit: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="">Select Unit</option>
                    {units
                      .filter((u) => !allocateFormData.property || (u.property?._id === allocateFormData.property && u.status !== 'occupied'))
                      .map((unit) => (
                        <option key={unit._id} value={unit._id}>
                          {unit.unitNumber} ({formatUGX(unit.rentAmount)}/month)
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lease Start *</label>
                  <input
                    type="date"
                    value={allocateFormData.leaseStart}
                    onChange={(e) => setAllocateFormData({ ...allocateFormData, leaseStart: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lease End *</label>
                  <input
                    type="date"
                    value={allocateFormData.leaseEnd}
                    onChange={(e) => setAllocateFormData({ ...allocateFormData, leaseEnd: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                {/* Financial Information */}
                <div className="col-span-2">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 pb-2 border-b">Financial Information</h3>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Rent *</label>
                  <input
                    type="number"
                    value={allocateFormData.rentAmount}
                    onChange={(e) => setAllocateFormData({ ...allocateFormData, rentAmount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Security Deposit</label>
                  <input
                    type="number"
                    value={allocateFormData.securityDeposit}
                    onChange={(e) => setAllocateFormData({ ...allocateFormData, securityDeposit: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Contact</label>
                  <input
                    type="text"
                    value={allocateFormData.emergencyContact}
                    onChange={(e) => setAllocateFormData({ ...allocateFormData, emergencyContact: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Auto-Create Payment Records</label>
                  <select
                    value={allocateFormData.createPaymentRecords}
                    onChange={(e) => setAllocateFormData({ ...allocateFormData, createPaymentRecords: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="0">Do not create</option>
                    <option value="3">Next 3 months</option>
                    <option value="6">Next 6 months</option>
                    <option value="12">Next 12 months (1 year)</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Payment records will be created starting from lease start date</p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAllocateModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={allocateLoading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {allocateLoading ? 'Allocating...' : 'Allocate Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tenants;
