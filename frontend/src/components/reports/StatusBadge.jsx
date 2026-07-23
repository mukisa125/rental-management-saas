const styles = {
  paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  active: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  occupied: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  partial: 'border-amber-200 bg-amber-50 text-amber-700',
  in_progress: 'border-blue-200 bg-blue-50 text-blue-700',
  overdue: 'border-rose-200 bg-rose-50 text-rose-700',
  rejected: 'border-rose-200 bg-rose-50 text-rose-700',
  vacant: 'border-slate-200 bg-slate-50 text-slate-600',
  maintenance: 'border-violet-200 bg-violet-50 text-violet-700',
  expired: 'border-rose-200 bg-rose-50 text-rose-700',
  expiring: 'border-amber-200 bg-amber-50 text-amber-700'
};

const normalize = (value) => String(value || 'unknown').trim().toLowerCase();

const toLabel = (value) => {
  const raw = String(value || 'Unknown').replace(/_/g, ' ');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
};

export default function StatusBadge({ value }) {
  const status = normalize(value);
  const className = styles[status] || 'border-slate-200 bg-slate-50 text-slate-600';

  return (
    <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${className}`}>
      {toLabel(value)}
    </span>
  );
}
