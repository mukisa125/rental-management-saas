import React from 'react';
import { formatUGX } from '../utils/currency';

const TransactionTable = ({ transactions = [] }) => {
  return (
    <div className="responsive-table rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-black text-slate-900">Latest Transactions</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-slate-500 border-b border-slate-100">
            <th className="py-3">Invoice ID</th>
            <th className="py-3">Customer</th>
            <th className="py-3">Amount</th>
            <th className="py-3">Status</th>
            <th className="py-3">Date</th>
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 && (
            <tr><td colSpan={5} className="py-6 text-center text-slate-500">No transactions</td></tr>
          )}
          {transactions.map((t) => (
            <tr key={t.id} className="border-b last:border-b-0 border-slate-100">
              <td className="py-3 font-medium text-slate-800">{t.id}</td>
              <td className="py-3 text-slate-600">{t.customer}</td>
              <td className="py-3 text-slate-800">{formatUGX(t.amount)}</td>
              <td className="py-3">
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${t.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : t.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                  {t.status}
                </span>
              </td>
              <td className="py-3 text-slate-500">{t.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TransactionTable;
