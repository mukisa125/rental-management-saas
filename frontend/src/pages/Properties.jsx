import { useState, useEffect } from 'react';
import { Plus, Search, User, Mail, Phone, Building2, Lock } from 'lucide-react';
import DataTable from '../components/DataTable';
import { propertyAPI, ownerManagementAPI } from '../services/api';

const Properties = () => {
  const [properties, setProperties] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    description: '',
    totalUnits: 0,
    owner: '',
    status: 'active',
  });

  const [ownerFormData, setOwnerFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    company: '',
  });

  useEffect(() => {
    fetchProperties();
    fetchOwners();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await propertyAPI.getAll();
      setProperties(response.data);
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOwners = async () => {
    try {
      const response = await ownerManagementAPI.getAll();
      setOwners(response.data);
    } catch (error) {
      console.error('Error fetching owners:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProperty) {
        await propertyAPI.update(editingProperty._id, formData);
      } else {
        await propertyAPI.create(formData);
      }
      setShowModal(false);
      setEditingProperty(null);
      setFormData({ name: '', location: '', description: '', totalUnits: 0, owner: '', status: 'active' });
      fetchProperties();
    } catch (error) {
      console.error('Error saving property:', error);
    }
  };

  const handleEdit = (property) => {
    setEditingProperty(property);
    setFormData({
      name: property.name,
      location: property.location,
      description: property.description,
      totalUnits: property.totalUnits,
      owner: property.owner?._id || property.owner || '',
      status: property.status,
    });
    setShowModal(true);
  };

  const handleDelete = async (property) => {
    if (window.confirm('Are you sure you want to delete this property?')) {
      try {
        await propertyAPI.delete(property._id);
        fetchProperties();
      } catch (error) {
        console.error('Error deleting property:', error);
      }
    }
  };

  const handleCreateOwner = async (e) => {
    e.preventDefault();
    try {
      await ownerManagementAPI.create(ownerFormData);
      setShowOwnerModal(false);
      setOwnerFormData({ name: '', email: '', password: '', phone: '', company: '' });
      fetchOwners();
    } catch (error) {
      console.error('Error creating owner:', error);
      alert(error.response?.data?.message || 'Error creating owner');
    }
  };

  const columns = [
    { key: 'name', label: 'Property Name' },
    { key: 'location', label: 'Location' },
    { key: 'totalUnits', label: 'Units' },
    { key: 'occupiedUnits', label: 'Occupied' },
    { key: 'vacantUnits', label: 'Vacant' },
    {
      key: 'owner',
      label: 'Owner',
      render: (owner) => (
        <span>{typeof owner === 'object' ? owner?.name : 'Unassigned'}</span>
      ),
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

  const filteredProperties = properties.filter(
    (property) =>
      property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.location.toLowerCase().includes(searchTerm.toLowerCase())
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
            placeholder="Search properties..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowOwnerModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <User className="w-5 h-5 mr-2" />
            Add Property Owner
          </button>
          <button
            onClick={() => {
              setEditingProperty(null);
              setFormData({ name: '', location: '', description: '', totalUnits: 0, owner: '', status: 'active' });
              setShowModal(true);
            }}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Property
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <DataTable
          columns={columns}
          data={filteredProperties}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {editingProperty ? 'Edit Property' : 'Add New Property'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Units
                  </label>
                  <input
                    type="number"
                    value={formData.totalUnits}
                    onChange={(e) => setFormData({ ...formData, totalUnits: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Owner
                  </label>
                  <select
                    value={formData.owner}
                    onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="">Select an owner</option>
                    {owners.map((owner) => (
                      <option key={owner._id} value={owner._id}>
                        {owner.name} ({owner.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingProperty(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  {editingProperty ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Property Owner Modal */}
      {showOwnerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-96 overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Add New Property Owner</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Form Section */}
              <form onSubmit={handleCreateOwner} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={ownerFormData.name}
                    onChange={(e) => setOwnerFormData({ ...ownerFormData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={ownerFormData.email}
                    onChange={(e) => setOwnerFormData({ ...ownerFormData, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={ownerFormData.password}
                    onChange={(e) => setOwnerFormData({ ...ownerFormData, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={ownerFormData.phone}
                    onChange={(e) => setOwnerFormData({ ...ownerFormData, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company (Optional)
                  </label>
                  <input
                    type="text"
                    value={ownerFormData.company}
                    onChange={(e) => setOwnerFormData({ ...ownerFormData, company: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </form>

              {/* Account Details Preview Section */}
              <div className="bg-gradient-to-br from-primary-50 to-blue-50 rounded-lg p-4 border border-primary-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2 text-primary-600" />
                  Account Details
                </h3>

                <div className="space-y-3">
                  {/* Full Name */}
                  <div className="bg-white rounded-lg p-3 border border-primary-100">
                    <p className="text-xs font-medium text-gray-600 uppercase mb-1">Full Name</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {ownerFormData.name || '—'}
                    </p>
                  </div>

                  {/* Email */}
                  <div className="bg-white rounded-lg p-3 border border-primary-100">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-primary-600" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-600 uppercase">Email</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {ownerFormData.email || '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="bg-white rounded-lg p-3 border border-primary-100">
                    <div className="flex items-center space-x-2">
                      <Lock className="w-4 h-4 text-primary-600" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-600 uppercase">Password</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {ownerFormData.password ? '••••••••' : '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Phone */}
                  {ownerFormData.phone && (
                    <div className="bg-white rounded-lg p-3 border border-primary-100">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-primary-600" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-600 uppercase">Phone</p>
                          <p className="text-sm font-semibold text-gray-900">{ownerFormData.phone}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Company */}
                  {ownerFormData.company && (
                    <div className="bg-white rounded-lg p-3 border border-primary-100">
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-primary-600" />
                        <div className="flex-1">
                          <p className="text-xs font-medium text-gray-600 uppercase">Company</p>
                          <p className="text-sm font-semibold text-gray-900">{ownerFormData.company}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Role */}
                  <div className="bg-primary-100 rounded-lg p-3 border border-primary-200">
                    <p className="text-xs font-medium text-gray-600 uppercase mb-1">Role</p>
                    <p className="text-sm font-semibold text-primary-900">Property Owner</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowOwnerModal(false);
                  setOwnerFormData({ name: '', email: '', password: '', phone: '', company: '' });
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOwner}
                disabled={!ownerFormData.name || !ownerFormData.email || !ownerFormData.password}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400"
              >
                Create Owner Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Properties;
