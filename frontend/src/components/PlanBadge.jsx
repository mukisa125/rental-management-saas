import React from 'react';

const PlanBadge = ({ plan }) => {
  const map = {
    free: 'bg-slate-50 text-slate-700',
    starter: 'bg-blue-50 text-blue-700',
    pro: 'bg-emerald-50 text-emerald-700',
  };
  const cls = map[plan] || 'bg-slate-50 text-slate-700';
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${cls}`}>{plan || 'N/A'}</span>;
};

export default PlanBadge;
