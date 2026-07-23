import React from 'react';
import { AlertTriangle } from 'lucide-react';

const ErrorState = ({ message = 'Something went wrong' }) => (
  <div className="rounded-xl border border-rose-200 bg-white p-8 text-center shadow-sm">
    <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-rose-50 text-rose-600">
      <AlertTriangle className="h-6 w-6" />
    </div>
    <h3 className="mt-4 text-base font-bold text-slate-900">Unable to load this view</h3>
    <p className="mx-auto mt-2 max-w-md text-sm font-medium text-slate-500">{message}</p>
  </div>
);

export default ErrorState;
