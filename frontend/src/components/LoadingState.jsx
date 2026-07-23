import React from 'react';

const LoadingState = ({ message = 'Loading...' }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
    <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
    <p className="text-sm font-semibold text-slate-500">{message}</p>
  </div>
);

export default LoadingState;
