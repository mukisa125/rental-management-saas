import React from 'react';

const LoadingState = ({ message = 'Loading...' }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-300 mx-auto mb-4"></div>
    <p className="text-sm text-slate-500">{message}</p>
  </div>
);

export default LoadingState;
