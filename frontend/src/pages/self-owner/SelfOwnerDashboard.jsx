import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ArrowRight, Banknote, Building2, CheckCircle2, CircleDollarSign, ClipboardList, DoorOpen, FilePlus2, Home, ReceiptText, Users, Wrench } from 'lucide-react';
import api from '../../services/api';
import { formatUGX } from '../../utils/currency';

const iconStyles = ['bg-blue-50 text-blue-600', 'bg-violet-50 text-violet-600', 'bg-emerald-50 text-emerald-600', 'bg-cyan-50 text-cyan-600', 'bg-indigo-50 text-indigo-600', 'bg-green-50 text-green-600', 'bg-rose-50 text-rose-600', 'bg-amber-50 text-amber-600'];
const occupancyColors = ['#2563eb', '#f59e0b', '#e2e8f0'];

const safe = (value) => Number(value) || 0;
const dayLabel = (value) => value ? new Date(value).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' }) : 'No date';

function StatCard({ icon: Icon, label, value, note, index }) {
  return <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"><div className="flex items-start gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconStyles[index]}`}><Icon className="h-5 w-5" /></span><div className="min-w-0"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-1 truncate text-xl font-black tracking-normal text-slate-900">{value}</p><p className="mt-1 text-xs font-medium text-slate-500">{note}</p></div></div></article>;
}

function Panel({ title, children, link, className = '' }) {
  return <section className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 className="text-sm font-black text-slate-900">{title}</h2>{link}</div>{children}</section>;
}

export default function SelfOwnerDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get('/self-owner/dashboard').then((response) => { if (active) setData(response.data || {}); }).catch((requestError) => { if (active) setError(requestError.response?.data?.message || 'Unable to load your dashboard.'); });
    return () => { active = false; };
  }, []);

  const kpis = data?.kpis || {};
  const activity = data?.recentActivity || {};
  const recentPayments = Array.isArray(activity.recentPayments) ? activity.recentPayments : [];
  const upcoming = Array.isArray(activity.upcomingPayments) ? activity.upcomingPayments : [];
  const maintenance = Array.isArray(activity.recentMaintenance) ? activity.recentMaintenance : [];
  const chartData = useMemo(() => (Array.isArray(data?.charts?.rentCollection) ? data.charts.rentCollection : []).slice(0, 8).reverse().map((item) => ({ name: new Date(item.date).toLocaleDateString('en-UG', { month: 'short' }), amount: safe(item.amount) })), [data]);
  const occupancy = useMemo(() => [{ name: 'Occupied', value: safe(kpis.occupiedUnits) }, { name: 'Vacant', value: safe(kpis.vacantUnits) }, { name: 'Maintenance', value: Math.max(0, safe(kpis.totalUnits) - safe(kpis.occupiedUnits) - safe(kpis.vacantUnits)) }], [kpis]);
  const statCards = [
    [Building2, 'Total Properties', safe(kpis.totalProperties), 'Properties in your portfolio'],
    [Home, 'Total Units', safe(kpis.totalUnits), 'Available rental spaces'],
    [Users, 'Occupied Units', safe(kpis.occupiedUnits), `${safe(kpis.occupancyRate)}% occupancy rate`],
    [DoorOpen, 'Vacant Units', safe(kpis.vacantUnits), 'Ready to be rented'],
    [CircleDollarSign, 'Monthly Rent', formatUGX(kpis.monthlyRent), 'Expected rent this month'],
    [Banknote, 'Collected This Month', formatUGX(kpis.collectedThisMonth), 'Confirmed payments'],
    [ReceiptText, 'Outstanding Balance', formatUGX(kpis.pendingRent || kpis.outstandingBalance), 'Pending and overdue rent'],
    [Wrench, 'Maintenance Requests', safe(kpis.openMaintenanceRequests), 'Open service requests']
  ];

  if (!data && !error) return <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white" />)}</div>;
  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-700">{error}</div>;

  return <div className="mx-auto max-w-[1480px] space-y-4">
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">{statCards.map(([icon, label, value, note], index) => <StatCard key={label} icon={icon} label={label} value={value} note={note} index={index} />)}</div>

    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <Panel title="Occupancy Status" className="xl:col-span-4" link={<Link to="/self-owner/units" className="text-xs font-bold text-blue-600">View units <ArrowRight className="inline h-3.5 w-3.5" /></Link>}><div className="flex min-h-64 items-center gap-3 p-5"><div className="h-44 w-44 shrink-0"><PieChart width={176} height={176}><Pie data={occupancy} dataKey="value" innerRadius={46} outerRadius={68} paddingAngle={3}>{occupancy.map((entry, index) => <Cell key={entry.name} fill={occupancyColors[index]} />)}</Pie><Tooltip formatter={(value) => [value, 'Units']} /></PieChart></div><div className="min-w-0 space-y-3"><div><p className="text-2xl font-black text-slate-900">{safe(kpis.occupancyRate)}%</p><p className="text-xs font-semibold text-slate-500">Occupancy rate</p></div>{occupancy.map((item, index) => <div key={item.name} className="flex items-center justify-between gap-4 text-xs"><span className="flex items-center gap-2 font-semibold text-slate-600"><i className="h-2.5 w-2.5 rounded-full" style={{ background: occupancyColors[index] }} />{item.name}</span><strong className="text-slate-900">{item.value}</strong></div>)}</div></div></Panel>
      <Panel title="Rent Collection Overview" className="xl:col-span-5 min-w-0" link={<Link to="/self-owner/reports" className="text-xs font-bold text-blue-600">View report <ArrowRight className="inline h-3.5 w-3.5" /></Link>}><div className="p-5"><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-semibold text-slate-500">Collected this month</p><p className="mt-1 text-2xl font-black text-slate-900">{formatUGX(kpis.collectedThisMonth)}</p></div><span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">{safe(kpis.monthlyRent) ? Math.round((safe(kpis.collectedThisMonth) / safe(kpis.monthlyRent)) * 100) : 0}% collected</span></div><div className="h-40 min-w-0">{chartData.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><defs><linearGradient id="ownerRevenue" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity={0.25} /><stop offset="100%" stopColor="#2563eb" stopOpacity={0} /></linearGradient></defs><Tooltip formatter={(value) => formatUGX(value)} /><Area type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={2.5} fill="url(#ownerRevenue)" /></AreaChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm font-medium text-slate-400">No collection data yet</div>}</div></div></Panel>
      <Panel title="Quick Actions" className="xl:col-span-3"><div className="grid gap-2 p-4">{[[Building2, 'Add Property', '/self-owner/properties'], [Users, 'Add Tenant', '/self-owner/tenants'], [Banknote, 'Record Payment', '/self-owner/payments'], [FilePlus2, 'Create Invoice', '/self-owner/invoices']].map(([Icon, label, to]) => <Link key={label} to={to} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-bold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"><span className="flex items-center gap-2"><Icon className="h-4 w-4 text-blue-600" />{label}</span><ArrowRight className="h-4 w-4" /></Link>)}</div></Panel>
    </div>

    <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
      <Panel title="Recent Payments" className="xl:col-span-6" link={<Link to="/self-owner/payments" className="text-xs font-bold text-blue-600">View all <ArrowRight className="inline h-3.5 w-3.5" /></Link>}><div className="responsive-table"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="px-5 py-3 font-bold">Tenant</th><th className="px-5 py-3 font-bold">Property / Unit</th><th className="px-5 py-3 font-bold">Amount</th><th className="px-5 py-3 font-bold">Date</th><th className="px-5 py-3 font-bold">Status</th></tr></thead><tbody>{recentPayments.length ? recentPayments.map((payment) => <tr key={payment._id} className="border-t border-slate-100"><td className="px-5 py-3 font-bold text-slate-700">{payment.tenant?.fullName || 'Tenant'}</td><td className="px-5 py-3 text-slate-500">{payment.property?.name || 'Property'} {payment.unit?.unitNumber ? `- ${payment.unit.unitNumber}` : ''}</td><td className="px-5 py-3 font-bold text-slate-700">{formatUGX(payment.amountPaid || payment.amount)}</td><td className="px-5 py-3 text-slate-500">{dayLabel(payment.paidDate)}</td><td className="px-5 py-3"><span className="rounded-md bg-emerald-50 px-2 py-1 font-bold text-emerald-700">Paid</span></td></tr>) : <tr><td colSpan="5" className="px-5 py-10 text-center font-medium text-slate-400">No payments recorded yet.</td></tr>}</tbody></table></div></Panel>
      <Panel title="Overdue Rent Alerts" className="xl:col-span-3" link={<Link to="/self-owner/invoices" className="text-xs font-bold text-blue-600">View all <ArrowRight className="inline h-3.5 w-3.5" /></Link>}><div className="divide-y divide-slate-100">{upcoming.length ? upcoming.slice(0, 4).map((payment) => <div key={payment._id} className="p-4"><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-bold text-slate-700">{payment.tenant?.fullName || 'Tenant'}</p><span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">Due {dayLabel(payment.dueDate)}</span></div><p className="mt-1 text-xs text-slate-500">{payment.unit?.unitNumber || 'Unit'} · <strong className="text-rose-600">{formatUGX(Math.max(0, safe(payment.amount) - safe(payment.amountPaid)))}</strong></p></div>) : <div className="p-8 text-center text-sm font-medium text-slate-400">No rent alerts.</div>}</div></Panel>
      <Panel title="Maintenance Summary" className="xl:col-span-3" link={<Link to="/self-owner/maintenance" className="text-xs font-bold text-blue-600">Manage <ArrowRight className="inline h-3.5 w-3.5" /></Link>}><div className="space-y-3 p-4"><div className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-2.5"><span className="text-xs font-bold text-amber-700">Open requests</span><strong className="text-lg text-amber-700">{safe(kpis.openMaintenanceRequests)}</strong></div><div className="flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2.5"><span className="text-xs font-bold text-emerald-700">Recently completed</span><strong className="text-lg text-emerald-700">{maintenance.filter((item) => item.status === 'completed').length}</strong></div><div className="flex items-center gap-2 pt-1 text-xs font-semibold text-slate-500"><CheckCircle2 className="h-4 w-4 text-blue-600" />{maintenance.length ? `${maintenance.length} recent maintenance items` : 'No maintenance requests yet'}</div></div></Panel>
    </div>
  </div>;
}
