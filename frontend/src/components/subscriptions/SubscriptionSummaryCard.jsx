import React from 'react';

const SubscriptionSummaryCard = ({ label, value = 0, color = 'slate' }) => {
  const colorMap = {
    slate: 'bg-white border-slate-200 text-slate-900',
    green: 'bg-white border-slate-200 text-green-600',
    red: 'bg-white border-slate-200 text-rose-600',
    blue: 'bg-white border-slate-200 text-blue-600'
  };

  return (
    <div className={`p-4 rounded-2xl shadow-sm border ${colorMap[color]}`}>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-2xl font-semibold mt-2">{value ?? (color === 'green' ? 0 : 'N/A')}</p>
    </div>
  );
};

export default SubscriptionSummaryCard;
