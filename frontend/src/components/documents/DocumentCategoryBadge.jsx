import { getDocumentCategory } from './documentUtils';

const categoryClasses = {
  'Property Documents': 'bg-blue-50 text-blue-700 border-blue-200',
  'Tenant Documents': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Payment Receipts': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Maintenance Documents': 'bg-amber-50 text-amber-700 border-amber-200',
  'Lease Agreements': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Unit Documents': 'bg-sky-50 text-sky-700 border-sky-200',
  'Monthly Assessments': 'bg-orange-50 text-orange-700 border-orange-200',
  'Legal / Ownership': 'bg-rose-50 text-rose-700 border-rose-200'
};

export default function DocumentCategoryBadge({ category }) {
  const value = getDocumentCategory({ category });
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${categoryClasses[value] || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
      {value}
    </span>
  );
}
