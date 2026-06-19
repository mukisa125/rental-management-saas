import React from 'react';

const EmptyState = ({ title = 'No results', description = 'There is no data to display.' }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
    <div className="text-slate-400 text-4xl mb-4">—</div>
    <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
    <p className="text-sm text-slate-500">{description}</p>
  </div>
);

export default EmptyState;
