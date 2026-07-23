import { statusLabel } from './paymentUtils';

const styles = {
  paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  partial: 'border-amber-200 bg-amber-50 text-amber-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  overdue: 'border-rose-200 bg-rose-50 text-rose-700',
  failed: 'border-rose-200 bg-rose-50 text-rose-700',
  reversed: 'border-violet-200 bg-violet-50 text-violet-700',
};

const PaymentStatusBadge = ({ status = 'pending', className = '' }) => (
  <span className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-bold ${styles[status] || 'border-slate-200 bg-slate-50 text-slate-600'} ${className}`}>
    {statusLabel(status)}
  </span>
);

export default PaymentStatusBadge;
