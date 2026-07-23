import { Search, Plus, FileText } from 'lucide-react';

export default function InvoiceFilters({
  filters,
  onFilterChange,
  properties,
  onGenerateInvoice,
  onGenerateMonthly
}) {
  const handleSearchChange = (e) => {
    onFilterChange({ ...filters, search: e.target.value });
  };

  const handlePropertyChange = (e) => {
    onFilterChange({ ...filters, property: e.target.value });
  };

  const handleMonthChange = (e) => {
    onFilterChange({ ...filters, billingMonth: e.target.value });
  };

  const handleStartDateChange = (e) => {
    onFilterChange({ ...filters, startDate: e.target.value });
  };

  const handleEndDateChange = (e) => {
    onFilterChange({ ...filters, endDate: e.target.value });
  };

  const handleReset = () => {
    onFilterChange({
      search: '',
      property: '',
      billingMonth: '',
      status: '',
      startDate: '',
      endDate: ''
    });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      {/* Search and Actions Row */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice no., tenant name, or property..."
            value={filters.search}
            onChange={handleSearchChange}
            className="flex-1 bg-transparent text-sm outline-none text-slate-700 placeholder-slate-500"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={onGenerateInvoice}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Generate Invoice
          </button>
          <button
            onClick={onGenerateMonthly}
            className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-100 transition-colors"
          >
            <FileText className="h-4 w-4" />
            Monthly Invoices
          </button>
        </div>
      </div>

      {/* Filters Row */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <div>
          <label className="text-xs font-semibold text-slate-600">Property</label>
          <select
            value={filters.property}
            onChange={handlePropertyChange}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Properties</option>
            {properties.map((property) => (
              <option key={property._id} value={property._id}>
                {property.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600">Billing Month</label>
          <input
            type="month"
            value={filters.billingMonth}
            onChange={handleMonthChange}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600">Start Date</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={handleStartDateChange}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600">End Date</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={handleEndDateChange}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={handleReset}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
