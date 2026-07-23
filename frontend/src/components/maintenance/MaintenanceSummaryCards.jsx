import { AlertCircle, Zap, Check, Clock, AlertTriangle, DollarSign } from 'lucide-react';
import { formatUGX } from '../../utils/currency';

const safe = (value) => Number(value) || 0;

const iconStyles = [
  'bg-blue-50 text-blue-600',
  'bg-amber-50 text-amber-600',
  'bg-violet-50 text-violet-600',
  'bg-emerald-50 text-emerald-600',
  'bg-rose-50 text-rose-600',
  'bg-orange-50 text-orange-600'
];

export default function MaintenanceSummaryCards({ summary }) {
  const cards = [
    {
      icon: AlertCircle,
      label: 'Total Requests',
      value: safe(summary.totalRequests) || 0,
      note: 'All maintenance requests',
      index: 0
    },
    {
      icon: Clock,
      label: 'Pending Requests',
      value: safe(summary.pendingRequests) || 0,
      note: 'Awaiting approval',
      index: 1
    },
    {
      icon: Zap,
      label: 'In Progress',
      value: safe(summary.inProgressRequests) || 0,
      note: 'Currently being worked on',
      index: 2
    },
    {
      icon: Check,
      label: 'Completed',
      value: safe(summary.completedRequests) || 0,
      note: 'Finished requests',
      index: 3
    },
    {
      icon: AlertTriangle,
      label: 'Urgent Requests',
      value: safe(summary.urgentRequests) || 0,
      note: 'High priority items',
      index: 4
    },
    {
      icon: DollarSign,
      label: 'Cost This Month',
      value: formatUGX(safe(summary.costThisMonth)),
      note: 'Maintenance expenses',
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
