import { X, Image, Calendar, DollarSign, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { StatusBadge, PriorityBadge, SourceBadge } from './BadgeHelpers';
import MaintenanceImageGallery from './MaintenanceImageGallery';
import { formatUGX } from '../../utils/currency';

const encodePayload = (value) => {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

export default function ViewMaintenanceModal({
  request,
  landlord,
  onClose,
  onStatusChange,
  onDelete,
  onAddComment,
  providers = [],
  onAssignServiceProvider
}) {
  const [showGallery, setShowGallery] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [shareLink, setShareLink] = useState('');

  const tenantPhoto = request?.tenant?.photo?.base64;
  const tenantPhotoSrc = tenantPhoto
    ? (tenantPhoto.startsWith('data:') ? tenantPhoto : `data:image/webp;base64,${tenantPhoto}`)
    : '';

  const images = request?.issueImages || [];
  const selectedProvider = providers.find((provider) => provider.id === selectedProviderId) || null;

  const assignedProvider = {
    name: request?.technicianName,
    tel: request?.technicianPhone,
    service: request?.technicianService,
    address: request?.technicianAddress
  };

  const handleStatusUpdate = async (newStatus) => {
    if (onStatusChange) {
      await onStatusChange(request._id, newStatus);
      onClose();
    }
  };

  const handleSubmitComment = async (event) => {
    event.preventDefault();
    const comment = newComment.trim();
    if (!comment || !onAddComment) return;
    await onAddComment(request._id, comment);
    setNewComment('');
  };

  const handleAssignProvider = async () => {
    if (!selectedProvider || !onAssignServiceProvider) return;
    await onAssignServiceProvider(request._id, selectedProvider);
    setSelectedProviderId('');
    setShareLink('');
  };

  const handleGenerateShareLink = async () => {
    const provider = selectedProvider || (assignedProvider.name ? assignedProvider : null);
    if (!provider) {
      alert('Assign or select a service provider first.');
      return;
    }

    const payload = {
      landlord: {
        name: landlord?.name || 'Landlord',
        phone: landlord?.phone || '',
        email: landlord?.email || '',
        company: landlord?.company || ''
      },
      tenant: {
        name: request?.tenant?.fullName || request?.tenant?.name || '',
        phone: request?.tenant?.phone || '',
        email: request?.tenant?.email || '',
        location: `${request?.property?.name || 'N/A'} / ${request?.unit?.unitNumber || 'N/A'}`
      },
      issue: {
        id: request?._id || '',
        requestId: request?.requestId || '',
        title: request?.issue || request?.issueType || 'Maintenance issue',
        description: request?.description || '',
        priority: request?.priority || '',
        status: request?.status || ''
      },
      provider: {
        name: provider?.name || '',
        tel: provider?.tel || '',
        service: provider?.service || '',
        address: provider?.address || ''
      }
    };

    const encodedData = encodePayload(payload);
    const appOrigin = window.location.origin;
    const link = `${appOrigin}/service-provider/request?data=${encodeURIComponent(encodedData)}`;
    setShareLink(link);
  };

  const handleCopyShareLink = async () => {
    if (!shareLink) return;

    try {
      await navigator.clipboard.writeText(shareLink);
      alert('Share link copied to clipboard.');
    } catch {
      alert('Could not copy link. Please copy it manually.');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose}></div>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
          {/* Header */}
          <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Request Details</h2>
              <p className="text-sm text-slate-500">{request?.requestId}</p>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6 p-6">
            {/* Tenant Profile */}
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tenant Profile</p>
              <div className="mt-3 grid grid-cols-2 gap-4">
                <div>
                  <div className="mb-2">
                    {tenantPhotoSrc ? (
                      <img
                        src={tenantPhotoSrc}
                        alt={request?.tenant?.fullName || 'Tenant'}
                        className="h-12 w-12 rounded-full border border-slate-200 object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-bold text-slate-600">
                        {(request?.tenant?.fullName || request?.tenant?.name || 'T').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <label className="text-xs font-semibold text-slate-600">Tenant</label>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {request?.tenant?.fullName || request?.tenant?.name || 'N/A'}
                  </p>
                  <p className="text-xs text-slate-600">{request?.tenant?.phone}</p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Property / Unit</label>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {request?.property?.name} / {request?.unit?.unitNumber}
                  </p>
                </div>
              </div>
            </div>

            {/* Status and Priority Row */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-600">Status</label>
                <div className="mt-2">
                  <StatusBadge status={request?.status} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Priority</label>
                <div className="mt-2">
                  <PriorityBadge priority={request?.priority} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Source</label>
                <div className="mt-2">
                  <SourceBadge source={request?.source} />
                </div>
              </div>
            </div>

            {/* Issue Info */}
            <div>
              <label className="text-xs font-semibold text-slate-600">Issue Type</label>
              <p className="mt-2 text-sm text-slate-700">{request?.issue || 'N/A'}</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600">Description</label>
              <p className="mt-2 text-sm text-slate-700">{request?.description || 'N/A'}</p>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-slate-400" />
                <div>
                  <label className="text-xs font-semibold text-slate-600">Submitted</label>
                  <p className="text-sm text-slate-700">
                    {request?.submittedDate
                      ? new Date(request.submittedDate).toLocaleDateString('en-UG')
                      : 'N/A'}
                  </p>
                </div>
              </div>
              {request?.completedAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Completed</label>
                    <p className="text-sm text-slate-700">
                      {new Date(request.completedAt).toLocaleDateString('en-UG')}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Costs */}
            {(request?.estimatedCost || request?.actualCost) && (
              <div className="grid grid-cols-2 gap-4">
                {request?.estimatedCost > 0 && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-slate-400" />
                    <div>
                      <label className="text-xs font-semibold text-slate-600">
                        Estimated Cost
                      </label>
                      <p className="text-sm font-semibold text-slate-700">
                        {formatUGX(request.estimatedCost)}
                      </p>
                    </div>
                  </div>
                )}
                {request?.actualCost > 0 && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-slate-400" />
                    <div>
                      <label className="text-xs font-semibold text-slate-600">
                        Actual Cost
                      </label>
                      <p className="text-sm font-semibold text-slate-700">
                        {formatUGX(request.actualCost)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Assigned Provider Info */}
            {(assignedProvider.name || assignedProvider.tel || assignedProvider.service || assignedProvider.address) && (
              <div className="rounded-lg border border-slate-200 p-4">
                <label className="text-xs font-semibold text-slate-600">Assigned Service Provider</label>
                <p className="mt-2 text-sm font-semibold text-slate-900">
                  {assignedProvider.name || 'N/A'}
                </p>
                <p className="text-sm text-slate-600">{assignedProvider.service || 'N/A'}</p>
                <p className="text-sm text-slate-600">{assignedProvider.tel || 'N/A'}</p>
                <p className="text-sm text-slate-600">{assignedProvider.address || 'N/A'}</p>
              </div>
            )}

            {/* Provider Assignment */}
            <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4">
              <label className="text-xs font-semibold text-blue-700">Assign Service Provider</label>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <select
                  value={selectedProviderId}
                  onChange={(event) => setSelectedProviderId(event.target.value)}
                  className="flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select provider</option>
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name} - {provider.service}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAssignProvider}
                  disabled={!selectedProviderId}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Assign
                </button>
              </div>
              {!providers.length && (
                <p className="mt-2 text-xs text-slate-600">
                  No providers found. Add providers from the Maintenance page using the Service Providers button.
                </p>
              )}
            </div>

            {/* Share Link */}
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/40 p-4">
              <label className="text-xs font-semibold text-emerald-700">Share Issue Link with Provider</label>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleGenerateShareLink}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                >
                  Generate Link
                </button>
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  disabled={!shareLink}
                  className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Copy Link
                </button>
                {shareLink && (
                  <a
                    href={shareLink}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    Open Form Link
                  </a>
                )}
              </div>
              {shareLink && (
                <input
                  readOnly
                  value={shareLink}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700"
                />
              )}
            </div>

            {/* Notes */}
            {request?.ownerNotes && (
              <div>
                <label className="text-xs font-semibold text-slate-600">Owner Notes</label>
                <p className="mt-2 text-sm text-slate-700">{request.ownerNotes}</p>
              </div>
            )}

            {request?.tenantNotes && (
              <div>
                <label className="text-xs font-semibold text-slate-600">Tenant Notes</label>
                <p className="mt-2 text-sm text-slate-700">{request.tenantNotes}</p>
              </div>
            )}

            {request?.resolutionNotes && (
              <div>
                <label className="text-xs font-semibold text-slate-600">Resolution Notes</label>
                <p className="mt-2 text-sm text-slate-700">{request.resolutionNotes}</p>
              </div>
            )}

            {request?.rejectionReason && (
              <div className="rounded-lg bg-rose-50 p-4">
                <label className="text-xs font-semibold text-rose-600">Rejection Reason</label>
                <p className="mt-2 text-sm text-rose-700">{request.rejectionReason}</p>
              </div>
            )}

            {/* Comments */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900">
                <MessageSquare className="h-4 w-4" />
                Comments
              </h3>

              <div className="mb-4 max-h-52 space-y-3 overflow-y-auto">
                {Array.isArray(request?.comments) && request.comments.length > 0 ? (
                  request.comments.map((comment) => (
                    <div key={comment._id || `${comment.author?._id}-${comment.createdAt}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-slate-900">
                          {comment.author?.fullName || comment.author?.name || 'User'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {comment.createdAt ? new Date(comment.createdAt).toLocaleDateString('en-UG') : ''}
                        </p>
                      </div>
                      <p className="mt-1 text-sm text-slate-700">{comment.comment}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-600">No comments yet.</p>
                )}
              </div>

              <form onSubmit={handleSubmitComment} className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(event) => setNewComment(event.target.value)}
                  placeholder="Write a comment for the tenant..."
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                >
                  Send
                </button>
              </form>
            </div>

            {/* Images */}
            {images.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Image className="h-4 w-4 text-slate-600" />
                  <label className="text-xs font-semibold text-slate-600">
                    Issue Images ({images.length})
                  </label>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {images.map((image, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setShowGallery(true);
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
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex gap-3">
            {request?.status === 'pending' && (
              <>
                <button
                  onClick={() => handleStatusUpdate('approved')}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleStatusUpdate('rejected')}
                  className="flex-1 rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-100 transition-colors"
                >
                  Reject
                </button>
              </>
            )}
            {request?.status === 'approved' && (
              <button
                onClick={() => handleStatusUpdate('in_progress')}
                className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
              >
                Mark In Progress
              </button>
            )}
            {(request?.status === 'approved' || request?.status === 'in_progress') && (
              <button
                onClick={() => handleStatusUpdate('completed')}
                className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition-colors"
              >
                Mark Completed
              </button>
            )}
            <button
              onClick={() => onDelete(request._id)}
              className="flex-1 rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-100 transition-colors"
            >
              Delete
            </button>
            <button
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Image Gallery Modal */}
      {showGallery && (
        <MaintenanceImageGallery
          images={images}
          onClose={() => setShowGallery(false)}
        />
      )}
    </>
  );
}
