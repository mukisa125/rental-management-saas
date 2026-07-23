import { useEffect, useState } from 'react';
import { tenantPortalAPI } from '../../services/api';
import {
  validateImageCount,
  processImages
} from '../../utils/imageCompression';
import { Wrench, Plus, MessageSquare, Calendar, Upload, Trash2, X, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
import { StatusBadge, PriorityBadge } from '../../components/maintenance/BadgeHelpers';

const statusTabs = [
  { value: 'all', label: 'All' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
];

export default function TenantMaintenance() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const [formData, setFormData] = useState({
    issueType: 'other',
    priority: 'medium',
    description: '',
    contactPhone: '',
    availableTime: ''
  });

  const [images, setImages] = useState([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const [imageError, setImageError] = useState('');
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    fetchMaintenanceRequests();
  }, [statusFilter]);

  const fetchMaintenanceRequests = async () => {
    try {
      const response = await tenantPortalAPI.getTenantMaintenanceRequests({ status: statusFilter });
      setRequests(response.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching maintenance requests:', error);
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const files = e.target.files;
    if (!files) return;

    setImageError('');

    try {
      const incomingFiles = Array.from(files);
      const countValidation = validateImageCount(images.length, incomingFiles.length);
      if (!countValidation.valid) {
        setImageError(countValidation.error);
        return;
      }

      const remainingSlots = 3 - images.length;
      const processedImages = await processImages(incomingFiles, remainingSlots);
      const newPreviews = processedImages.map((img) => img.base64);

      setImages((prev) => [...prev, ...processedImages]);
      setImagePreviewUrls((prev) => [...prev, ...newPreviews]);

      e.target.value = '';
    } catch (error) {
      setImageError(error.message);
    }
  };

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviewUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();

    if (!formData.description.trim() || formData.description.trim().length < 10) {
      setImageError('Description must be at least 10 characters');
      return;
    }

    try {
      const requestData = {
        ...formData,
        issueImages: images,
        source: 'tenant_portal'
      };

      const response = await tenantPortalAPI.createMaintenanceRequest(requestData);
      setRequests([response.data, ...requests]);
      setFormData({
        issueType: 'other',
        priority: 'medium',
        description: '',
        contactPhone: '',
        availableTime: ''
      });
      setImages([]);
      setImagePreviewUrls([]);
      setImageError('');
      setShowCreateForm(false);
      window.dispatchEvent(new Event('maintenance-updated'));
      alert('Maintenance request created successfully!');
    } catch (error) {
      console.error('Error creating request:', error);
      alert(error.response?.data?.message || 'Failed to create maintenance request');
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!selectedRequest || !newComment.trim()) return;

    try {
      const response = await tenantPortalAPI.addMaintenanceComment(
        selectedRequest._id,
        { comment: newComment }
      );
      setSelectedRequest(response.data);
      setRequests((currentRequests) => currentRequests.map((request) =>
        request._id === response.data._id ? response.data : request
      ));
      setNewComment('');
      window.dispatchEvent(new Event('maintenance-updated'));
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment');
    }
  };

  const handleOpenRequest = async (request) => {
    try {
      const response = await tenantPortalAPI.getMaintenanceDetail(request._id);
      setSelectedRequest(response.data);
    } catch {
      setSelectedRequest(request);
    }
  };

  const handleCancelRequest = async (request) => {
    if (!window.confirm('Cancel this maintenance request?')) return;
    try {
      const response = await tenantPortalAPI.cancelMaintenanceRequest(request._id);
      setRequests((currentRequests) => currentRequests.map((item) => item._id === request._id ? response.data : item));
      setSelectedRequest(response.data);
      window.dispatchEvent(new Event('maintenance-updated'));
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to cancel maintenance request');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-600"></div>
      </div>
    );
  }

  const statusColors = {
    submitted: 'bg-blue-100 text-blue-800',
    pending: 'bg-slate-100 text-slate-700',
    approved: 'bg-blue-100 text-blue-700',
    assigned: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-orange-100 text-orange-800',
    completed: 'bg-green-100 text-green-800',
    rejected: 'bg-rose-100 text-rose-800',
    cancelled: 'bg-slate-100 text-slate-700'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Maintenance Requests
          </h1>
          <p className="text-slate-600 mt-2">
            Track and manage your maintenance requests.
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
        >
          <Plus className="w-5 h-5" />
          New Request
        </button>
      </div>

      {/* Create Request Form */}
      {showCreateForm && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Submit Maintenance Request</h2>
          <form onSubmit={handleCreateRequest} className="space-y-4">
            {/* Issue Type and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Issue Type *
                </label>
                <select
                  value={formData.issueType}
                  onChange={(e) =>
                    setFormData({ ...formData, issueType: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="plumbing">Plumbing</option>
                  <option value="electrical">Electrical</option>
                  <option value="door_window">Door/Window</option>
                  <option value="roofing">Roofing</option>
                  <option value="painting">Painting</option>
                  <option value="security">Security</option>
                  <option value="cleaning">Cleaning</option>
                  <option value="appliance">Appliance</option>
                  <option value="internet">Internet</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows="4"
                placeholder="Describe the maintenance issue in detail..."
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                required
              ></textarea>
              <p className="mt-1 text-xs text-slate-500">
                {formData.description.length} characters
              </p>
            </div>

            {/* Contact Phone and Available Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) =>
                    setFormData({ ...formData, contactPhone: e.target.value })
                  }
                  placeholder="Your phone number"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Available Time
                </label>
                <input
                  type="text"
                  value={formData.availableTime}
                  onChange={(e) =>
                    setFormData({ ...formData, availableTime: e.target.value })
                  }
                  placeholder="e.g., 9 AM - 5 PM"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                Issue Images (Max 3)
              </label>
              <label htmlFor="image-upload" className="block cursor-pointer rounded-lg border-2 border-dashed border-slate-200 p-6 text-center">
                <Upload className="mx-auto h-6 w-6 text-slate-400" />
                <p className="mt-2 text-sm font-semibold text-slate-700">
                  Click to upload issue images
                </p>
                <p className="text-xs text-slate-500">JPG, PNG, WEBP up to 300 KB each</p>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-upload"
                />
              </label>
              {imageError && (
                <p className="mt-2 text-xs text-rose-600">{imageError}</p>
              )}
            </div>

            {/* Image Previews */}
            {imagePreviewUrls.length > 0 && (
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 block">
                  Selected Images ({imagePreviewUrls.length}/3)
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {imagePreviewUrls.map((url, idx) => (
                    <div key={idx} className="group relative overflow-hidden rounded-lg">
                      <img
                        src={url}
                        alt={`Preview ${idx + 1}`}
                        className="h-24 w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/50"
                      >
                        <Trash2 className="h-5 w-5 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit and Cancel */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
              >
                Submit Request
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setFormData({
                    issueType: 'other',
                    priority: 'medium',
                    description: '',
                    contactPhone: '',
                    availableTime: ''
                  });
                  setImages([]);
                  setImagePreviewUrls([]);
                  setImageError('');
                }}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatusFilter(tab.value)}
            className={`rounded-lg px-4 py-2 text-sm font-bold ${statusFilter === tab.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {requests.length > 0 ? (
          requests.map((request) => (
            <button
              key={request._id}
              onClick={() => handleOpenRequest(request)}
              className="w-full text-left bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-shadow"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-slate-900">
                      {request.issue || request.issueType}
                    </h3>
                    <p className="text-slate-600 text-sm mt-1 line-clamp-2">
                      {request.description}
                    </p>
                  </div>
                  <StatusBadge status={request.status || 'pending'} />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 py-4 border-t border-slate-200">
                  <div>
                    <p className="text-xs text-slate-600 font-semibold">Priority</p>
                    <div className="mt-1">
                      <PriorityBadge priority={request.priority} />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 font-semibold">Request ID</p>
                    <p className="font-mono text-slate-900 text-xs mt-1">
                      {request.requestId}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 font-semibold">Submitted</p>
                    <p className="font-semibold text-slate-900 text-sm mt-1">
                      {request.submittedDate
                        ? new Date(request.submittedDate).toLocaleDateString(
                          'en-UG'
                        )
                        : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 font-semibold">Comments</p>
                    <p className="font-semibold text-slate-900 text-sm mt-1">
                      {request.comments?.length || 0}
                    </p>
                  </div>
                  {request.issueImages && request.issueImages.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-600 font-semibold">Images</p>
                      <p className="font-semibold text-slate-900 text-sm mt-1">
                        {request.issueImages.length}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
            <Wrench className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">No maintenance requests yet.</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSelectedRequest(null)}
          ></div>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 flex justify-between items-start border-b border-slate-200 bg-white px-6 py-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {selectedRequest.issue || selectedRequest.issueType}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {selectedRequest.requestId}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="rounded-full p-2 text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Status and Priority */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Status
                    </label>
                    <div className="mt-2">
                      <StatusBadge status={selectedRequest.status} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Priority
                    </label>
                    <div className="mt-2">
                      <PriorityBadge priority={selectedRequest.priority} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Issue Type
                    </label>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {selectedRequest.issueType || selectedRequest.category}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    Description
                  </label>
                  <p className="mt-2 text-sm text-slate-700">
                    {selectedRequest.description}
                  </p>
                </div>

                {/* Dates and Contact */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    <div>
                      <label className="text-xs font-semibold text-slate-600">
                        Submitted
                      </label>
                      <p className="text-sm text-slate-700">
                        {selectedRequest.submittedDate
                          ? new Date(
                            selectedRequest.submittedDate
                          ).toLocaleDateString('en-UG')
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                  {selectedRequest.contactPhone && (
                    <div>
                      <label className="text-xs font-semibold text-slate-600">
                        Contact Phone
                      </label>
                      <p className="text-sm text-slate-700">
                        {selectedRequest.contactPhone}
                      </p>
                    </div>
                  )}
                </div>

                {/* Available Time */}
                {selectedRequest.availableTime && (
                  <div>
                    <label className="text-xs font-semibold text-slate-600">
                      Available Time
                    </label>
                    <p className="text-sm text-slate-700">
                      {selectedRequest.availableTime}
                    </p>
                  </div>
                )}

                {/* Images */}
                {selectedRequest.issueImages &&
                  selectedRequest.issueImages.length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-slate-600" />
                      <label className="text-xs font-semibold text-slate-600">
                        Issue Images ({selectedRequest.issueImages.length})
                      </label>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {selectedRequest.issueImages.map((image, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setCurrentImageIndex(idx);
                            setShowImageGallery(true);
                          }}
                          className="group relative overflow-hidden rounded-lg"
                        >
                          <img
                            src={
                              image.base64
                                ? image.base64
                                : `data:${image.contentType};base64,${image.data}`
                            }
                            alt={`Issue ${idx + 1}`}
                            className="h-32 w-full object-cover transition-transform group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20"></div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comments */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Comments
                  </h3>

                  <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                    {selectedRequest.comments &&
                      selectedRequest.comments.length > 0 ? (
                      selectedRequest.comments.map((comment, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-50 p-3 rounded-lg border border-slate-200"
                        >
                          <div className="flex justify-between items-start">
                            <p className="font-semibold text-sm text-slate-900">
                              {comment.author?.fullName || comment.author?.name || 'Unknown'}
                            </p>
                            <p className="text-xs text-slate-600">
                              {new Date(
                                comment.createdAt
                              ).toLocaleDateString('en-UG')}
                            </p>
                          </div>
                          <p className="text-sm text-slate-700 mt-1">
                            {comment.comment}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-600">No comments yet.</p>
                    )}
                  </div>

                  {/* Add Comment Form */}
                  <form onSubmit={handleAddComment} className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                    >
                      Send
                    </button>
                  </form>

                  {['pending', 'submitted', 'approved'].includes(selectedRequest.status) && (
                    <button
                      type="button"
                      onClick={() => handleCancelRequest(selectedRequest)}
                      className="mt-4 rounded-lg border border-rose-200 px-4 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50"
                    >
                      Cancel Request
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Image Gallery Modal */}
          {showImageGallery &&
            selectedRequest.issueImages &&
            selectedRequest.issueImages.length > 0 && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                <div className="relative max-h-[90vh] max-w-[90vw] rounded-2xl bg-white shadow-2xl">
                  <button
                    onClick={() => setShowImageGallery(false)}
                    className="absolute right-4 top-4 z-10 rounded-full bg-black/20 p-2 text-white hover:bg-black/40 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>

                  <div className="flex items-center justify-center bg-slate-100 p-4">
                    <img
                      src={
                        selectedRequest.issueImages[currentImageIndex]
                          .base64
                          ? selectedRequest.issueImages[currentImageIndex].base64
                          : `data:${selectedRequest.issueImages[currentImageIndex].contentType};base64,${selectedRequest.issueImages[currentImageIndex].data}`
                      }
                      alt={`Maintenance issue ${currentImageIndex + 1}`}
                      className="max-h-[60vh] max-w-[70vw] rounded-lg object-contain"
                    />
                  </div>

                  {selectedRequest.issueImages.length > 1 && (
                    <>
                      <button
                        onClick={() =>
                          setCurrentImageIndex((prev) =>
                            prev === 0
                              ? selectedRequest.issueImages.length - 1
                              : prev - 1
                          )
                        }
                        className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white hover:bg-black/50 transition-colors"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() =>
                          setCurrentImageIndex((prev) =>
                            prev === selectedRequest.issueImages.length - 1
                              ? 0
                              : prev + 1
                          )
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/30 p-2 text-white hover:bg-black/50 transition-colors"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}

                  <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-600">
                    {selectedRequest.issueImages.length > 1 &&
                      `Image ${currentImageIndex + 1} of ${selectedRequest.issueImages.length}`}
                  </div>
                </div>
              </div>
            )}
        </>
      )}
    </div>
  );
}
