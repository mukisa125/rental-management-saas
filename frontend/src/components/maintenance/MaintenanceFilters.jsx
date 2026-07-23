import { Search, Filter, BriefcaseBusiness } from 'lucide-react';

export default function MaintenanceFilters({
  filters,
  onFilterChange,
  properties,
  units,
  onAddRequest,
  onManageProviders
}) {
  const handleSearchChange = (e) => {
    onFilterChange({ ...filters, search: e.target.value });
  };

  const handlePropertyChange = (e) => {
    onFilterChange({ ...filters, property: e.target.value, unit: '' });
  };

  const handleUnitChange = (e) => {
    onFilterChange({ ...filters, unit: e.target.value });
  };

  const handleStatusChange = (e) => {
    onFilterChange({ ...filters, status: e.target.value });
  };

  const handlePriorityChange = (e) => {
    onFilterChange({ ...filters, priority: e.target.value });
  };

  const handleSourceChange = (e) => {
    onFilterChange({ ...filters, source: e.target.value });
  };

  const handleReset = () => {
    onFilterChange({
      search: '',
      property: '',
      unit: '',
      status: '',
      priority: '',
      source: ''
    });
  };

  const filteredUnits = filters.property
    ? units.filter((u) => String(u.property?._id || u.property) === filters.property)
    : [];

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
      {/* Search and Action Row */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by tenant, property, unit, or issue..."
            value={filters.search}
            onChange={handleSearchChange}
            className="flex-1 bg-transparent text-sm outline-none text-slate-700 placeholder-slate-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onManageProviders}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100"
          >
            <BriefcaseBusiness className="h-4 w-4" />
            Service Providers
          </button>

          <button
            onClick={onAddRequest}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
          >
            <Filter className="h-4 w-4" />
            Add Request
          </button>
        </div>
      </div>

      {/* Filters Grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
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
          <label className="text-xs font-semibold text-slate-600">Unit</label>
          <select
            value={filters.unit}
            onChange={handleUnitChange}
            disabled={!filters.property}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          >
            <option value="">All Units</option>
            {filteredUnits.map((unit) => (
              <option key={unit._id} value={unit._id}>
                {unit.unitNumber}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600">Status</label>
          <select
            value={filters.status}
            onChange={handleStatusChange}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600">Priority</label>
          <select
            value={filters.priority}
            onChange={handlePriorityChange}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600">Source</label>
          <select
            value={filters.source}
            onChange={handleSourceChange}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Sources</option>
            <option value="tenant_portal">Tenant Portal</option>
            <option value="self_owner">Self Owner</option>
          </select>
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
