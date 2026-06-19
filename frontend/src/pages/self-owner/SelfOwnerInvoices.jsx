import { useEffect, useState } from 'react';
import api from '../../services/api';

export default function SelfOwnerInvoices() {
  const [payments, setPayments] = useState([]);
  useEffect(() => { api.get('/self-owner/payments').then(({ data }) => setPayments(data.payments || [])).catch(() => setPayments([])); }, []);
  return <div className="min-h-full bg-[#f8fbff] p-6 lg:p-8"><p className="text-sm font-semibold text-blue-600">Dashboard / Rent & Invoices</p><h2 className="mt-1 text-2xl font-black text-slate-950">Rent & Invoices</h2><div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Invoice</th><th className="p-4">Tenant</th><th className="p-4">Amount</th><th className="p-4">Status</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment._id} className="border-t"><td className="p-4 font-bold">{payment.receiptNumber || 'Draft'}</td><td className="p-4">{payment.tenant?.fullName}</td><td className="p-4">{payment.amount?.toLocaleString()} UGX</td><td className="p-4 capitalize">{payment.status}</td></tr>)}</tbody></table></div></div>;
}
