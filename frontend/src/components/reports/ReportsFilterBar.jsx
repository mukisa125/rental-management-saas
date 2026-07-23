import { CalendarDays, Filter, RefreshCw } from 'lucide-react';

export default function ReportsFilterBar({
  filters,
  properties,
  tenants,
  statuses,
  activeTab,
  onChange,
  onGenerate,
  generating,
  exportActions
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        <label className="lg:col-span-2">
          <span className="text-xs font-semibold text-slate-600">Start Date</span>
          <span className="mt-1 flex items-center rounded-xl border border-slate-200 px-3 py-2">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={filters.startDate}
              onChange={(event) => onChange('startDate', event.target.value)}
              className="ml-2 w-full border-0 bg-transparent p-0 text-sm text-slate-700 outline-none"
            />
          </span>
        </label>

        <label className="lg:col-span-2">
          <span className="text-xs font-semibold text-slate-600">End Date</span>
          <span className="mt-1 flex items-center rounded-xl border border-slate-200 px-3 py-2">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={filters.endDate}
              onChange={(event) => onChange('endDate', event.target.value)}
              className="ml-2 w-full border-0 bg-transparent p-0 text-sm text-slate-700 outline-none"
            />
          </span>
        </label>

        <label className="lg:col-span-2">
          <span className="text-xs font-semibold text-slate-600">Property</span>
          <select
            value={filters.propertyId}
            onChange={(event) => onChange('propertyId', event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="">All Properties</option>
            {properties.map((property) => (
              <option key={property._id} value={property._id}>{property.name || 'Unnamed property'}</option>
            ))}
          </select>
        </label>

        <label className="lg:col-span-2">
          <span className="text-xs font-semibold text-slate-600">Tenant</span>
          <select
            value={filters.tenantId}
            onChange={(event) => onChange('tenantId', event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="">All Tenants</option>
            {tenants.map((tenant) => (
              <option key={tenant._id} value={tenant._id}>{tenant.fullName || 'Unnamed tenant'}</option>
            ))}
          </select>
        </label>

        <label className="lg:col-span-2">
          <span className="text-xs font-semibold text-slate-600">Status</span>
          <select
            value={filters.status}
            onChange={(event) => onChange('status', event.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </label>

        <div className="lg:col-span-2 flex items-end">
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
            {generating ? 'Generating...' : 'Generate Report'}
          </button>
        </div>

        {activeTab === 'lease_expiry' && (
          <label className="lg:col-span-3">
            <span className="text-xs font-semibold text-slate-600">Lease Window</span>
            <select
              value={filters.leaseWindow}
              onChange={(event) => onChange('leaseWindow', event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="7">Expiring in 7 days</option>
              <option value="30">Expiring in 30 days</option>
              <option value="60">Expiring in 60 days</option>
              <option value="expired">Expired leases</option>
            </select>
          </label>
        )}
      </div>

      <div className="mt-3 border-t border-slate-100 pt-3">
        {exportActions}
      </div>
    </section>
  );
}
