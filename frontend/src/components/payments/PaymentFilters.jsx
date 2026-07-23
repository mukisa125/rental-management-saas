import { CalendarDays, ChevronDown, Plus, Search, X } from 'lucide-react';
import { PAYMENT_METHODS } from './paymentUtils';

const controlClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100';

const PaymentFilters = ({ filters, properties = [], onChange, onRecord }) => {
  const update = (key, value) => onChange({ ...filters, [key]: value });
  const clear = () => onChange({ search: '', property: '', paymentMethod: '', status: '', startDate: '', endDate: '' });
  const isFiltered = Object.values(filters).some(Boolean);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <label className="relative min-w-0 flex-1 xl:max-w-md">
          <span className="sr-only">Search payments</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={filters.search} onChange={(event) => update('search', event.target.value)} className={`${controlClass} pl-10`} placeholder="Search receipt ID, tenant, or property..." />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:flex xl:items-center">
          <label className="relative min-w-40">
            <span className="sr-only">Filter by property</span>
            <select value={filters.property} onChange={(event) => update('property', event.target.value)} className={`${controlClass} appearance-none pr-9`}>
              <option value="">All Properties</option>
              {properties.map((property) => <option key={property._id} value={property._id}>{property.name || 'Unnamed property'}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </label>
          <label className="relative min-w-44">
            <span className="sr-only">Filter by payment method</span>
            <select value={filters.paymentMethod} onChange={(event) => update('paymentMethod', event.target.value)} className={`${controlClass} appearance-none pr-9`}>
              <option value="">All Methods</option>
              {PAYMENT_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </label>
          <label className="relative min-w-36">
            <span className="sr-only">Filter by status</span>
            <select value={filters.status} onChange={(event) => update('status', event.target.value)} className={`${controlClass} appearance-none pr-9`}>
              <option value="">All Statuses</option>
              {['paid', 'partial', 'pending', 'failed', 'reversed', 'overdue'].map((status) => <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </label>
        </div>
        <div className="flex min-w-0 items-center gap-2 xl:w-auto">
          <CalendarDays className="hidden h-4 w-4 text-slate-400 sm:block" />
          <input aria-label="Start date" type="date" value={filters.startDate} onChange={(event) => update('startDate', event.target.value)} className={`${controlClass} min-w-0 px-2`} />
          <span className="text-xs font-bold text-slate-400">to</span>
          <input aria-label="End date" type="date" value={filters.endDate} onChange={(event) => update('endDate', event.target.value)} className={`${controlClass} min-w-0 px-2`} />
        </div>
        {isFiltered && <button type="button" onClick={clear} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-bold text-slate-600 hover:bg-slate-50"><X className="h-4 w-4" />Clear</button>}
        <button type="button" onClick={onRecord} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"><Plus className="h-4 w-4" />Record Payment</button>
      </div>
    </section>
  );
};

export default PaymentFilters;
