export const getStatusColor = (status) => {
  switch (status) {
    case 'pending':
      return 'bg-slate-100 text-slate-700 border-slate-300';
    case 'approved':
      return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'assigned':
      return 'bg-indigo-100 text-indigo-700 border-indigo-300';
    case 'in_progress':
      return 'bg-amber-100 text-amber-700 border-amber-300';
    case 'on_hold':
      return 'bg-orange-100 text-orange-700 border-orange-300';
    case 'completed':
      return 'bg-emerald-100 text-emerald-700 border-emerald-300';
    case 'rejected':
      return 'bg-rose-100 text-rose-700 border-rose-300';
    case 'cancelled':
      return 'bg-slate-100 text-slate-700 border-slate-300';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-300';
  }
};

export const getPriorityColor = (priority) => {
  switch (priority) {
    case 'low':
      return 'bg-slate-100 text-slate-700 border-slate-300';
    case 'medium':
      return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'high':
      return 'bg-amber-100 text-amber-700 border-amber-300';
    case 'urgent':
      return 'bg-rose-100 text-rose-700 border-rose-300';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-300';
  }
};

export const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(
      status
    )}`}
  >
    {status.replace('_', ' ')}
  </span>
);

export const PriorityBadge = ({ priority }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getPriorityColor(
      priority
    )}`}
  >
    {priority.charAt(0).toUpperCase() + priority.slice(1)}
  </span>
);

export const SourceBadge = ({ source }) => {
  const sourceColors = {
    tenant_portal: 'bg-purple-100 text-purple-700 border-purple-300',
    self_owner: 'bg-blue-100 text-blue-700 border-blue-300',
    manager: 'bg-green-100 text-green-700 border-green-300'
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${sourceColors[source] || sourceColors.tenant_portal}`}>
      {source === 'tenant_portal' && 'Tenant Portal'}
      {source === 'self_owner' && 'Self Owner'}
      {source === 'manager' && 'Manager'}
    </span>
  );
};
