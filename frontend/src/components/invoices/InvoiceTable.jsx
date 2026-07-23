import { Eye, Printer, Share2 } from 'lucide-react';
import { formatUGX } from '../../utils/currency';

const safe = (value) => Number(value) || 0;

export default function InvoiceTable({
  invoices,
  onViewInvoice,
  onPrintInvoice,
  onShareInvoice,
  statusColors,
  statusIcons
}) {
  const getInvoiceStatus = (invoice) => {
    const balance = safe(invoice.amount) - safe(invoice.amountPaid);
    if (invoice.status === 'paid' || balance <= 0) return 'paid';
    if (invoice.status === 'overdue' || (new Date(invoice.dueDate) < new Date() && balance > 0)) return 'overdue';
    if (safe(invoice.amountPaid) > 0 && balance > 0) return 'partial';
    if (invoice.status === 'cancelled') return 'cancelled';
    if (invoice.status === 'draft') return 'draft';
    return 'unpaid';
  };

  const getStatusLabel = (status) => {
    const labels = {
      paid: 'Paid',
      unpaid: 'Unpaid',
      partial: 'Partial',
      overdue: 'Overdue',
      draft: 'Draft',
      cancelled: 'Cancelled'
    };
    return labels[status] || status;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-5 py-4 font-bold text-slate-600">Invoice No.</th>
              <th className="px-5 py-4 font-bold text-slate-600">Tenant</th>
              <th className="px-5 py-4 font-bold text-slate-600">Property / Unit</th>
              <th className="px-5 py-4 font-bold text-slate-600">Due Date</th>
              <th className="px-5 py-4 font-bold text-slate-600 text-right">Rent Amount</th>
              <th className="px-5 py-4 font-bold text-slate-600 text-right">Paid</th>
              <th className="px-5 py-4 font-bold text-slate-600 text-right">Balance</th>
              <th className="px-5 py-4 font-bold text-slate-600">Status</th>
              <th className="px-5 py-4 font-bold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => {
              const status = getInvoiceStatus(invoice);
              const StatusIcon = statusIcons[status];
              const balance = Math.max(0, safe(invoice.amount) - safe(invoice.amountPaid));
              const dueDate = new Date(invoice.dueDate);
              const isOverdue = dueDate < new Date() && balance > 0;

              return (
                <tr key={invoice._id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-900">{invoice.receiptNumber || 'Draft'}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(invoice.createdAt).toLocaleDateString('en-UG')}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-700">{invoice.tenant?.fullName || 'N/A'}</p>
                    <p className="text-xs text-slate-500">{invoice.tenant?.phone || '-'}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-700">
                    <p>{invoice.property?.name || 'N/A'}</p>
                    {invoice.unit && (
                      <p className="text-xs text-slate-500">Unit: {invoice.unit.unitNumber}</p>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <p className={`font-semibold ${isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>
                      {dueDate.toLocaleDateString('en-UG')}
                    </p>
                    {isOverdue && (
                      <p className="text-xs text-rose-600 font-semibold">
                        Overdue {Math.ceil((new Date() - dueDate) / (1000 * 60 * 60 * 24))}d
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-slate-900">
                    {formatUGX(safe(invoice.amount))}
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-emerald-600">
                    {formatUGX(safe(invoice.amountPaid))}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <p className={`font-bold ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {formatUGX(balance)}
                    </p>
                  </td>
                  <td className="px-5 py-4">
                    <div
                      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-bold ${
                        statusColors[status]
                      }`}
                    >
                      {StatusIcon && <StatusIcon className="h-3.5 w-3.5" />}
                      {getStatusLabel(status)}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-1">
                      <button
                        onClick={() => onViewInvoice(invoice)}
                        className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                        title="View Invoice"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onPrintInvoice(invoice)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                        title="Print Invoice"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onShareInvoice?.(invoice)}
                        className="p-2 hover:bg-emerald-50 rounded-lg text-emerald-600 transition-colors"
                        title="Share Invoice"
                      >
                        <Share2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
