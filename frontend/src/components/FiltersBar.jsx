import React from 'react';
import { CalendarDays, Download, Plus, Search } from 'lucide-react';

const FiltersBar = ({ search, setSearch, status, setStatus, plan, setPlan, onExport, onAdd }) => {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 bg-white p-4 xl:flex-row xl:items-end">
      <div className="relative w-full xl:w-64">
        <label className="mb-1 block text-xs font-bold text-slate-500">Search</label>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customers..."
          className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <Search className="absolute bottom-3 left-3 h-4 w-4 text-slate-400" />
      </div>

      <label className="w-full text-xs font-bold text-slate-500 xl:w-44">
        Status
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
          <option value="">All</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
        </select>
      </label>

      <label className="w-full text-xs font-bold text-slate-500 xl:w-44">
        Plan
        <select value={plan} onChange={(e) => setPlan(e.target.value)} className="mt-1 h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
          <option value="">All Plans</option>
          <option value="Trial">Trial</option>
          <option value="Starter">Starter</option>
          <option value="Professional">Professional</option>
          <option value="Enterprise">Enterprise</option>
        </select>
      </label>

      <div className="w-full text-xs font-bold text-slate-500 xl:w-64">
        Joined Date
        <button type="button" className="mt-1 flex h-11 w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-sm font-semibold text-slate-500">
          <CalendarDays className="h-4 w-4" />
          Select date range
        </button>
      </div>

      <div className="flex items-center gap-3 xl:ml-auto">
        <button onClick={onExport} className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50">
          <Download className="h-4 w-4" />
          Export
        </button>
        <button onClick={onAdd} className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white shadow-[0_10px_22px_rgba(37,99,235,0.25)] hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Add Customer
        </button>
      </div>
    </div>
  );
};

export default FiltersBar;
