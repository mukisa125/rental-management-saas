import React from 'react';

const SubscriptionSummaryCard = ({ label, value = 0, color = 'slate' }) => {
  const colorMap = {
    slate: 'bg-white border-slate-200 text-slate-900',
    green: 'bg-white border-slate-200 text-emerald-600',
    red: 'bg-white border-slate-200 text-rose-600',
    blue: 'bg-white border-slate-200 text-blue-600'
  };

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${colorMap[color]}`}>
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black">{value ?? (color === 'green' ? 0 : 'N/A')}</p>
    </div>
  );
};

export default SubscriptionSummaryCard;
