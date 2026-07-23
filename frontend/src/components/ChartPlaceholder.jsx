import React from 'react';

const ChartPlaceholder = ({ height = 120 }) => (
  <div className="w-full rounded-lg border border-slate-100 bg-slate-50 p-4" style={{height}}>
    <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-300">Chart</div>
  </div>
);

export default ChartPlaceholder;
