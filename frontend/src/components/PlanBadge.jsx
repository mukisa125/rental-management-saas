import React from 'react';

const PlanBadge = ({ plan }) => {
  const map = {
    free: 'bg-slate-50 text-slate-700',
    starter: 'bg-blue-50 text-blue-700',
    pro: 'bg-indigo-50 text-indigo-700',
  };
  const cls = map[plan] || 'bg-slate-50 text-slate-700';
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${cls}`}>{plan || 'N/A'}</span>;
};

export default PlanBadge;
