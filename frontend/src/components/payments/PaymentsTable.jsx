import { Download, Eye, FileText, Pencil, Printer, Trash2 } from 'lucide-react';
import { formatUGX } from '../../utils/currency';
import PaymentStatusBadge from './PaymentStatusBadge';
import { dateTimeLabel, paymentMethodLabel, PAYMENT_METHODS, safeNumber } from './paymentUtils';

const ActionButton = ({ label, onClick, children, danger = false }) => <button type="button" onClick={onClick} title={label} aria-label={label} className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white transition hover:shadow-sm ${danger ? 'text-rose-600 hover:border-rose-200 hover:bg-rose-50' : 'text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600'}`}>{children}</button>;

const methodTone = (method) => PAYMENT_METHODS.find((item) => item.value === method)?.tone || 'bg-slate-100 text-slate-600';

const PaymentsTable = ({ payments = [], loading, onView, onEdit, onPrint, onDownload, onDelete }) => (
  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="responsive-table overflow-x-auto">
      <table className="w-full min-w-[1160px] border-collapse">
        <thead className="border-b border-slate-200 bg-slate-50/80">
          <tr>{['Receipt ID', 'Tenant', 'Property / Unit', 'Payment For', 'Amount Paid', 'Balance', 'Payment Method', 'Payment Date', 'Status', 'Actions'].map((heading) => <th key={heading} className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-extrabold uppercase tracking-wide text-slate-500">{heading}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading ? <tr><td colSpan="10" className="px-5 py-16 text-center text-sm font-semibold text-slate-500">Loading your payment history...</td></tr> : payments.length === 0 ? <tr><td colSpan="10" className="px-5 py-16 text-center"><FileText className="mx-auto h-8 w-8 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-700">No payments match these filters.</p><p className="mt-1 text-xs font-medium text-slate-500">Record the first payment when rent is received.</p></td></tr> : payments.map((payment) => {
            const tenant = payment.tenant || {};
            const property = payment.property || {};
            const unit = payment.unit || {};
            const initial = String(tenant.fullName || 'T').charAt(0).toUpperCase();
            return <tr key={payment._id || payment.receiptNumber} className="transition hover:bg-blue-50/40">
              <td className="px-4 py-3"><button type="button" onClick={() => onView(payment)} className="text-sm font-extrabold text-blue-600 hover:text-blue-700 hover:underline">{payment.receiptNumber || 'Pending receipt'}</button></td>
              <td className="px-4 py-3"><div className="flex items-center gap-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-extrabold text-blue-600">{initial}</span><div className="min-w-0"><p className="max-w-36 truncate text-sm font-bold text-slate-800">{tenant.fullName || 'Unknown tenant'}</p><p className="mt-0.5 text-xs font-medium text-slate-500">{tenant.phone || tenant.email || 'No contact'}</p></div></div></td>
              <td className="px-4 py-3"><p className="text-sm font-bold text-slate-700">{property.name || 'Unassigned property'}</p><p className="mt-0.5 text-xs font-medium text-slate-500">{unit.unitNumber ? `Unit ${unit.unitNumber}` : 'No unit'}</p></td>
              <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-700">{payment.paymentFor || 'Rent payment'}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm font-extrabold text-slate-900">{formatUGX(payment.amountPaid)}</td>
              <td className="whitespace-nowrap px-4 py-3 text-sm font-bold text-slate-600">{formatUGX(payment.remainingBalance ?? Math.max(0, safeNumber(payment.amount) - safeNumber(payment.amountPaid)))}</td>
              <td className="px-4 py-3"><div className="flex items-center gap-2"><span className={`flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-black ${methodTone(payment.paymentMethod)}`}>{paymentMethodLabel(payment.paymentMethod).slice(0, 2).toUpperCase()}</span><div><p className="whitespace-nowrap text-sm font-bold text-slate-700">{paymentMethodLabel(payment.paymentMethod)}</p><p className="text-xs font-medium text-slate-500">{payment.paymentReference || 'No reference'}</p></div></div></td>
              <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-600">{dateTimeLabel(payment.paymentDate || payment.paidDate)}</td>
              <td className="px-4 py-3"><PaymentStatusBadge status={payment.status} /></td>
              <td className="px-4 py-3"><div className="flex items-center gap-1.5"><ActionButton label="View receipt" onClick={() => onView(payment)}><Eye className="h-4 w-4" /></ActionButton><ActionButton label="Edit payment" onClick={() => onEdit(payment)}><Pencil className="h-4 w-4" /></ActionButton><ActionButton label="Print receipt" onClick={() => onPrint(payment)}><Printer className="h-4 w-4" /></ActionButton><ActionButton label="Download receipt" onClick={() => onDownload(payment)}><Download className="h-4 w-4" /></ActionButton><ActionButton label="Delete payment" danger onClick={() => onDelete(payment)}><Trash2 className="h-4 w-4" /></ActionButton></div></td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
  </div>
);

export default PaymentsTable;
