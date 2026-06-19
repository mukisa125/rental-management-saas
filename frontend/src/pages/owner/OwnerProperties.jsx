import { useEffect, useState } from 'react';
import { ownerAPI } from '../../services/api';
import DataTable from '../../components/DataTable';
import { Building2, Users, DollarSign } from 'lucide-react';

const OwnerProperties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await ownerAPI.getProperties();
      setProperties(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching properties:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const columns = [
    { header: 'Property Name', accessor: 'name' },
    { header: 'Location', accessor: 'location' },
    {
      header: 'Units',
      accessor: 'totalUnits',
      cell: (row) => (
        <div className="flex items-center space-x-2">
          <Users className="w-4 h-4" />
          <span>{row.totalUnits}</span>
        </div>
      )
    },
    {
      header: 'Occupied',
      accessor: 'occupiedUnits',
      cell: (row) => (
        <div className="flex items-center space-x-2">
          <div className="w-16 bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full"
              style={{ width: `${(row.occupiedUnits / row.totalUnits) * 100}%` }}
            ></div>
          </div>
          <span>{row.occupiedUnits}/{row.totalUnits}</span>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (row) => (
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          row.status === 'active' ? 'bg-green-100 text-green-800' :
          row.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {row.status}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Properties</h1>
        <p className="text-gray-600 mt-2">Read-only view of your properties and occupancy status.</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Properties Overview</h2>
          {properties.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {properties.map((property) => (
                <div key={property._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{property.name}</h3>
                      <p className="text-gray-600 text-sm mt-1">{property.location}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      property.status === 'active' ? 'bg-green-100 text-green-800' :
                      property.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {property.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <p className="text-gray-600 text-sm">Total Units</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{property.totalUnits}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Occupied Units</p>
                      <p className="text-2xl font-bold text-green-600 mt-1">{property.occupiedUnits}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm">Vacant Units</p>
                      <p className="text-2xl font-bold text-red-600 mt-1">{property.vacantUnits}</p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(property.occupiedUnits / property.totalUnits) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-gray-600 text-xs mt-1">
                      {((property.occupiedUnits / property.totalUnits) * 100).toFixed(0)}% Occupied
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No properties found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OwnerProperties;
