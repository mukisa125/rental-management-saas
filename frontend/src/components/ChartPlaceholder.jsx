import React from 'react';

const ChartPlaceholder = ({ height = 120 }) => (
  <div className="w-full bg-gradient-to-r from-slate-50 to-white rounded-lg p-4 border border-slate-100" style={{height}}>
    <div className="h-full flex items-center justify-center text-slate-300">Chart</div>
  </div>
);

export default ChartPlaceholder;
