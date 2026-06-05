import { useState, useEffect } from 'react';
import { Plus, Search, Wrench } from 'lucide-react';
import DataTable from '../components/DataTable';
import { maintenanceAPI, tenantAPI, propertyAPI, unitAPI } from '../services/api';

const Maintenance = () => {
  const [requests, setRequests] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [formData, setFormData] = useState({
    tenant: '',
    property: '',
    unit: '',
    issue: '',
    description: '',
    priority: 'medium',
    status: 'open',
  });

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const fetchData = async () => {
    try {
      const [requestsRes, tenantsRes, propertiesRes, unitsRes] = await Promise.all([
        maintenanceAPI.getAll(statusFilter ? { status: statusFilter } : {}),
        tenantAPI.getAll(),
        propertyAPI.getAll(),
        unitAPI.getAll(),
      ]);
      setRequests(requestsRes.data);
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
      if (editingRequest) {
        await maintenanceAPI.update(editingRequest._id, formData);
      } else {
        await maintenanceAPI.create(formData);
      }
      setShowModal(false);
      setEditingRequest(null);
      setFormData({ tenant: '', property: '', unit: '', issue: '', description: '', priority: 'medium', status: 'open' });
      fetchData();
    } catch (error) {
      console.error('Error saving maintenance request:', error);
    }
  };

  const handleEdit = (request) => {
    setEditingRequest(request);
    setFormData({
      tenant: request.tenant?._id || '',
      property: request.property?._id || '',
      unit: request.unit?._id || '',
      issue: request.issue,
      description: request.description,
      priority: request.priority,
      status: request.status,
    });
    setShowModal(true);
  };

  const handleDelete = async (request) => {
    if (window.confirm('Are you sure you want to delete this maintenance request?')) {
      try {
        await maintenanceAPI.delete(request._id);
        fetchData();
      } catch (error) {
        console.error('Error deleting maintenance request:', error);
      }
    }
  };

  const columns = [
    { key: 'requestId', label: 'Request ID' },
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
    { key: 'issue', label: 'Issue' },
    {
      key: 'priority',
      label: 'Priority',
      render: (priority) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            priority === 'urgent'
              ? 'bg-red-100 text-red-800'
              : priority === 'high'
              ? 'bg-orange-100 text-orange-800'
              : priority === 'medium'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-blue-100 text-blue-800'
          }`}
        >
          {priority.charAt(0).toUpperCase() + priority.slice(1)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (status) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            status === 'resolved'
              ? 'bg-green-100 text-green-800'
              : status === 'in_progress'
              ? 'bg-blue-100 text-blue-800'
              : status === 'open'
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          {status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Date',
      render: (date) => date?.split('T')[0] || 'N/A',
    },
  ];

  const filteredRequests = requests.filter(
    (request) =>
      request.issue?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.tenant?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
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
              placeholder="Search requests..."
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
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <button
          onClick={() => {
            setEditingRequest(null);
            setFormData({ tenant: '', property: '', unit: '', issue: '', description: '', priority: 'medium', status: 'open' });
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          New Request
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <DataTable columns={columns} data={filteredRequests} onEdit={handleEdit} onDelete={handleDelete} />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{editingRequest ? 'Edit Request' : 'New Maintenance Request'}</h2>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Issue</label>
                  <input
                    type="text"
                    value={formData.issue}
                    onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows="3"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingRequest(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                  {editingRequest ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maintenance;
