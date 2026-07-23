import { FileText, Users, Building2, House, FileCheck2, ReceiptText, Wrench, CalendarClock } from 'lucide-react';

const cardConfig = [
  { key: 'totalDocuments', label: 'Total Documents', subtitle: 'All generated and uploaded records', icon: FileText, accent: 'bg-blue-50 text-blue-600' },
  { key: 'tenantDocuments', label: 'Tenant Documents', subtitle: 'Profiles and tenant files', icon: Users, accent: 'bg-emerald-50 text-emerald-600' },
  { key: 'propertyDocuments', label: 'Property Documents', subtitle: 'Property-level records', icon: Building2, accent: 'bg-purple-50 text-purple-600' },
  { key: 'unitDocuments', label: 'Unit Documents', subtitle: 'Unit-specific files', icon: House, accent: 'bg-indigo-50 text-indigo-600' },
  { key: 'leaseAgreements', label: 'Lease Agreements', subtitle: 'Lease contracts and terms', icon: FileCheck2, accent: 'bg-cyan-50 text-cyan-600' },
  { key: 'paymentReceipts', label: 'Payment Receipts', subtitle: 'Payment proof and receipts', icon: ReceiptText, accent: 'bg-green-50 text-green-600' },
  { key: 'maintenanceDocuments', label: 'Maintenance Documents', subtitle: 'Approval and completion docs', icon: Wrench, accent: 'bg-amber-50 text-amber-600' },
  { key: 'expiringSoon', label: 'Expiring Soon', subtitle: 'Review before expiry date', icon: CalendarClock, accent: 'bg-rose-50 text-rose-600' }
];

export default function DocumentSummaryCards({ summary = {} }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cardConfig.map((card) => {
        const Icon = card.icon;
        const count = Number(summary?.[card.key]) || 0;
        return (
          <article key={card.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.accent}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500">{card.label}</p>
                <p className="mt-1 text-xl font-black text-slate-900">{count}</p>
                <p className="mt-1 text-xs text-slate-500">{card.subtitle}</p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
