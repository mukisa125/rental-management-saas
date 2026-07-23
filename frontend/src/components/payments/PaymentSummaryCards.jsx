import { Building2, Clock3, Landmark, ReceiptText, Smartphone, TrendingUp, WalletCards, WalletMinimal } from 'lucide-react';
import { formatUGX } from '../../utils/currency';
import { safeNumber } from './paymentUtils';

const topCards = [
  { key: 'totalCollectedThisMonth', label: 'Total Collected This Month', Icon: WalletCards, tone: 'bg-emerald-50 text-emerald-600', description: 'Rent collected this month' },
  { key: 'outstandingBalance', label: 'Outstanding Balance', Icon: WalletMinimal, tone: 'bg-amber-50 text-amber-600', description: 'Across active tenants' },
  { key: 'pendingPayments', label: 'Pending Payments', Icon: Clock3, tone: 'bg-blue-50 text-blue-600', count: true, description: 'Payments awaiting action' },
  { key: 'overdueRent', label: 'Overdue Rent', Icon: TrendingUp, tone: 'bg-rose-50 text-rose-600', description: 'Needs follow-up' },
  { key: 'mobileMoneyPayments', label: 'Mobile Money Payments', Icon: Smartphone, tone: 'bg-violet-50 text-violet-600', count: true, description: 'This month' },
  { key: 'bankTransferPayments', label: 'Bank Transfer Payments', Icon: Landmark, tone: 'bg-cyan-50 text-cyan-600', count: true, description: 'This month' },
];

const bottomCards = [
  { key: 'collectedByMobileMoney', label: 'Collected by Mobile Money', Icon: Smartphone, tone: 'bg-emerald-50 text-emerald-600', description: 'This month' },
  { key: 'collectedByBank', label: 'Collected by Bank', Icon: Building2, tone: 'bg-blue-50 text-blue-600', description: 'This month' },
  { key: 'averagePayment', label: 'Average Payment', Icon: TrendingUp, tone: 'bg-orange-50 text-orange-600', description: 'Across all payments' },
  { key: 'receiptsGenerated', label: 'Receipts Generated', Icon: ReceiptText, tone: 'bg-violet-50 text-violet-600', count: true, description: 'This month' },
];

const SummaryCard = ({ card, summary }) => {
  const value = safeNumber(summary?.[card.key]);
  return (
    <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${card.tone}`}><card.Icon className="h-5 w-5" /></div>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold text-slate-500 sm:text-xs">{card.label}</p>
          <p className="mt-1 truncate text-lg font-black tracking-tight text-slate-950 sm:text-xl">{card.count ? value.toLocaleString('en-US') : formatUGX(value)}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">{card.description}</p>
        </div>
      </div>
    </article>
  );
};

const PaymentSummaryCards = ({ summary = {} }) => (
  <>
    <section aria-label="Payment summary" className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
      {topCards.map((card) => <SummaryCard key={card.key} card={card} summary={summary} />)}
    </section>
    <section aria-label="Payment collection details" className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-4">
      {bottomCards.map((card) => <SummaryCard key={card.key} card={card} summary={summary} />)}
    </section>
  </>
);

export default PaymentSummaryCards;
