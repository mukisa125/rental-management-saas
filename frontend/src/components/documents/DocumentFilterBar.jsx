import { Search, RotateCcw, Upload, FileDown, FileSpreadsheet, Printer } from 'lucide-react';
import { categoryOptions, sourceOptions, statusOptions } from './documentUtils';

export default function DocumentFilterBar({
  filters,
  onChange,
  onReset,
  properties,
  tenants,
  onOpenUpload,
  onExportPdf,
  onExportExcel,
  onPrint
}) {
  const update = (key, value) => onChange({ ...filters, [key]: value });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-700">Filter Library</h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={onOpenUpload} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">
            <Upload className="h-4 w-4" />
            Upload Document
          </button>
          <button onClick={onExportPdf} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            <FileDown className="h-4 w-4" />
            Export PDF
          </button>
          <button onClick={onExportExcel} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </button>
          <button onClick={onPrint} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="md:col-span-2 xl:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-slate-600">Search</span>
          <span className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={filters.search}
              onChange={(event) => update('search', event.target.value)}
              placeholder="Document name, tenant, property, source"
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </span>
        </label>

        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-600">Category</span>
          <select value={filters.category} onChange={(event) => update('category', event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <option value="">All Categories</option>
            {categoryOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>

        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-600">Property</span>
          <select value={filters.property} onChange={(event) => update('property', event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <option value="">All Properties</option>
            {(properties || []).map((item) => <option key={item._id} value={item._id}>{item.name}</option>)}
          </select>
        </label>

        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-600">Tenant</span>
          <select value={filters.tenant} onChange={(event) => update('tenant', event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <option value="">All Tenants</option>
            {(tenants || []).map((item) => <option key={item._id} value={item._id}>{item.fullName}</option>)}
          </select>
        </label>

        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-600">Status</span>
          <select value={filters.status} onChange={(event) => update('status', event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <option value="">All Statuses</option>
            {statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>

        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-600">Source</span>
          <select value={filters.sourceModule} onChange={(event) => update('sourceModule', event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <option value="">All Sources</option>
            {sourceOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>

        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-600">Start Date</span>
          <input type="date" value={filters.startDate} onChange={(event) => update('startDate', event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700" />
        </label>

        <label>
          <span className="mb-1 block text-xs font-semibold text-slate-600">End Date</span>
          <input type="date" value={filters.endDate} onChange={(event) => update('endDate', event.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700" />
        </label>
      </div>

      <div className="mt-3">
        <button onClick={onReset} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Filters
        </button>
      </div>
    </div>
  );
}
