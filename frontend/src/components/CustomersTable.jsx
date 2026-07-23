import React from 'react';
import StatusBadge from './StatusBadge';
import PlanBadge from './PlanBadge';
import { MoreHorizontal } from 'lucide-react';

const Avatar = ({ name }) => (
  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-sm font-black text-blue-700 ring-1 ring-blue-100">
    {name ? name.charAt(0).toUpperCase() : '?'}
  </div>
);

const CustomersTable = ({ customers = [], onSuspend, onActivate, onOpenActions }) => {
  if (!Array.isArray(customers) || customers.length === 0) {
    return <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-500">No customers found</div>;
  }

  return (
    <div className="px-4 pb-4">
      <div className="responsive-table overflow-hidden rounded-lg border border-slate-200">
        <table className="min-w-[980px] text-sm">
          <thead>
            <tr className="sticky top-0 border-b border-slate-200 bg-slate-50 text-left text-xs font-black text-slate-600">
              <th className="px-4 py-3">Customer Name</th>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Subscription Plan</th>
              <th className="px-4 py-3 text-center">Properties</th>
              <th className="px-4 py-3 text-center">Units</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined Date</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c._id} className="border-b border-slate-100 bg-white last:border-b-0 hover:bg-blue-50/40">
                <td className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={c.contactName || c.adminName || c.companyName} />
                  <div>
                    <div className="font-bold text-slate-900">{c.contactName || c.companyName}</div>
                    <div className="text-xs font-semibold capitalize text-slate-500">{c.role?.replace('_', ' ') || 'Owner'}</div>
                  </div>
                </td>
                <td className="px-4 py-3 font-semibold text-slate-700">{c.companyName || 'Not assigned'}</td>
                <td className="px-4 py-3 font-medium text-slate-600">{c.email}</td>
                <td className="px-4 py-3"><PlanBadge plan={c.subscriptionPlan?.slug || c.subscriptionPlan?.name} /></td>
                <td className="px-4 py-3 text-center font-semibold text-slate-700">{c.propertiesCount ?? 0}</td>
                <td className="px-4 py-3 text-center font-semibold text-slate-700">{c.unitsCount ?? 0}</td>
                <td className="px-4 py-3"><StatusBadge status={c.subscriptionStatus} /></td>
                <td className="px-4 py-3 font-medium text-slate-500">{new Date(c.createdAt || c.joinedAt || Date.now()).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    {c.subscriptionStatus === 'active' && (
                      <button onClick={() => onSuspend?.(c._id)} className="text-sm text-rose-600 px-3 py-1 rounded-md border border-rose-50 hover:bg-rose-50">Suspend</button>
                    )}
                    {c.subscriptionStatus === 'suspended' && (
                      <button onClick={() => onActivate?.(c._id)} className="rounded-md border border-emerald-100 px-3 py-1 text-sm text-emerald-600 hover:bg-emerald-50">Activate</button>
                    )}
                    <button onClick={() => onOpenActions?.(c)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label={`Open actions for ${c.contactName || c.companyName}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomersTable;
