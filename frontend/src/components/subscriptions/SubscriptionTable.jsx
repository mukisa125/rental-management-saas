import React from 'react';
import StatusBadge from '../StatusBadge';
import { formatUGX } from '../../utils/currency';

const SubscriptionTable = ({ rows = [], onSuspend = () => {}, onActivate = () => {} }) => {
  if (!Array.isArray(rows) || rows.length === 0) return <div className="bg-white p-6 rounded-2xl border border-slate-200">No subscriptions found</div>;

  return (
    <div className="responsive-table bg-white rounded-2xl border border-slate-200 shadow-sm">
      <table className="min-w-[1100px] text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-100 sticky top-0 bg-white">
            <th className="px-6 py-3">Account Name</th>
            <th className="px-6 py-3">Account Type</th>
            <th className="px-6 py-3">Email</th>
            <th className="px-6 py-3">Current Plan</th>
            <th className="px-6 py-3">Billing Cycle</th>
            <th className="px-6 py-3">Amount</th>
            <th className="px-6 py-3">Status</th>
            <th className="px-6 py-3">Start Date</th>
            <th className="px-6 py-3">Expiry Date</th>
            <th className="px-6 py-3">Payment Status</th>
            <th className="px-6 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-b last:border-b-0 border-slate-100 hover:bg-slate-50">
              <td className="px-6 py-4">{r.accountName}</td>
              <td className="px-6 py-4">{r.accountType}</td>
              <td className="px-6 py-4">{r.email}</td>
              <td className="px-6 py-4">{r.currentPlan}</td>
              <td className="px-6 py-4">{r.billingCycle}</td>
              <td className="px-6 py-4">{formatUGX(r.amount ?? 0)}</td>
              <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
              <td className="px-6 py-4 text-slate-500">{r.startDate ? new Date(r.startDate).toLocaleDateString() : 'N/A'}</td>
              <td className="px-6 py-4 text-slate-500">{r.expiryDate ? new Date(r.expiryDate).toLocaleDateString() : 'N/A'}</td>
              <td className="px-6 py-4">{r.paymentStatus}</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1 rounded-md bg-blue-600 text-white text-sm">View</button>
                  <button className="px-3 py-1 rounded-md border">Upgrade</button>
                  {r.companyId ? (
                    r.status === 'active' ? (
                      <button onClick={() => onSuspend(r.companyId)} className="px-3 py-1 rounded-md border">Suspend</button>
                    ) : (
                      <button onClick={() => onActivate(r.companyId)} className="px-3 py-1 rounded-md border">Activate</button>
                    )
                  ) : (
                    <button className="px-3 py-1 rounded-md border" disabled>---</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SubscriptionTable;
