import { getDocumentStatus } from './documentUtils';

const statusClasses = {
  Active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Generated: 'bg-blue-50 text-blue-700 border-blue-200',
  'Pending Review': 'bg-amber-50 text-amber-700 border-amber-200',
  'Expiring Soon': 'bg-orange-50 text-orange-700 border-orange-200',
  Expired: 'bg-rose-50 text-rose-700 border-rose-200',
  Rejected: 'bg-rose-50 text-rose-700 border-rose-200'
};

export default function DocumentStatusBadge({ status }) {
  const label = getDocumentStatus({ status });
  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${statusClasses[label] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
      {label}
    </span>
  );
}
