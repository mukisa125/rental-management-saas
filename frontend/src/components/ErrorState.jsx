import React from 'react';

const ErrorState = ({ message = 'Something went wrong' }) => (
  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
    <div className="text-2xl text-rose-500 mb-3">!</div>
    <h3 className="text-lg font-semibold text-slate-900 mb-2">Error</h3>
    <p className="text-sm text-slate-500">{message}</p>
  </div>
);

export default ErrorState;
