import React from 'react';
import { formatUGX } from '../utils/currency';

const TransactionTable = ({ transactions = [] }) => {
  return (
    <div className="responsive-table bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">Latest Transactions</h3>
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
                <span className={`px-2 py-1 rounded-full text-xs ${t.status === 'paid' ? 'bg-green-50 text-green-600' : t.status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}>
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
