import { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import DataTable from '../components/DataTable';
import { unitAPI, propertyAPI } from '../services/api';
import { formatUGX } from '../utils/currency';

const Units = () => {
  const [units, setUnits] = useState([]);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    unitNumber: '',
    property: '',
    rentAmount: 0,
    bedrooms: 1,
    bathrooms: 1,
    area: 0,
    status: 'vacant',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [unitsRes, propertiesRes] = await Promise.all([
        unitAPI.getAll(),
        propertyAPI.getAll(),
      ]);
      setUnits(unitsRes.data);
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
      if (editingUnit) {
        await unitAPI.update(editingUnit._id, formData);
      } else {
        await unitAPI.create(formData);
      }
      setShowModal(false);
      setEditingUnit(null);
      setFormData({ unitNumber: '', property: '', rentAmount: 0, bedrooms: 1, bathrooms: 1, area: 0, status: 'vacant' });
      fetchData();
    } catch (error) {
      console.error('Error saving unit:', error);
    }
  };

  const handleEdit = (unit) => {
    setEditingUnit(unit);
    setFormData({
      unitNumber: unit.unitNumber,
      property: unit.property?._id || '',
      rentAmount: unit.rentAmount,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      area: unit.area,
      status: unit.status,
    });
    setShowModal(true);
  };

  const handleDelete = async (unit) => {
    if (window.confirm('Are you sure you want to delete this unit?')) {
      try {
        await unitAPI.delete(unit._id);
        fetchData();
      } catch (error) {
        console.error('Error deleting unit:', error);
      }
    }
  };

  const columns = [
    { key: 'unitNumber', label: 'Unit Number' },
    {
      key: 'property',
      label: 'Property',
      render: (property) => property?.name || 'N/A',
    },
    { key: 'rentAmount', label: 'Rent Amount', render: (amount) => formatUGX(amount) },
    { key: 'bedrooms', label: 'Bedrooms' },
    { key: 'bathrooms', label: 'Bathrooms' },
    {
      key: 'status',
      label: 'Status',
      render: (status) => (
        <span
          className={`px-3 py-1 rounded-full text-xs font-medium ${
            status === 'occupied'
              ? 'bg-green-100 text-green-800'
              : status === 'vacant'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      ),
    },
  ];

  const filteredUnits = units.filter(
    (unit) =>
      unit.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      unit.property?.name?.toLowerCase().includes(searchTerm.toLowerCase())
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
            placeholder="Search units..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <button
          onClick={() => {
            setEditingUnit(null);
            setFormData({ unitNumber: '', property: '', rentAmount: 0, bedrooms: 1, bathrooms: 1, area: 0, status: 'vacant' });
            setShowModal(true);
          }}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Unit
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <DataTable columns={columns} data={filteredUnits} onEdit={handleEdit} onDelete={handleDelete} />
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">{editingUnit ? 'Edit Unit' : 'Add New Unit'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Unit Number</label>
                  <input
                    type="text"
                    value={formData.unitNumber}
                    onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Rent Amount (UGX)</label>
                  <input
                    type="number"
                    value={formData.rentAmount}
                    onChange={(e) => setFormData({ ...formData, rentAmount: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bedrooms</label>
                    <input
                      type="number"
                      value={formData.bedrooms}
                      onChange={(e) => setFormData({ ...formData, bedrooms: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bathrooms</label>
                    <input
                      type="number"
                      value={formData.bathrooms}
                      onChange={(e) => setFormData({ ...formData, bathrooms: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Area (sq ft)</label>
                  <input
                    type="number"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="vacant">Vacant</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingUnit(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                  {editingUnit ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Units;
