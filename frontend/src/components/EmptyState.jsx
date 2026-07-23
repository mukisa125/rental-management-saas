import React from 'react';
import { FileText } from 'lucide-react';

const EmptyState = ({ title = 'No results', description = 'There is no data to display.' }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
    <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-slate-50 text-slate-400">
      <FileText className="h-6 w-6" />
    </div>
    <h3 className="mt-4 text-base font-bold text-slate-900">{title}</h3>
    <p className="mx-auto mt-2 max-w-md text-sm font-medium text-slate-500">{description}</p>
  </div>
);

export default EmptyState;
