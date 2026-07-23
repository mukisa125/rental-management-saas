const StatusBadge = ({ status }) => {
  const map = {
    paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    pending: 'border-amber-200 bg-amber-50 text-amber-700',
    failed: 'border-rose-200 bg-rose-50 text-rose-700',
    active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    trial: 'border-blue-200 bg-blue-50 text-blue-700',
    suspended: 'border-amber-200 bg-amber-50 text-amber-700',
    past_due: 'border-amber-200 bg-amber-50 text-amber-700',
    cancelled: 'border-slate-200 bg-slate-100 text-slate-600',
    approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    expired: 'border-rose-200 bg-rose-50 text-rose-700',
    rejected: 'border-rose-200 bg-rose-50 text-rose-700',
  };
  const cls = map[status] || 'border-slate-200 bg-slate-50 text-slate-600';
  const label = String(status || 'unknown').replace(/_/g, ' ');
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold capitalize ${cls}`}>{label}</span>;
};

export default StatusBadge;
