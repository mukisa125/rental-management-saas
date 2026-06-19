import React from 'react';

const StatusBadge = ({ status }) => {
  const map = {
    paid: 'bg-green-50 text-green-600',
    pending: 'bg-amber-50 text-amber-600',
    failed: 'bg-rose-50 text-rose-600',
    active: 'bg-green-50 text-green-600',
    approved: 'bg-green-50 text-green-600',
    expired: 'bg-rose-50 text-rose-600',
    rejected: 'bg-rose-50 text-rose-600',
  };
  const cls = map[status] || 'bg-slate-50 text-slate-600';
  return <span className={`px-2 py-1 rounded-full text-xs font-medium ${cls}`}>{status}</span>;
};

export default StatusBadge;
