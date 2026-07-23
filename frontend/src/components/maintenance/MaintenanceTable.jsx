import { Eye, Trash2, CheckCircle2 } from 'lucide-react';
import { StatusBadge, PriorityBadge, SourceBadge } from './BadgeHelpers';

export default function MaintenanceTable({
  requests,
  loading,
  currentPage,
  totalPages,
  onPageChange,
  onViewRequest,
  onApproveRequest,
  onCompleteRequest,
  onDeleteRequest
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
          <p className="mt-3 text-slate-600">Loading maintenance requests...</p>
        </div>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8">
        <div className="text-center">
          <p className="text-slate-600">No maintenance requests found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                Request ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                Tenant
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                Property / Unit
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                Issue
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                Priority
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                Source
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-slate-700">
                Date
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wider text-slate-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {requests.map((request, idx) => (
              <tr
                key={request._id}
                className={`border-b border-slate-200 transition-colors ${
                  idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                } hover:bg-blue-50`}
              >
                <td className="px-4 py-3">
                  <span className="font-semibold text-slate-900">{request.requestId}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-slate-700">
                    {request.tenant?.fullName || request.tenant?.name || 'N/A'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-slate-700">
                    {request.property?.name || 'N/A'} / {request.unit?.unitNumber || 'N/A'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-slate-700">
                    {request.issue || request.description || request.issueType || 'N/A'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <PriorityBadge priority={request.priority || 'medium'} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={request.status || 'pending'} />
                </td>
                <td className="px-4 py-3">
                  <SourceBadge source={request.source || 'tenant_portal'} />
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-slate-600">
                    {request.submittedDate
                      ? new Date(request.submittedDate).toLocaleDateString('en-UG')
                      : 'N/A'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onViewRequest(request)}
                      className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-600"
                      title="View request"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    {request.status === 'pending' && (
                      <button
                        onClick={() => onApproveRequest(request._id)}
                        className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                        title="Approve request"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    )}
                    {(request.status === 'approved' || request.status === 'in_progress') && (
                      <button
                        onClick={() => onCompleteRequest(request._id)}
                        className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
                        title="Mark completed"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteRequest(request._id)}
                      className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-rose-50 hover:text-rose-600"
                      title="Delete request"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <span className="text-sm text-slate-600">
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
