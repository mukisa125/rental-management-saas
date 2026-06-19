import { useEffect, useState } from 'react';
import { tenantPortalAPI } from '../../services/api';
import { Wrench, Plus, MessageSquare, Calendar } from 'lucide-react';

const TenantMaintenance = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [formData, setFormData] = useState({
    category: 'plumbing',
    priority: 'medium',
    description: ''
  });
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    fetchMaintenanceRequests();
  }, []);

  const fetchMaintenanceRequests = async () => {
    try {
      const response = await tenantPortalAPI.getTenantMaintenanceRequests();
      setRequests(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
      setLoading(false);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    try {
      const response = await tenantPortalAPI.createMaintenanceRequest(formData);
      setRequests([response.data, ...requests]);
      setFormData({ category: 'plumbing', priority: 'medium', description: '' });
      setShowCreateForm(false);
      alert('Maintenance request created successfully!');
    } catch (error) {
      console.error('Error creating request:', error);
      alert('Failed to create maintenance request');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!selectedRequest || !newComment) return;

    try {
      const response = await tenantPortalAPI.addMaintenanceComment(
        selectedRequest._id,
        { comment: newComment }
      );
      setSelectedRequest(response.data);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment');
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

  const categoryEmojis = {
    plumbing: '🚿',
    electrical: '⚡',
    hvac: '❄️',
    structural: '🏗️',
    appliances: '🍳',
    painting: '🎨',
    other: '🔧'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Maintenance Requests</h1>
          <p className="text-gray-600 mt-2">Submit and track maintenance issues with your unit</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
        >
          <Plus className="w-5 h-5" />
          <span>New Request</span>
        </button>
      </div>

      {/* Create Request Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Submit New Maintenance Request</h2>
          <form onSubmit={handleCreateRequest} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
              >
                <option value="plumbing">Plumbing</option>
                <option value="electrical">Electrical</option>
                <option value="hvac">HVAC</option>
                <option value="structural">Structural</option>
                <option value="appliances">Appliances</option>
                <option value="painting">Painting</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="4"
                placeholder="Describe the maintenance issue in detail..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                required
              ></textarea>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
              >
                Submit Request
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Requests List */}
      <div className="space-y-4">
        {requests.length > 0 ? (
          requests.map((request) => (
            <div
              key={request._id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer"
              onClick={() => setSelectedRequest(request)}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-start space-x-4">
                    <span className="text-3xl">{categoryEmojis[request.category] || '🔧'}</span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{request.issue}</h3>
                      <p className="text-gray-600 text-sm mt-1">{request.description}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[request.status]}`}>
                    {request.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t">
                  <div>
                    <p className="text-xs text-gray-600">Priority</p>
                    <p className="font-semibold text-gray-900 text-sm">{request.priority}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Request ID</p>
                    <p className="font-mono text-gray-900 text-xs">{request.requestId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Submitted</p>
                    <p className="font-semibold text-gray-900 text-sm">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Comments</p>
                    <p className="font-semibold text-gray-900 text-sm">{request.comments?.length || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No maintenance requests yet.</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="p-6 border-b sticky top-0 bg-white">
              <div className="flex justify-between items-start">
                <h2 className="text-xl font-bold text-gray-900">{selectedRequest.issue}</h2>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Details */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Status</p>
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedRequest.status]}`}>
                      {selectedRequest.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Priority</p>
                    <p className="font-semibold text-gray-900">{selectedRequest.priority}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Category</p>
                    <p className="font-semibold text-gray-900">{selectedRequest.category}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Request ID</p>
                    <p className="font-mono text-gray-900 text-sm">{selectedRequest.requestId}</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700">{selectedRequest.description}</p>
              </div>

              {/* Comments */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5" />
                  <span>Comments</span>
                </h3>

                <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                  {selectedRequest.comments && selectedRequest.comments.length > 0 ? (
                    selectedRequest.comments.map((comment, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex justify-between items-start">
                          <p className="font-semibold text-sm text-gray-900">
                            {comment.author?.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-600">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{comment.comment}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-600">No comments yet.</p>
                  )}
                </div>

                {/* Add Comment Form */}
                <form onSubmit={handleAddComment} className="flex space-x-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition"
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantMaintenance;
