import { BarChart3, CheckCircle2, AlertCircle, AlertTriangle, TrendingUp, CreditCard } from 'lucide-react';
import { formatUGX } from '../../utils/currency';

const safe = (value) => Number(value) || 0;

const iconStyles = [
  'bg-blue-50 text-blue-600',
  'bg-emerald-50 text-emerald-600',
  'bg-amber-50 text-amber-600',
  'bg-rose-50 text-rose-600',
  'bg-orange-50 text-orange-600',
  'bg-indigo-50 text-indigo-600'
];

export default function InvoiceSummaryCards({ summary }) {
  const cards = [
    {
      icon: BarChart3,
      label: 'Total Invoiced This Month',
      value: formatUGX(safe(summary.totalInvoicedThisMonth)),
      note: `${safe(summary.totalInvoiced) || 0} invoices`,
      index: 0
    },
    {
      icon: CheckCircle2,
      label: 'Paid Invoices',
      value: formatUGX(safe(summary.paidAmount)),
      note: `${safe(summary.paidInvoices) || 0} invoices`,
      index: 1
    },
    {
      icon: AlertTriangle,
      label: 'Unpaid Invoices',
      value: formatUGX(safe(summary.unpaidAmount)),
      note: `${safe(summary.unpaidInvoices) || 0} invoices`,
      index: 2
    },
    {
      icon: AlertCircle,
      label: 'Overdue Invoices',
      value: formatUGX(safe(summary.overdueAmount)),
      note: `${safe(summary.overdueInvoices) || 0} invoices`,
      index: 3
    },
    {
      icon: TrendingUp,
      label: 'Partial Payments',
      value: formatUGX(safe(summary.partialAmount)),
      note: `${safe(summary.partialInvoices) || 0} invoices`,
      index: 4
    },
    {
      icon: CreditCard,
      label: 'Outstanding Balance',
      value: formatUGX(safe(summary.outstandingBalance)),
      note: 'Amount due',
      index: 5
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  iconStyles[card.index]
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500">{card.label}</p>
                <p className="mt-1 truncate text-lg font-black tracking-normal text-slate-900">
                  {card.value}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-500">{card.note}</p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
