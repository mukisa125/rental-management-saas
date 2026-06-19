import { useEffect, useState } from 'react';
import { ownerAPI } from '../../services/api';
import { Wrench, AlertCircle, CheckCircle } from 'lucide-react';
import { formatUGX } from '../../utils/currency';

const OwnerMaintenance = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchMaintenanceRequests();
  }, [filterStatus]);

  const fetchMaintenanceRequests = async () => {
    try {
      const params = filterStatus ? { status: filterStatus } : {};
      const response = await ownerAPI.getMaintenanceRequests(params);
      setRequests(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
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

  const statusColors = {
    submitted: 'bg-blue-100 text-blue-800',
    assigned: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800'
  };

  const priorityColors = {
    low: 'text-gray-600',
    medium: 'text-yellow-600',
    high: 'text-orange-600',
    urgent: 'text-red-600'
  };

  const getPriorityIcon = (priority) => {
    if (priority === 'urgent' || priority === 'high') {
      return <AlertCircle className="w-5 h-5" />;
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Maintenance Requests</h1>
        <p className="text-gray-600 mt-2">Monitor maintenance requests across your properties</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Filters</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setFilterStatus('')}
            className={`px-4 py-2 rounded-lg transition ${
              filterStatus === '' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterStatus('submitted')}
            className={`px-4 py-2 rounded-lg transition ${
              filterStatus === 'submitted' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Submitted
          </button>
          <button
            onClick={() => setFilterStatus('in_progress')}
            className={`px-4 py-2 rounded-lg transition ${
              filterStatus === 'in_progress' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            In Progress
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-4 py-2 rounded-lg transition ${
              filterStatus === 'completed' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {requests.length > 0 ? (
          requests.map((request) => (
            <div
              key={request._id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{request.issue}</h3>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[request.status] || 'bg-gray-100'}`}
                    >
                      {request.status}
                    </span>
                  </div>
                  <p className="text-gray-600">{request.description}</p>
                </div>
                <div className="text-right">
                  <div className={`flex items-center space-x-1 mb-2 ${priorityColors[request.priority]}`}>
                    {getPriorityIcon(request.priority)}
                    <span className="text-sm font-medium">{request.priority}</span>
                  </div>
                  {request.cost && (
                    <p className="text-lg font-bold text-gray-900">{formatUGX(request.cost)}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-b">
                <div>
                  <p className="text-sm text-gray-600">Property</p>
                  <p className="font-semibold text-gray-900">{request.property?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Unit</p>
                  <p className="font-semibold text-gray-900">{request.unit?.unitNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Tenant</p>
                  <p className="font-semibold text-gray-900">{request.tenant?.fullName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Assigned To</p>
                  <p className="font-semibold text-gray-900">
                    {request.assignedTo?.name || 'Unassigned'}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Request ID: <span className="font-mono font-semibold">{request.requestId}</span>
                </p>
                {request.resolvedDate && (
                  <p className="text-sm text-gray-600">
                    Resolved: <span className="font-semibold">{new Date(request.resolvedDate).toLocaleDateString()}</span>
                  </p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No maintenance requests found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OwnerMaintenance;
