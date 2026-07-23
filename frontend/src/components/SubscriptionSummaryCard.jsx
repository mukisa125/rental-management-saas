import React from 'react';
import { formatUGX } from '../utils/currency';

const SubscriptionSummaryCard = ({ plans = [] }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-black text-slate-900">Subscription Plans</h3>
      <div className="space-y-3">
        {plans.map((p) => (
          <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-b-0">
            <div>
              <div className="text-sm font-medium text-slate-800">{p.name}</div>
              <div className="text-xs text-slate-500">{p.description}</div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-900">{formatUGX(p.price)}/mo</div>
              <div className="text-xs text-slate-400">{p.subscribers} subscribers</div>
            </div>
          </div>
        ))}
        {plans.length === 0 && <div className="text-sm text-slate-500">No plans</div>}
      </div>
    </div>
  );
};

export default SubscriptionSummaryCard;
